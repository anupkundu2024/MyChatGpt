import { create } from 'zustand';
import { api, setSessionExpiredHandler } from '../lib/api.js';
import { useChatStore } from './chatStore.js';

// status: 'idle' (not checked yet) | 'loading' | 'authenticated' | 'unauthenticated'
export const useAuthStore = create((set, get) => ({
  user: null,
  status: 'idle',

  // Restores the session from the auth cookies on app start.
  async init() {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },

  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials);
    set({ user: data.user, status: 'authenticated' });
  },

  async register(details) {
    const { data } = await api.post('/auth/register', details);
    set({ user: data.user, status: 'authenticated' });
  },

  // PATCH /users/me: { name?, customInstructions? }. Throws on failure.
  async updateProfile(fields) {
    const { data } = await api.patch('/users/me', fields);
    set({ user: data.user });
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      get().clearSession();
    }
  },

  clearSession() {
    set({ user: null, status: 'unauthenticated' });
    useChatStore.getState().reset();
  },
}));

// Refresh failed (refresh token expired or revoked): drop to logged-out state.
// ProtectedRoute then redirects to /login.
setSessionExpiredHandler(() => useAuthStore.getState().clearSession());
