import axios from 'axios';

// All JSON calls go through this instance. Relative baseURL: Vite proxies /api in dev,
// and Express serves the client itself in production, so there is no CORS either way.
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Requests whose 401 means "wrong credentials" or "session over", not "access token expired".
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshPromise = null;
let onSessionExpired = () => {};

// authStore registers this so the api layer can end the session without importing the store.
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// Single-flight: many requests failing with 401 at once trigger only one refresh.
// Also used by the fetch-based SSE reader, which can't go through axios interceptors.
export function refreshSession() {
  refreshPromise ??= api.post('/auth/refresh').finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const skip =
      response?.status !== 401 ||
      !config ||
      config._retried ||
      NO_REFRESH.some((path) => config.url?.startsWith(path));
    if (skip) throw error;

    config._retried = true;
    try {
      await refreshSession();
    } catch {
      expireSession();
      throw error;
    }
    // New cookies are set; replay the original request once.
    return api(config);
  },
);

export function expireSession() {
  onSessionExpired();
}

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * Turns an HTTP status and the server's message into text fit for the user.
 * The server's own messages are written for users, so they win, except the generic 500
 * text. Statuses with no JSON body (the dev proxy when Express is down, a gateway timeout)
 * get a friendly default.
 */
export function describeError(status, serverMessage, fallback = GENERIC_ERROR) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (serverMessage && serverMessage !== 'Internal server error') return serverMessage;
  if (!status) return 'Cannot reach the server. Check your connection and try again.';
  if (status === 413) return 'That message is too large to send. Try shortening it.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status === 502 || status === 504) return 'The server is not responding. Please try again in a moment.';
  if (status === 503) return 'The service is temporarily unavailable. Please try again in a moment.';
  return fallback;
}

// Server errors look like { error: { message, details?: [{ path, message }] } }.
export function getErrorMessage(err, fallback = GENERIC_ERROR) {
  if (err?.request && !err.response) return describeError(0, null, fallback);
  if (!err?.response) return err?.message || fallback;
  return describeError(err.response.status, err.response.data?.error?.message, fallback);
}

export function getFieldErrors(err) {
  const details = err?.response?.data?.error?.details ?? [];
  return Object.fromEntries(details.map(({ path, message }) => [path, message]));
}
