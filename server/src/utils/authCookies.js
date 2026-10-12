import { env } from '../config/env.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

// In production Vercel rewrites /api to Render, so the browser sees the API on the client's
// own origin: the cookies are first-party and 'lax' is enough ('none' isn't needed).
const baseOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'lax' : 'strict',
};

// The refresh token is only needed by /api/auth, so the browser sends it nowhere else.
const PATHS = { [ACCESS_COOKIE]: '/', [REFRESH_COOKIE]: '/api/auth' };

export function setAuthCookies(res, { access, refresh }) {
  res.cookie(ACCESS_COOKIE, access.token, {
    ...baseOptions,
    path: PATHS[ACCESS_COOKIE],
    expires: access.expiresAt,
  });
  res.cookie(REFRESH_COOKIE, refresh.token, {
    ...baseOptions,
    path: PATHS[REFRESH_COOKIE],
    expires: refresh.expiresAt,
  });
}

export function clearAuthCookies(res) {
  for (const [name, path] of Object.entries(PATHS)) {
    res.clearCookie(name, { ...baseOptions, path });
  }
}
