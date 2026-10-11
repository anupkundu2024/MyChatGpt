import { create } from 'zustand';

const SIDEBAR_KEY = 'sidebar-open';
const THEME_KEY = 'theme'; // also read by public/theme-init.js before the app loads

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode); the choice just isn't remembered.
  }
}

// theme-init.js has already resolved the theme (saved choice or OS preference).
const initialTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#ffffff' : '#212121');
}
applyTheme(initialTheme);

export const useUiStore = create((set, get) => ({
  // Desktop: sidebar docked open or collapsed (remembered). Mobile: drawer open or closed.
  sidebarOpen: read(SIDEBAR_KEY) !== 'false',
  mobileSidebarOpen: false,
  settingsOpen: false,
  theme: initialTheme, // 'light' | 'dark'

  toggleSidebar() {
    const sidebarOpen = !get().sidebarOpen;
    set({ sidebarOpen });
    write(SIDEBAR_KEY, String(sidebarOpen));
  },

  setMobileSidebarOpen(mobileSidebarOpen) {
    set({ mobileSidebarOpen });
  },

  setSettingsOpen(settingsOpen) {
    set({ settingsOpen });
  },

  setTheme(theme) {
    applyTheme(theme);
    write(THEME_KEY, theme);
    set({ theme });
  },

  toggleTheme() {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
  },
}));
