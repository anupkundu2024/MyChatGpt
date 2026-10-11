import { create } from 'zustand';

const DURATION_MS = { error: 6000, info: 4000, success: 3000 };
const MAX_TOASTS = 4;

let nextId = 1;
const timers = new Map();

// toasts: [{ id, message, variant: 'error' | 'info' | 'success' }]
export const useToastStore = create((set, get) => ({
  toasts: [],

  show(message, variant = 'info') {
    if (!message) return;
    // The same message twice in a row (e.g. a retry that fails again) restarts its timer.
    const existing = get().toasts.find((t) => t.message === message && t.variant === variant);
    const id = existing?.id ?? nextId++;
    if (!existing) set((s) => ({ toasts: [...s.toasts, { id, message, variant }].slice(-MAX_TOASTS) }));

    clearTimeout(timers.get(id));
    timers.set(id, setTimeout(() => get().dismiss(id), DURATION_MS[variant]));
  },

  dismiss(id) {
    clearTimeout(timers.get(id));
    timers.delete(id);
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

// Callable from stores and event handlers: toast.error(getErrorMessage(err)).
export const toast = {
  error: (message) => useToastStore.getState().show(message, 'error'),
  info: (message) => useToastStore.getState().show(message, 'info'),
  success: (message) => useToastStore.getState().show(message, 'success'),
};
