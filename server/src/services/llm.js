// All Google Gemini API access lives here.
// Written against the official @google/genai SDK (v2); re-check https://ai.google.dev/gemini-api/docs
// before changing request shapes.
import { GoogleGenAI, ApiError as GeminiApiError } from '@google/genai';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export const TITLE_MODEL = 'gemini-3.5-flash-lite';

// Streaming responses can be long; the cap only bounds the worst case.
const CHAT_MAX_OUTPUT_TOKENS = 32_768;

// Finish/block reasons where Gemini declined or cut off the answer for policy reasons.
// Reported to the controller as stopReason 'refusal' (the app's provider-neutral name).
const REFUSAL_REASONS = new Set([
  'SAFETY',
  'RECITATION',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'SPII',
  'LANGUAGE',
  'OTHER',
]);

export const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful, knowledgeable assistant. Answer clearly and accurately, ' +
  'use Markdown for formatting where it helps, and say so when you are unsure.';

// Rough, deliberately conservative estimate (current tokenizers average ~3-4 chars/token
// for English). Used only to decide how much history fits in the budget.
export const estimateTokens = (text) => Math.ceil((text?.length ?? 0) / 3);

// The app stores turns as { role: 'user' | 'assistant', content }; Gemini calls the
// assistant 'model' and wants text in parts.
const toContents = (messages) =>
  messages.map(({ role, content }) => ({
    role: role === 'assistant' ? 'model' : 'user',
    parts: [{ text: content }],
  }));

// Maps Gemini finish/block reasons onto the stop reasons the controller and client use.
function toStopReason({ blockReason, finishReason }) {
  if (blockReason || REFUSAL_REASONS.has(finishReason)) return 'refusal';
  if (finishReason === 'MAX_TOKENS') return 'max_tokens';
  return 'end_turn';
}

/**
 * Streams a chat completion.
 *
 * @param {object} opts
 * @param {string} opts.model            one of AI_MODELS
 * @param {string} opts.system           system prompt
 * @param {{ role: 'user'|'assistant', content: string }[]} opts.messages  history ending with the new user turn
 * @param {AbortSignal} opts.signal      aborts the upstream request (client disconnected)
 * @param {(text: string) => void} opts.onText       called for each text delta
 * @param {() => void} [opts.onThinking]             called when the model starts thinking
 * @returns {Promise<{ text: string, stopReason: string, model: string, outputTokens: number }>}
 */
export async function streamChat({ model, system, messages, signal, onText, onThinking }) {
  const stream = await client.models.generateContentStream({
    model,
    contents: toContents(messages),
    config: {
      systemInstruction: system,
      maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
      // Thought summaries arrive as parts flagged `thought`; used only for the "thinking"
      // status and never stored or replayed.
      thinkingConfig: { includeThoughts: true },
      abortSignal: signal,
    },
  });

  let text = '';
  let thinkingSent = false;
  let finishReason;
  let blockReason;
  let modelVersion = model;
  let outputTokens = 0;

  for await (const chunk of stream) {
    blockReason ??= chunk.promptFeedback?.blockReason;
    if (chunk.modelVersion) modelVersion = chunk.modelVersion;
    if (chunk.usageMetadata?.candidatesTokenCount) outputTokens = chunk.usageMetadata.candidatesTokenCount;

    const candidate = chunk.candidates?.[0];
    if (!candidate) continue;
    if (candidate.finishReason) finishReason = candidate.finishReason;

    for (const part of candidate.content?.parts ?? []) {
      if (part.thought) {
        if (!thinkingSent) {
          thinkingSent = true;
          onThinking?.();
        }
      } else if (part.text) {
        text += part.text;
        onText(part.text);
      }
    }
  }

  return {
    text,
    stopReason: toStopReason({ blockReason, finishReason }),
    model: modelVersion,
    outputTokens,
  };
}

/**
 * Generates a short 3-6 word conversation title with the lite model.
 * Returns null on refusal or an unusable answer so the caller keeps the default title.
 */
export async function generateTitle({ userText, assistantText }) {
  const response = await client.models.generateContent({
    model: TITLE_MODEL,
    contents:
      `Write a title for this conversation.\n\n<user>\n${userText.slice(0, 4000)}\n</user>\n\n` +
      `<assistant>\n${assistantText.slice(0, 4000)}\n</assistant>`,
    config: {
      systemInstruction:
        'You write titles for chat conversations. Reply with only the title: 3 to 6 words, ' +
        'Title Case, no quotes, no trailing punctuation.',
      maxOutputTokens: 1024,
    },
  });

  const stopReason = toStopReason({
    blockReason: response.promptFeedback?.blockReason,
    finishReason: response.candidates?.[0]?.finishReason,
  });
  if (stopReason === 'refusal') return null;

  const title = (response.text ?? '')
    .replace(/["'`*#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?:;,]+$/, '')
    .split(' ')
    .slice(0, 6)
    .join(' ')
    .slice(0, 80);

  return title || null;
}

// The SDK forwards abortSignal to fetch, which rejects with a standard AbortError.
export const isAbortError = (err) => err?.name === 'AbortError';

// Gemini answers a bad or revoked key with 400 INVALID_ARGUMENT, not 401.
const isKeyProblem = (err) => /API key not valid|API_KEY_INVALID|API key expired/i.test(err.message ?? '');

// Maps SDK errors to client-safe ApiErrors. Details are logged, never sent to the browser.
export function toApiError(err) {
  if (err instanceof ApiError) return err;
  if (err instanceof TypeError && /fetch failed/i.test(err.message)) {
    return new ApiError(503, 'Could not reach Gemini. Please check back in a moment.');
  }
  if (!(err instanceof GeminiApiError)) return err;

  const { status } = err;
  if (status === 401 || status === 403 || isKeyProblem(err)) {
    console.error(`[llm] Gemini rejected the API key (${status}); check GEMINI_API_KEY`);
    return new ApiError(503, 'The AI service is not set up correctly. Please contact the site administrator.');
  }
  if (status === 429) {
    // The message is the full JSON error body; one line is enough for the log.
    const model = /model: ([\w.-]+)/.exec(err.message ?? '')?.[1];
    console.warn(`[llm] Gemini quota/rate limit hit (429)${model ? ` for ${model}` : ''}`);
    return new ApiError(
      429,
      'Gemini is getting too many requests (or the free-tier quota is used up). Please wait a minute and try again.',
    );
  }
  if (status === 404) {
    console.error('[llm] Gemini model not available:', err.message);
    return new ApiError(502, 'This model is not available right now. Try another model.');
  }
  if (status === 413) {
    return new ApiError(413, 'This conversation is too large to send. Please start a new chat.');
  }
  if (status === 400) {
    console.error('[llm] Bad request to Gemini:', err.message);
    return new ApiError(502, 'Gemini could not process this request. Try rephrasing or starting a new chat.');
  }
  if (status === 503) {
    return new ApiError(503, 'Gemini is overloaded right now. Please try again in a moment.');
  }
  console.error(`[llm] Gemini API error ${status}:`, err.message);
  return new ApiError(503, 'Gemini is temporarily unavailable. Please try again.');
}
