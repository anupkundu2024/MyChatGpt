import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, ChevronDown, Menu as MenuIcon, PanelLeftOpen, SquarePen } from 'lucide-react';
import { MODELS, modelLabel } from '../../lib/models.js';
import { useUiStore } from '../../store/uiStore.js';
import IconButton from '../ui/IconButton.jsx';
import { Menu, MenuItem } from '../ui/Menu.jsx';

/**
 * Top bar of the main panel: sidebar toggles, the model picker, and New chat.
 * For a new chat the model applies when it's created; for an existing chat it's saved on
 * the conversation and used from the next reply.
 */
export default function ChatHeader({ model, onModelChange }) {
  const navigate = useNavigate();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const openMobileSidebar = useUiStore((s) => s.setMobileSidebarOpen);

  const pickerRef = useRef(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-1 px-2 sm:px-3">
      <IconButton label="Open sidebar" className="md:hidden" onClick={() => openMobileSidebar(true)}>
        <MenuIcon className="size-5" />
      </IconButton>
      {!sidebarOpen && (
        <>
          <IconButton label="Open sidebar" className="hidden md:inline-flex" onClick={toggleSidebar}>
            <PanelLeftOpen className="size-5" />
          </IconButton>
          <IconButton label="New chat" className="hidden md:inline-flex" onClick={() => navigate('/')}>
            <SquarePen className="size-5" />
          </IconButton>
        </>
      )}

      <button
        ref={pickerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={pickerOpen}
        onClick={() => setPickerOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[17px] font-medium text-fg enabled:hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default"
        title="Choose a model"
      >
        {modelLabel(model)}
        <ChevronDown className="size-4 text-muted" />
      </button>

      <Menu open={pickerOpen} onClose={closePicker} anchorRef={pickerRef} className="w-72">
        {MODELS.map((m) => (
          <MenuItem
            key={m.id}
            onClick={() => {
              onModelChange(m.id);
              closePicker();
            }}
          >
            <span className="flex-1">
              <span className="block font-medium">{m.label}</span>
              <span className="block text-xs text-muted">{m.description}</span>
            </span>
            {m.id === model && <Check className="size-4 text-fg" aria-label="Selected" />}
          </MenuItem>
        ))}
      </Menu>

      <IconButton label="New chat" className="ml-auto md:hidden" onClick={() => navigate('/')}>
        <SquarePen className="size-5" />
      </IconButton>
    </header>
  );
}
