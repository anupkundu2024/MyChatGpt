import mongoose from 'mongoose';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, verifyPassword } from './password.service.js';
import { issueTokens, verifyToken } from './token.service.js';

// Loads the user a verified token points at, or null if the token has been revoked.
async function findUserForToken(payload) {
  if (!payload || !mongoose.isValidObjectId(payload.sub)) return null;
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || user.tokenVersion !== payload.tv) return null;
  return user;
}

export async function register({ name, email, password }) {
  if (await User.exists({ email })) {
    throw new ApiError(409, 'An account with this email already exists');
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, passwordHash });
  return { user, tokens: issueTokens(user) };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user || !valid) throw new ApiError(401, 'Invalid email or password');
  return { user, tokens: issueTokens(user) };
}

// Issues a fresh token pair. Older refresh tokens stay valid until they
// expire, unless the user logs out (which bumps tokenVersion).
export async function refresh(refreshToken) {
  const user = await findUserForToken(verifyToken('refresh', refreshToken));
  if (!user) throw new ApiError(401, 'Session expired, please log in again');
  return { user, tokens: issueTokens(user) };
}

// Revokes every token issued to this user. Does nothing for an invalid token.
export async function logout(refreshToken) {
  const payload = verifyToken('refresh', refreshToken);
  if (!payload || !mongoose.isValidObjectId(payload.sub)) return;
  await User.updateOne(
    { _id: payload.sub, tokenVersion: payload.tv },
    { $inc: { tokenVersion: 1 } },
  );
}

export const authenticateAccessToken = (accessToken) =>
  findUserForToken(verifyToken('access', accessToken));
