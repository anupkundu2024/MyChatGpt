import { describeError, expireSession, refreshSession } from './api.js';

export class StreamRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'StreamRequestError';
    this.status = status;
  }
}

const isAbort = (err) => err?.name === 'AbortError';

async function post(url, body, signal) {
  try {
    return await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    // fetch rejects with a bare TypeError when the network or server is unreachable.
    if (isAbort(err)) throw err;
    throw new StreamRequestError(describeError(0, null), 0);
  }
}

// Parses one SSE frame ("event: x\ndata: {...}"). Comment-only frames (heartbeats) return null.
function parseFrame(frame) {
  let event = 'message';
  const data = [];
  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return null;
  try {
    return { event, data: JSON.parse(data.join('\n')) };
  } catch {
    return { event, data: data.join('\n') };
  }
}

/**
 * POSTs `body` and reads the Server-Sent Events response with fetch + ReadableStream,
 * calling onEvent(event, data) for each frame. Resolves when the server ends the stream.
 *
 * An expired access token (401 before the stream opens) is refreshed once and retried,
 * the same way the axios instance does. Other failures (non-2xx, network down, connection
 * dropped mid-stream) throw StreamRequestError with a user-facing message. Aborting
 * `signal` rejects with an AbortError.
 */
export async function streamSse(url, body, { signal, onEvent }) {
  let res = await post(url, body, signal);

  if (res.status === 401) {
    try {
      await refreshSession();
    } catch {
      expireSession();
      throw new StreamRequestError('Your session has expired. Please log in again.', 401);
    }
    res = await post(url, body, signal);
  }

  if (!res.ok || !res.body) {
    const payload = await res.json().catch(() => null);
    throw new StreamRequestError(describeError(res.status, payload?.error?.message), res.status);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  for (;;) {
    let chunk;
    try {
      chunk = await reader.read();
    } catch (err) {
      // Connection dropped mid-reply (wifi lost, server restarted).
      if (isAbort(err)) throw err;
      throw new StreamRequestError('The connection was interrupted. Please try again.', 0);
    }
    const { value, done } = chunk;
    if (done) break;
    buffer += value;

    // Frames are separated by a blank line; keep any trailing partial frame in the buffer.
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop();
    for (const frame of frames) {
      const parsed = parseFrame(frame);
      if (parsed) onEvent(parsed.event, parsed.data);
    }
  }

  const last = buffer.trim() && parseFrame(buffer);
  if (last) onEvent(last.event, last.data);
}
