import { useCallback, useRef, useState } from 'react';
import { LogOut, Moon, Settings, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { Menu, MenuItem, MenuSeparator } from '../ui/Menu.jsx';

export function Avatar({ name, className = 'size-8 text-sm' }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-white ${className}`}
      aria-hidden="true"
    >
      {name?.charAt(0).toUpperCase()}
    </span>
  );
}

export default function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const openSettings = useUiStore((s) => s.setSettingsOpen);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
      >
        <Avatar name={user.name} />
        <span className="min-w-0 flex-1 truncate font-medium">{user.name}</span>
      </button>

      <Menu open={open} onClose={close} anchorRef={buttonRef} className="w-[244px]">
        <div className="truncate px-3 py-2 text-sm text-muted" title={user.email}>
          {user.email}
        </div>
        <MenuSeparator />
        <MenuItem
          icon={Settings}
          onClick={() => {
            close();
            openSettings(true);
          }}
        >
          Settings
        </MenuItem>
        <MenuItem icon={theme === 'dark' ? Sun : Moon} onClick={toggleTheme}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={LogOut}
          onClick={() => {
            close();
            logout().catch(() => {});
          }}
        >
          Log out
        </MenuItem>
      </Menu>
    </>
  );
}
