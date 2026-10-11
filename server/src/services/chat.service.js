import { Conversation, Message } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { DEFAULT_SYSTEM_PROMPT, estimateTokens, generateTitle } from './llm.js';
import { getOwnedConversation } from './conversation.service.js';

export const DEFAULT_TITLE = 'New chat';

// Upper bound on the history sent per request. Keeps cost and latency predictable
// (and keeps Haiku 5.5 prompts under 100K tokens, where its price steps up).
const CONTEXT_TOKEN_BUDGET = 100_000;

// Newest-first walk: keep as many recent messages as fit in the budget, always
// including the new user message, and make sure the result starts with a user turn.
function buildContext(history, userMessage, system) {
  let used = estimateTokens(system) + estimateTokens(userMessage.content);
  const kept = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const cost = estimateTokens(history[i].content);
    if (used + cost > CONTEXT_TOKEN_BUDGET) break;
    used += cost;
    kept.unshift(history[i]);
  }
  while (kept.length && kept[0].role !== 'user') kept.shift();

  return [...kept, userMessage].map(({ role, content }) => ({ role, content }));
}

// The user's custom instructions ride along in the system prompt of every chat.
function buildSystemPrompt(conversation, user) {
  const base = conversation.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const custom = user.customInstructions?.trim();
  if (!custom) return base;
  return (
    `${base}\n\nThe user has set these custom instructions. Follow them unless they conflict ` +
    `with a specific request:\n<custom_instructions>\n${custom}\n</custom_instructions>`
  );
}

const loadHistory = (conversationId) =>
  Message.find({ conversationId }).sort({ createdAt: 1, _id: 1 }).lean();

const createUserMessage = (conversationId, content) =>
  Message.create({ conversationId, role: 'user', content, tokens: estimateTokens(content) });

/**
 * Sets up one chat turn. `action` is one of:
 *   { type: 'send', content }               append a new user message
 *   { type: 'edit', messageId, content }    replace a user message and everything after it
 *   { type: 'regenerate' }                  answer the last user message again
 *
 * Nothing already in the conversation is removed here. Messages being replaced are listed
 * in `replaces` and only deleted by commitTurn(), so a failed or refused edit/regenerate
 * leaves the conversation exactly as it was.
 */
export async function prepareTurn(user, conversationId, action) {
  const conversation = await getOwnedConversation(user._id, conversationId);
  const history = await loadHistory(conversation._id);

  let prior;
  let userMessage;
  let replaces = [];
  let createdUserMessage = true;

  if (action.type === 'send') {
    prior = history;
    userMessage = await createUserMessage(conversation._id, action.content);
  } else if (action.type === 'edit') {
    const index = history.findIndex((m) => m._id.equals(action.messageId));
    if (index === -1 || history[index].role !== 'user') {
      throw new ApiError(404, 'Message not found');
    }
    prior = history.slice(0, index);
    replaces = history.slice(index).map((m) => m._id);
    userMessage = await createUserMessage(conversation._id, action.content);
  } else {
    const index = history.findLastIndex((m) => m.role === 'user');
    if (index === -1) throw new ApiError(400, 'There is no message to regenerate a response for');
    prior = history.slice(0, index);
    replaces = history.slice(index + 1).map((m) => m._id);
    userMessage = history[index];
    createdUserMessage = false;
  }

  const system = buildSystemPrompt(conversation, user);

  return {
    action: action.type,
    conversation,
    userMessage,
    createdUserMessage,
    replaces,
    isFirstExchange: prior.length === 0,
    request: {
      model: conversation.model,
      system,
      messages: buildContext(prior, userMessage, system),
    },
  };
}

/**
 * Makes the turn permanent: drops the messages it replaces and saves the assistant
 * reply (pass null when there is no text to keep). Returns the saved message, if any.
 */
export async function commitTurn(turn, reply) {
  if (turn.replaces.length) await Message.deleteMany({ _id: { $in: turn.replaces } });

  const message = reply?.text
    ? await Message.create({
        conversationId: turn.conversation._id,
        role: 'assistant',
        content: reply.text,
        tokens: reply.outputTokens || undefined,
      })
    : null;

  // Bump updatedAt so the conversation moves to the top of the sidebar.
  await Conversation.updateOne({ _id: turn.conversation._id }, { $set: { updatedAt: new Date() } });
  return message;
}

// Undoes a turn that got no answer (refused or failed): removes the user message it
// created so a refused prompt isn't replayed as context. Regenerate created none.
export async function rollbackTurn(turn) {
  if (turn.createdUserMessage) await Message.deleteOne({ _id: turn.userMessage._id });
}

/**
 * Titles a conversation after its first exchange. Only replaces the default title,
 * so a rename the user made in the meantime wins. Returns the new title or null.
 */
export async function autoTitle(conversation, userText, assistantText) {
  if (conversation.title !== DEFAULT_TITLE) return null;
  const title = await generateTitle({ userText, assistantText });
  if (!title) return null;
  const { modifiedCount } = await Conversation.updateOne(
    { _id: conversation._id, title: DEFAULT_TITLE },
    { $set: { title } },
    { timestamps: false },
  );
  return modifiedCount ? title : null;
}
