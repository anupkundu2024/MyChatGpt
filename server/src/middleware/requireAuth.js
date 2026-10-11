import { authenticateAccessToken } from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ACCESS_COOKIE } from '../utils/authCookies.js';

// Attaches the authenticated user document as req.user, or responds 401.
export async function requireAuth(req, _res, next) {
  const user = await authenticateAccessToken(req.cookies?.[ACCESS_COOKIE]);
  if (!user) throw new ApiError(401, 'Not authenticated');
  req.user = user;
  next();
}
