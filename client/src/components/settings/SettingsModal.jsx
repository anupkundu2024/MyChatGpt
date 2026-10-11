import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Moon, Settings2, Sun, UserRound, X } from 'lucide-react';
import { getErrorMessage } from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { useUiStore } from '../../store/uiStore.js';
import Button from '../ui/Button.jsx';
import IconButton from '../ui/IconButton.jsx';

const MAX_INSTRUCTIONS = 4000;
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

const TABS = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'personalization', label: 'Personalization', icon: UserRound },
];

const SHORTCUTS = [
  { keys: [MOD, 'Shift', 'O'], label: 'New chat' },
  { keys: ['Esc'], label: 'Stop generating' },
  { keys: ['Enter'], label: 'Send message' },
  { keys: ['Shift', 'Enter'], label: 'New line' },
];

export default function SettingsModal() {
  const open = useUiStore((s) => s.settingsOpen);
  const setOpen = useUiStore((s) => s.setSettingsOpen);
  const [tab, setTab] = useState('general');
  const panelRef = useRef(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault(); // handled: don't also stop a streaming reply
      setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-app shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="settings-title" className="text-lg font-semibold">
            Settings
          </h2>
          <IconButton label="Close settings" onClick={close}>
            <X className="size-5" />
          </IconButton>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <div role="tablist" aria-label="Settings sections" className="flex gap-1 p-2 sm:w-48 sm:flex-col sm:border-r sm:border-line">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-accent ${
                  tab === id ? 'bg-surface font-medium text-fg' : 'text-muted hover:bg-surface hover:text-fg'
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className="min-h-[340px] flex-1 overflow-y-auto p-5"
          >
            {tab === 'general' ? <GeneralTab /> : <PersonalizationTab />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function GeneralTab() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-medium">Theme</h3>
        <div role="radiogroup" aria-label="Theme" className="mt-3 inline-flex rounded-full border border-line p-1">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={theme === id}
              onClick={() => setTheme(id)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                theme === id ? 'bg-surface-hover font-medium text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium">Keyboard shortcuts</h3>
        <dl className="mt-3 divide-y divide-line rounded-xl border border-line">
          {SHORTCUTS.map(({ keys, label }) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <dt className="text-muted">{label}</dt>
              <dd className="flex gap-1">
                {keys.map((k) => (
                  <kbd key={k} className="min-w-6 rounded-md border border-line bg-surface px-1.5 py-0.5 text-center font-sans text-xs">
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function PersonalizationTab() {
  const saved = useAuthStore((s) => s.user?.customInstructions ?? '');
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [value, setValue] = useState(saved);
  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [error, setError] = useState('');
  const id = useId();

  const dirty = value.trim() !== saved.trim();

  async function save() {
    setStatus('saving');
    setError('');
    try {
      await updateProfile({ customInstructions: value.trim() });
      setStatus('saved');
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('error');
    }
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        Custom instructions
      </label>
      <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
        What should Gemini know about you, and how would you like it to respond? Applies to all of
        your chats, starting with the next message.
      </p>
      <textarea
        id={id}
        aria-describedby={`${id}-hint`}
        value={value}
        maxLength={MAX_INSTRUCTIONS}
        rows={8}
        placeholder="e.g. I'm a frontend developer. Keep answers concise and show code in TypeScript."
        onChange={(e) => {
          setValue(e.target.value);
          setStatus('idle');
        }}
        className="mt-3 w-full resize-y rounded-xl border border-line bg-transparent px-4 py-3 text-[15px] leading-relaxed text-fg outline-none placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-muted">
        <span role="status">
          {status === 'saved' && 'Saved'}
          {status === 'error' && <span className="text-danger">{error}</span>}
        </span>
        <span>
          {value.length.toLocaleString()} / {MAX_INSTRUCTIONS.toLocaleString()}
        </span>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {dirty && (
          <Button variant="secondary" size="sm" onClick={() => setValue(saved)}>
            Discard
          </Button>
        )}
        <Button size="sm" loading={status === 'saving'} disabled={!dirty} onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}
