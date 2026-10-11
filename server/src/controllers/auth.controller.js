import * as authService from '../services/auth.service.js';
import { clearAuthCookies, setAuthCookies, REFRESH_COOKIE } from '../utils/authCookies.js';

export async function register(req, res) {
  const { user, tokens } = await authService.register(req.validated.body);
  setAuthCookies(res, tokens);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const { user, tokens } = await authService.login(req.validated.body);
  setAuthCookies(res, tokens);
  res.json({ user });
}

export async function refresh(req, res) {
  try {
    const { user, tokens } = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
    setAuthCookies(res, tokens);
    res.json({ user });
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
}

export async function logout(req, res) {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  clearAuthCookies(res);
  res.status(204).end();
}

export function me(req, res) {
  res.json({ user: req.user });
}
