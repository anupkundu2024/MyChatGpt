import * as chatService from '../services/chat.service.js';
import { isAbortError, streamChat, toApiError } from '../services/llm.js';
import { ApiError } from '../utils/ApiError.js';
import { openSse } from '../utils/sse.js';

/**
 * Chat turns, all answered as text/event-stream:
 *   POST /api/chat/:conversationId                    { content }  send a new message
 *   POST /api/chat/:conversationId/edit/:messageId    { content }  replace a user message and all after it
 *   POST /api/chat/:conversationId/regenerate                      answer the last user message again
 *
 * Events:
 *   user_message  { message }               the user message this turn answers
 *   status        { state: "thinking" }     model is reasoning before it answers
 *   delta         { text }                  a chunk of the assistant's answer
 *   done          { message, stopReason, replacedMessageIds }
 *                                           saved reply; replacedMessageIds were deleted
 *                                           (edit/regenerate). stopReason "max_tokens" = truncated
 *   title         { title }                 auto-generated title (first exchange only)
 *   refusal       { message, removedMessageId? }  declined; discard streamed deltas. The turn is
 *   error         { message, removedMessageId? }  rolled back: a user message it created is
 *                                                 deleted, and nothing it would replace is touched.
 *
 * If the client disconnects mid-stream, the upstream request is aborted and the partial
 * answer is saved, since that is what the user saw. A regenerate stopped before any text
 * keeps the previous answer.
 *
 * Errors before the stream opens (validation, 404, auth) are normal JSON responses.
 */
async function runTurn(req, res, action) {
  const turn = await chatService.prepareTurn(req.user, req.validated.params.conversationId, action);

  const sse = openSse(res);
  const upstream = new AbortController();
  // Client went away before we finished: stop paying for tokens nobody will read.
  res.on('close', () => {
    if (!res.writableFinished) upstream.abort();
  });

  sse.send('user_message', { message: turn.userMessage });

  let streamed = '';
  try {
    const result = await streamChat({
      ...turn.request,
      signal: upstream.signal,
      onThinking: () => sse.send('status', { state: 'thinking' }),
      onText: (text) => {
        streamed += text;
        sse.send('delta', { text });
      },
    });

    if (result.stopReason === 'refusal') {
      await chatService.rollbackTurn(turn);
      sse.send('refusal', {
        message: 'The model declined to answer this request.',
        removedMessageId: turn.createdUserMessage ? turn.userMessage._id : undefined,
      });
      return;
    }

    const assistantMessage = await chatService.commitTurn(turn, result);
    sse.send('done', {
      message: assistantMessage,
      stopReason: result.stopReason,
      replacedMessageIds: turn.replaces,
    });

    if (turn.isFirstExchange) {
      try {
        const title = await chatService.autoTitle(turn.conversation, turn.userMessage.content, result.text);
        if (title) sse.send('title', { title });
      } catch (err) {
        console.error('[chat] Title generation failed:', err.message);
      }
    }
  } catch (err) {
    if (upstream.signal.aborted || isAbortError(err)) {
      // Keep what the user already saw so the history matches their screen.
      if (streamed.trim() || turn.createdUserMessage) {
        await chatService.commitTurn(turn, { text: streamed.trim() ? streamed : '' });
      }
      return;
    }

    const apiErr = toApiError(err);
    if (!(apiErr instanceof ApiError)) console.error('[chat] Stream failed:', err);
    await chatService.rollbackTurn(turn);
    sse.send('error', {
      message: apiErr instanceof ApiError ? apiErr.message : 'Something went wrong, please try again',
      removedMessageId: turn.createdUserMessage ? turn.userMessage._id : undefined,
    });
  } finally {
    sse.close();
  }
}

export const sendMessage = (req, res) =>
  runTurn(req, res, { type: 'send', content: req.validated.body.content });

export const editMessage = (req, res) =>
  runTurn(req, res, {
    type: 'edit',
    messageId: req.validated.params.messageId,
    content: req.validated.body.content,
  });

export const regenerate = (req, res) => runTurn(req, res, { type: 'regenerate' });
