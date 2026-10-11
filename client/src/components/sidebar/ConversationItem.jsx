import { useCallback, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { Ellipsis, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import { getErrorMessage } from '../../lib/api.js';
import { useChatStore } from '../../store/chatStore.js';
import { toast } from '../../store/toastStore.js';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import { Menu, MenuItem, MenuSeparator } from '../ui/Menu.jsx';

export default function ConversationItem({ conversation, active, onNavigate }) {
  const { _id: id, title, pinned } = conversation;
  const navigate = useNavigate();
  const renameConversation = useChatStore((s) => s.renameConversation);
  const togglePinned = useChatStore((s) => s.togglePinned);
  const deleteConversation = useChatStore((s) => s.deleteConversation);

  const menuButtonRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const report = (err) => toast.error(getErrorMessage(err));

  const renameCancelled = useRef(false);

  async function saveRename(value) {
    setRenaming(false);
    if (renameCancelled.current) return;
    const next = value.trim();
    if (next && next !== title) await renameConversation(id, next).catch(report);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteConversation(id);
      if (active) navigate('/');
    } catch (err) {
      report(err);
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  const rowClass = `group relative flex items-center rounded-lg text-sm ${
    active ? 'bg-surface' : 'hover:bg-surface/60'
  }`;

  if (renaming) {
    return (
      <div className={rowClass}>
        <input
          autoFocus
          defaultValue={title}
          maxLength={200}
          aria-label="Chat title"
          onFocus={(e) => e.target.select()}
          onBlur={(e) => saveRename(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              e.preventDefault();
              renameCancelled.current = true;
              e.currentTarget.blur();
            }
          }}
          className="h-9 w-full rounded-lg border border-accent bg-app px-2.5 text-sm outline-none"
        />
      </div>
    );
  }

  return (
    <div className={rowClass}>
      <NavLink
        to={`/c/${id}`}
        onClick={onNavigate}
        className="min-w-0 flex-1 truncate rounded-lg px-2.5 py-2 focus-visible:outline-2 focus-visible:outline-accent"
        title={title}
      >
        {title}
      </NavLink>

      <button
        ref={menuButtonRef}
        type="button"
        aria-label={`Options for ${title}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
        className={`mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:text-fg focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent ${
          active || menuOpen ? 'opacity-100' : 'md:opacity-0 md:group-hover:opacity-100'
        }`}
      >
        <Ellipsis className="size-4" />
      </button>

      <Menu open={menuOpen} onClose={closeMenu} anchorRef={menuButtonRef}>
        <MenuItem
          icon={pinned ? PinOff : Pin}
          onClick={() => {
            closeMenu();
            togglePinned(id).catch(report);
          }}
        >
          {pinned ? 'Unpin' : 'Pin'}
        </MenuItem>
        <MenuItem
          icon={Pencil}
          onClick={() => {
            closeMenu();
            renameCancelled.current = false;
            setRenaming(true);
          }}
        >
          Rename
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={Trash2}
          danger
          onClick={() => {
            closeMenu();
            setConfirmingDelete(true);
          }}
        >
          Delete
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete chat?"
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      >
        This will delete <strong className="font-semibold text-fg">{title}</strong> and all of its messages.
      </ConfirmDialog>
    </div>
  );
}
