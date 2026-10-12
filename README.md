# MyChatGpt

A ChatGPT-style AI chat app built with the MERN stack and the Gemini 3.5 API, vibe-coded in 1 hour. Replies stream in word by word, conversations are saved per user, and you can switch between Gemini models.

## Features

- **Accounts:** register and log in with email and password. Sessions use JWTs in `httpOnly` cookies, and logging out signs you out on every device.
- **Streaming replies:** answers appear as they're generated (Server-Sent Events). You can stop a reply mid-stream.
- **Conversation history:** a sidebar with search, rename, pin and delete. Chat titles are generated automatically.
- **Edit and regenerate:** edit an earlier message or regenerate the last answer. If that fails, the conversation stays as it was.
- **Model picker:** Gemini 3.5 Flash (default), Gemini 2.5 Flash and Gemini 3.5 Flash-Lite, all on the free tier.
- **Custom instructions:** tell the assistant about yourself and how you want it to respond. This applies to every chat.
- **Rich answers:** Markdown, tables and syntax-highlighted code blocks with a copy button.
- **Feedback:** thumbs up or down on any answer.
- **Light and dark themes** that follow your OS by default.
- **Keyboard shortcuts:** `Ctrl/Cmd + Shift + O` starts a new chat, and `Esc` stops a streaming reply.
- **Protection:** rate limits on login and chat, zod validation on every request, and the API key never leaves the server.

## Tech stack

| Layer     | Tech                                                                   |
| --------- | ---------------------------------------------------------------------- |
| Front end | React 18, Vite, Tailwind CSS v4, React Router, Zustand, react-markdown |
| Back end  | Node.js 20, Express 5, Mongoose, zod, bcrypt, jsonwebtoken             |
| Database  | MongoDB (Atlas)                                                        |
| AI        | Google Gemini API via the official `@google/genai` SDK                 |

## Folder structure

```
MyChatGpt/
├── package.json          # npm workspaces + root scripts (dev, build, start)
├── client/               # React app (Vite)
│   ├── public/           # favicon, theme-init.js
│   └── src/
│       ├── pages/        # LoginPage, RegisterPage, ChatPage
│       ├── components/   # ui/, auth/, layout/, sidebar/, chat/, settings/
│       ├── store/        # Zustand stores: auth, chat (streaming), ui
│       ├── hooks/        # global keyboard shortcuts
│       └── lib/          # axios instance, SSE reader, model list, helpers
└── server/               # Express API
    └── src/
        ├── config/       # env validation, MongoDB connection, model allowlist
        ├── routes/       # Express routers
        ├── controllers/  # request/response handling
        ├── services/     # business logic, Gemini calls (llm.js)
        ├── models/       # Mongoose schemas: User, Conversation, Message
        ├── middleware/   # auth, validation, rate limits, errors
        ├── validators/   # zod schemas
        └── utils/        # ApiError, SSE helper, cookies
```

## Getting started

### Prerequisites

- Node.js 20.19 or newer
- A MongoDB database (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works)
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Setup

```bash
# 1. Clone
git clone https://github.com/anupkundu2024/MyChatGpt.git
cd MyChatGpt

# 2. Install (installs both client and server)
npm install

# 3. Create your env files, then fill in server/.env
cp server/.env.example server/.env
cp client/.env.example client/.env

# 4. Run client + server together
npm run dev
```

Open http://localhost:5173, create an account and start chatting. The API runs on http://localhost:5000, and Vite proxies `/api` to it.

To generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Atlas:** under _Network Access_, add your current IP address, or the connection will time out.

### Production

```bash
npm run build   # builds client/dist
npm start       # NODE_ENV=production; Express serves the API and the built client
```

In production, serve the site over HTTPS (the auth cookies are `secure`) and set `CLIENT_URL` to the public URL.

## Deployment (Render + Vercel)

The API runs on Render and the React app on Vercel. Vercel rewrites `/api/*` to Render, so the browser only ever talks to the Vercel domain. The auth cookies stay first-party (`httpOnly`, `secure`, `sameSite=lax`), and the client keeps calling relative `/api/...` URLs, as it does through the Vite proxy in development.

```
browser ──► your-app.vercel.app ──┬─ /api/*  ──► your-api.onrender.com/api/*
                                  └─ other   ──► index.html (SPA fallback)
```

### 1. MongoDB Atlas

Under _Network Access_, allow `0.0.0.0/0`. Render's free tier has no fixed outbound IP.

### 2. Backend on Render

Create a **Web Service** from this repo:

| Setting           | Value                                            |
| ----------------- | ------------------------------------------------ |
| Root Directory    | _(leave empty: repo root, where the lockfile is)_ |
| Runtime           | Node                                             |
| Build Command     | `npm ci`                                         |
| Start Command     | `npm start`                                      |
| Health Check Path | `/api/health`                                    |

`npm start` runs the server with `NODE_ENV=production` through `cross-env`, which is a regular dependency, so the server doesn't need any devDependencies. Add the [Render environment variables](#render-backend) below. Render sets `PORT` itself. When the service is live, copy its URL (e.g. `https://your-api.onrender.com`) and check `https://your-api.onrender.com/api/health`, which returns `{"status":"ok"}`.

### 3. Frontend on Vercel

1. In [`client/vercel.json`](client/vercel.json), replace `REPLACE-WITH-YOUR-RENDER-SERVICE.onrender.com` with your Render host, then commit.
2. Import the repo in Vercel:

   | Setting          | Value           |
   | ---------------- | --------------- |
   | Root Directory   | `client`        |
   | Framework Preset | Vite            |
   | Build Command    | `npm run build` |
   | Output Directory | `dist`          |

3. Deploy, then set `CLIENT_URL` on Render to the Vercel URL (e.g. `https://your-app.vercel.app`, no trailing slash) and redeploy the Render service.

`client/vercel.json` holds two rewrites: `/api/(.*)` goes to Render, and every other path goes to `/index.html`, so refreshing `/login` or `/c/:id` doesn't 404. Static files in `dist` are served before rewrites apply.

**Note:** free Render services sleep when idle, and the first request after a sleep can take up to a minute.

### Environment variables per platform

#### Render (backend)

| Variable                 | Required | Value                                                                       |
| ------------------------ | -------- | --------------------------------------------------------------------------- |
| `MONGO_URI`              | yes      | Atlas connection string                                                     |
| `JWT_ACCESS_SECRET`      | yes      | Random string, 32+ characters                                               |
| `JWT_REFRESH_SECRET`     | yes      | A different random string, 32+ characters                                   |
| `GEMINI_API_KEY`         | yes      | Your Gemini API key                                                         |
| `CLIENT_URL`             | yes      | Your Vercel URL, e.g. `https://your-app.vercel.app` (used for CORS)          |
| `NODE_ENV`               | no       | `production` (`npm start` already sets it)                                  |
| `JWT_ACCESS_EXPIRES_IN`  | no       | Default `15m`                                                               |
| `JWT_REFRESH_EXPIRES_IN` | no       | Default `7d`                                                                |
| `PORT`                   | no       | Don't set it; Render provides it (falls back to `5000` locally)             |
| `DNS_SERVERS`            | no       | Not needed; the custom DNS workaround is skipped when `NODE_ENV=production` |

#### Vercel (frontend)

None. The Render URL lives in `client/vercel.json`, and `API_PROXY_TARGET` is only used by the Vite dev server.

## Environment variables

### `server/.env`

| Variable                 | Required | Description                                                                                                           |
| ------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `MONGO_URI`              | yes      | MongoDB connection string. URL-encode special characters in the password.                                             |
| `JWT_ACCESS_SECRET`      | yes      | Random string, 32+ characters                                                                                         |
| `JWT_REFRESH_SECRET`     | yes      | A different random string, 32+ characters                                                                             |
| `GEMINI_API_KEY`         | yes      | Your Gemini API key                                                                                                   |
| `PORT`                   | no       | API port (default `5000`)                                                                                             |
| `CLIENT_URL`             | no       | Origin allowed by CORS (default `http://localhost:5173`)                                                              |
| `NODE_ENV`               | no       | `development` or `production` (set by the npm scripts)                                                                |
| `JWT_ACCESS_EXPIRES_IN`  | no       | Access token lifetime (default `15m`)                                                                                 |
| `JWT_REFRESH_EXPIRES_IN` | no       | Refresh token lifetime (default `7d`)                                                                                 |
| `DNS_SERVERS`            | no       | DNS resolvers for the `mongodb+srv://` lookup (default `8.8.8.8,1.1.1.1`), for networks whose DNS refuses SRV queries |

### `client/.env`

| Variable           | Required | Description                                                                                                            |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `API_PROXY_TARGET` | no       | Where the Vite dev proxy sends `/api` (default `http://localhost:5000`). Read only by `vite.config.js`, never bundled. |

Never put secrets in `VITE_` variables; Vite bundles those into the browser code. The server refuses to start while any value is still a `your_...` placeholder from `.env.example`.

## Screenshots

> _Add screenshots here._

| Chat                               | Sidebar                                  | Dark mode                               |
| ---------------------------------- | ---------------------------------------- | --------------------------------------- |
| ![Chat](docs/screenshots/chat.png) | ![Sidebar](docs/screenshots/sidebar.png) | ![Dark mode](docs/screenshots/dark.png) |

## Scripts

| Command         | What it does                                                    |
| --------------- | --------------------------------------------------------------- |
| `npm run dev`   | Server (`node --watch`, development) and client (Vite) together |
| `npm run build` | Builds the client                                               |
| `npm start`     | Starts the server in production mode                            |

## Troubleshooting

| Symptom                                         | Fix                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `Invalid environment variables` at startup      | Fill in the variables it lists in `server/.env`                                                     |
| `querySrv ECONNREFUSED`                         | Your DNS refuses SRV lookups. Set `DNS_SERVERS`, or use the non-SRV `mongodb://` string from Atlas. |
| `Could not reach any MongoDB server`            | Add your IP in Atlas _Network Access_ and check the cluster isn't paused                            |
| `Authentication failed` (MongoDB)               | Check the username and password in `MONGO_URI`                                                      |
| "The AI service is not set up correctly"        | `GEMINI_API_KEY` is wrong or revoked; the server log says which                                     |
| "Gemini is getting too many requests"           | Free-tier rate limit or daily quota reached. Wait a minute or switch models.                        |
| "API server not reachable" in the Vite terminal | The server isn't running (or crashed); check the server terminal                                    |
