import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const UNREACHABLE_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ETIMEDOUT']);

// Node reports a refused localhost connection as an AggregateError (IPv4 + IPv6 attempts).
const isUnreachable = (err) =>
  UNREACHABLE_CODES.has(err?.code) || (err?.errors ?? []).some((e) => UNREACHABLE_CODES.has(e?.code));

// When Express isn't running, log one short line (once per outage) and answer 502 in the
// API's error shape, instead of Vite's per-request stack trace. Vite attaches its own
// 'error' listener after configure(), so intercept emit; other errors still reach it.
function handleUnreachableApi(proxy, target) {
  let warned = false;
  const emit = proxy.emit.bind(proxy);

  proxy.emit = (event, ...args) => {
    if (event !== 'error' || !isUnreachable(args[0])) return emit(event, ...args);

    const res = args[2];
    if (!warned) {
      warned = true;
      console.warn(`[proxy] API server not reachable on ${target} — is the server running?`);
    }
    if (res && 'req' in res) {
      if (!res.headersSent && !res.writableEnded) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'API server not reachable. Is it running?' } }));
      }
    } else {
      res?.destroy?.(); // WebSocket upgrade: res is the socket
    }
    return true;
  };

  // Server is back: warn again on the next outage.
  proxy.on('proxyRes', () => {
    warned = false;
  });
}

export default defineConfig(({ mode }) => {
  // Empty prefix loads every variable for this config file only; the browser still
  // sees VITE_-prefixed ones alone, so API_PROXY_TARGET never reaches the bundle.
  const env = loadEnv(mode, import.meta.dirname, '');
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:5000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      // Dev only: the browser talks to Vite, which forwards /api to Express. Same origin,
      // so the auth cookies just work. Streaming (SSE) responses pass through unbuffered.
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          configure: (proxy) => handleUnreachableApi(proxy, apiTarget),
        },
      },
    },
  };
});
