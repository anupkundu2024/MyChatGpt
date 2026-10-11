import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
// Body size caps. Chat messages allow 32,000 characters (up to ~128 KB as UTF-8); every other
// body is small (the largest is a 10,000-character system prompt). The first parser that
// matches handles the body, so the chat route gets the larger cap.
app.use('/api/chat', express.json({ limit: '160kb' }));
app.use(express.json({ limit: '48kb' }));
app.use(express.urlencoded({ extended: false, limit: '1kb' }));
app.use(cookieParser());
if (!env.isProd) app.use(morgan('dev'));

app.use('/api', apiRoutes);
app.use('/api', notFound);

// In production, serve the built client and fall back to index.html for client-side routes.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (env.isProd && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

export default app;
