# ChatGPT Clone (MERN + Gemini)

A full-stack ChatGPT-style chat app. These decisions are fixed; follow them in every change.

## Layout

npm workspaces monorepo:

```
/client   React 18 + Vite + Tailwind CSS + React Router + Zustand
/server   Node 20 + Express + Mongoose
```

Root scripts (run from repo root):

- `npm install` installs both workspaces.
- `npm run dev` runs server and client together (concurrently).
- `npm run build` builds the client (the server has no build step).
- `npm start` starts the server in production mode; it serves `client/dist`.

In dev, Vite (port 5173) proxies `/api` to Express (port 5000), so the client always calls relative `/api/...` URLs.

## Server (`/server/src`)

```
config/        env.js (zod-validated env), db.js (Mongoose connection)
routes/        Express routers only: path + middleware + controller
controllers/   req/res handling; thin, no business logic
services/      business logic and external calls (Gemini API, token handling)
models/        Mongoose schemas
middleware/    requireAuth, validate (zod), rateLimit, errorHandler, notFound
validators/    zod schemas per feature (e.g. auth.validators.js)
utils/         ApiError and small helpers
app.js         Express app (no listen); server.js connects DB and listens
```

- ES modules everywhere (`"type": "module"`), async/await, no callbacks.
- Express 5: async errors reach the error handler without wrappers. Throw `ApiError(status, message)` for expected failures.
- All errors flow to `middleware/errorHandler.js`. Responses: `{ error: { message, details? } }`. No stack traces outside development.
- Validate every request body, params and query with zod via `middleware/validate.js`. Read config only from `config/env.js`, never `process.env` directly.

## LLM: Google Gemini API

- Use the official `@google/genai` SDK only (`ai.models.generateContentStream` / `generateContent`). No raw fetch, no OpenAI-compatible shims, and not the deprecated `@google/generative-ai`.
- **Before writing or changing any SDK code, check the current docs at https://ai.google.dev/gemini-api/docs** (and the installed SDK's types). Don't rely on memory, because API shapes change.
- Models (free tier): default `gemini-3.5-flash`; also allowed: `gemini-2.5-flash`, `gemini-3.5-flash-lite` (also used for titles). The allowlist lives in `config/aiModels.js`; reject any other model ID from the client. Pro models have no free-tier quota and `gemini-3.8-flash` / `gemini-flash-latest` were too slow (60 s+), so don't add them without testing.
- **All Gemini code lives in `services/llm.js`**, and nothing else imports the SDK. The API key (`GEMINI_API_KEY`) stays on the server.
- `llm.js` maps Gemini's `finishReason` / `promptFeedback.blockReason` to the app's provider-neutral `stopReason` (`end_turn`, `max_tokens`, `refusal`). Always check for `refusal` before using a response.
- Roles: the app stores `user` / `assistant`; `llm.js` converts `assistant` to Gemini's `model`. The system prompt goes in `config.systemInstruction`.
- Thought parts (`part.thought`) only drive the `status` event. Only final text is stored and replayed, and history is sent append-only, oldest turns trimmed to the token budget in `services/chat.service.js`. Don't edit or inject into earlier turns.
- Free-tier 429s (`RESOURCE_EXHAUSTED`) map to a 429 with a "wait and retry" message.
- On startup `migrateConversationModels()` moves conversations whose model is no longer allowed to the default.

## Auth

- Email/password. Hash passwords with bcrypt.
- JWT access token (short-lived) and refresh token (long-lived), both in `httpOnly`, `sameSite=strict` cookies that are `secure` in production. Never in localStorage, and never in response bodies.
- Revocation uses `User.tokenVersion`: both tokens carry it, and logout increments it, which signs the user out on every device.
- Rate-limit auth routes with express-rate-limit (`middleware/rateLimit.js`).

## Streaming

- Server-Sent Events from Express to React via `utils/sse.js`, with a heartbeat every 15 s. Stop the Gemini stream when the client disconnects.
- The event protocol (`user_message`, `status`, `delta`, `done`, `title`, `refusal`, `error`) is documented at the top of `controllers/chat.controller.js`. Keep it and the client in sync.
- Send, edit (`/chat/:id/edit/:messageId`) and regenerate (`/chat/:id/regenerate`) all go through `prepareTurn` / `commitTurn` / `rollbackTurn` in `services/chat.service.js`. Messages a turn replaces are deleted only on commit, so a refused or failed edit or regenerate leaves the conversation untouched.
- User-level custom instructions (`User.customInstructions`, `PATCH /api/users/me`) are appended to the system prompt by `buildSystemPrompt()`.
- Every conversation route checks ownership through `getOwnedConversation()` in `services/conversation.service.js` and answers 404 for other users' ids.
- The client reads the stream with `fetch` + `ReadableStream` (POST body plus cookies), not `EventSource`.

## Client (`/client/src`)

```
pages/        LoginPage, RegisterPage, ChatPage (serves "/" new chat and "/c/:conversationId")
components/   ui/ (Button, IconButton, TextField, Menu, ConfirmDialog, Spinner, Logo)
              auth/ (AuthLayout, RouteGuards), layout/ChatLayout, sidebar/, chat/
store/        authStore.js, chatStore.js (conversations, messages, streaming), uiStore.js (sidebar)
lib/          api.js (axios), sse.js (fetch + ReadableStream SSE reader), models.js, dates.js, validation.js
```

- Chat streaming lives in `runTurn()` in `chatStore.js` (used by `sendMessage`, `editMessage`, `regenerate`). Deltas are batched once per animation frame, and only one stream runs at a time (`stopStreaming()` aborts it). A failed or refused turn restores the pre-turn message snapshot.
- Global shortcuts live in `hooks/useKeyboardShortcuts.js`, which listens on `window`. Any component that handles Escape itself (menus, dialogs, edit box, search) must call `e.preventDefault()`, so Escape doesn't also stop a streaming reply.
- Assistant Markdown goes through `components/chat/Markdown.jsx` (react-markdown + remark-gfm + rehype-highlight). Never enable raw HTML.
- Markdown styles live in the `.markdown` block in `index.css`. Use the `.streaming-cursor` class for the live cursor, not the Tailwind typography plugin.
- Menus and dialogs render in a portal (`ui/Menu.jsx`, `ui/ConfirmDialog.jsx`) so the sidebar's scroll area can't clip them.
- Keep `lib/models.js` in sync with `server/src/config/aiModels.js`.

- JSON calls go through the axios instance in `lib/api.js` (`baseURL: '/api'`, `withCredentials`). Its interceptor handles an expired access token: on a 401 it calls `/auth/refresh` once (shared by concurrent requests) and replays the request. If refresh fails, `authStore.clearSession()` runs and the route guards redirect to `/login`.
- Streaming chat uses `fetch` (axios can't stream in the browser). A 401 there must go through the same refresh flow.
- Route guards: `ProtectedRoute` for signed-in pages, `GuestRoute` for /login and /register.
- Styling: Tailwind v4 via `@tailwindcss/vite`. The theme tokens (`bg-app`, `bg-sidebar`, `bg-surface`, `border-line`, `border-line-strong`, `text-fg`, `text-muted`, `text-link`, `accent`, `danger`) map to CSS variables. Those variables have light and dark values under `html[data-theme]` in `index.css`. Use the tokens, not raw hex values; code blocks are the one exception and stay dark in both themes.
- Theme: `public/theme-init.js` sets `data-theme` before first paint, using the saved choice or else the OS preference. It's a separate file so the production CSP allows it. `uiStore.setTheme` saves the choice to localStorage under `theme`.

## Data and secrets

- MongoDB Atlas via `MONGO_URI`.
- Secrets live only in `.env` files. Keep `server/.env.example` and `client/.env.example` up to date when adding variables. `.gitignore` excludes `.env` and `node_modules`.
