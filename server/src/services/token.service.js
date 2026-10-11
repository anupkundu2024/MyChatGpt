import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';

const TOKENS = {
  access: { secret: env.JWT_ACCESS_SECRET, expiresIn: env.JWT_ACCESS_EXPIRES_IN },
  refresh: { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN },
};

function sign(kind, user) {
  const { secret, expiresIn } = TOKENS[kind];
  const token = jwt.sign({ tv: user.tokenVersion ?? 0 }, secret, {
    subject: user._id.toString(),
    expiresIn,
    algorithm: ALGORITHM,
  });
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000) };
}

export const issueTokens = (user) => ({
  access: sign('access', user),
  refresh: sign('refresh', user),
});

// Returns { sub, tv }, or null when the token is missing, expired or tampered with.
export function verifyToken(kind, token) {
  if (!token) return null;
  try {
    const { sub, tv } = jwt.verify(token, TOKENS[kind].secret, { algorithms: [ALGORITHM] });
    return { sub, tv };
  } catch {
    return null;
  }
}
