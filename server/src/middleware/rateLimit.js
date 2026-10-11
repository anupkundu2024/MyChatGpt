import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const limiter = (limit, message, extra = {}) =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { message } },
    ...extra,
  });

// Login and register: brute-force protection. Successful requests don't count.
export const credentialsLimiter = limiter(10, 'Too many attempts, please try again in 15 minutes', {
  skipSuccessfulRequests: true,
});

// refresh / logout / me are called routinely by the client, so the cap is looser.
export const sessionLimiter = limiter(100, 'Too many requests, please slow down');

// Chat costs real money per request: limit per signed-in user (runs after requireAuth).
const perUser = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => req.user._id.toString(),
    message: { error: { message } },
  });

const chatBurstLimiter = perUser(60 * 1000, 20, 'You are sending messages too quickly, please wait a moment');
const chatDailyLimiter = perUser(
  24 * 60 * 60 * 1000,
  300,
  'You have reached the daily message limit. Please come back tomorrow.',
);

// One reply streams per user at a time, so a script can't open many parallel (expensive)
// streams inside the per-minute budget. The slot frees when the response closes.
const activeStreams = new Set();

function oneStreamPerUser(req, res, next) {
  const key = req.user._id.toString();
  if (activeStreams.has(key)) {
    throw new ApiError(429, 'A reply is already in progress. Wait for it to finish or stop it first.');
  }
  activeStreams.add(key);
  res.on('close', () => activeStreams.delete(key));
  next();
}

export const chatLimiter = [chatBurstLimiter, chatDailyLimiter, oneStreamPerUser];
