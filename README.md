# MyChatGpt

A ChatGPT-style full-stack chat app inspired by ChatGPT, built with MongoDB, Express, React, Node.js, and the Gemini 3.5 API. Vibe-coded in 1 hour, it streams replies, saves conversations per user, and supports switching between Gemini models.

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

| Layer | Tech |
| --- | --- |
| Front end | React 18, Vite, Tailwind CSS v4, React Router, Zustand, react-markdown |
| Back end | Node.js 20, Express 5, Mongoose, zod, bcrypt, jsonwebtoken |
| Database | MongoDB (Atlas) |
| AI | Google Gemini API via the official `@google/genai` SDK |

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

**Atlas:** under *Network Access*, add your current IP address, or the connection will time out.

### Production

```bash
npm run build   # builds client/dist
npm start       # NODE_ENV=production; Express serves the API and the built client
```

In production, serve the site over HTTPS (the auth cookies are `secure`) and set `CLIENT_URL` to the public URL.

## Environment variables

### `server/.env`

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | yes | MongoDB connection string. URL-encode special characters in the password. |
| `JWT_ACCESS_SECRET` | yes | Random string, 32+ characters |
| `JWT_REFRESH_SECRET` | yes | A different random string, 32+ characters |
| `GEMINI_API_KEY` | yes | Your Gemini API key |
| `PORT` | no | API port (default `5000`) |
| `CLIENT_URL` | no | Origin allowed by CORS (default `http://localhost:5173`) |
| `NODE_ENV` | no | `development` or `production` (set by the npm scripts) |
| `JWT_ACCESS_EXPIRES_IN` | no | Access token lifetime (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | no | Refresh token lifetime (default `7d`) |
| `DNS_SERVERS` | no | DNS resolvers for the `mongodb+srv://` lookup (default `8.8.8.8,1.1.1.1`), for networks whose DNS refuses SRV queries |

### `client/.env`

| Variable | Required | Description |
| --- | --- | --- |
| `API_PROXY_TARGET` | no | Where the Vite dev proxy sends `/api` (default `http://localhost:5000`). Read only by `vite.config.js`, never bundled. |

Never put secrets in `VITE_` variables; Vite bundles those into the browser code. The server refuses to start while any value is still a `your_...` placeholder from `.env.example`.

## Screenshots

> _Add screenshots here._

| Chat | Sidebar | Dark mode |
| --- | --- | --- |
| ![Chat](docs/screenshots/chat.png) | ![Sidebar](docs/screenshots/sidebar.png) | ![Dark mode](docs/screenshots/dark.png) |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Server (`node --watch`, development) and client (Vite) together |
| `npm run build` | Builds the client |
| `npm start` | Starts the server in production mode |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Invalid environment variables` at startup | Fill in the variables it lists in `server/.env` |
| `querySrv ECONNREFUSED` | Your DNS refuses SRV lookups. Set `DNS_SERVERS`, or use the non-SRV `mongodb://` string from Atlas. |
| `Could not reach any MongoDB server` | Add your IP in Atlas *Network Access* and check the cluster isn't paused |
| `Authentication failed` (MongoDB) | Check the username and password in `MONGO_URI` |
| "The AI service is not set up correctly" | `GEMINI_API_KEY` is wrong or revoked; the server log says which |
| "Gemini is getting too many requests" | Free-tier rate limit or daily quota reached. Wait a minute or switch models. |
| "API server not reachable" in the Vite terminal | The server isn't running (or crashed); check the server terminal |
