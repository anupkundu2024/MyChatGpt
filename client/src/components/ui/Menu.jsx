import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 6;
const MARGIN = 8;

/**
 * Dropdown anchored to `anchorRef`, rendered in a portal with fixed positioning so
 * scrolling containers (the sidebar) can't clip it. Opens below the anchor, or above
 * when there isn't room. Closes on outside click, Escape, resize, or scroll.
 */
export function Menu({ open, onClose, anchorRef, align = 'start', className = '', children }) {
  const menuRef = useRef(null);
  const [style, setStyle] = useState({ visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current?.getBoundingClientRect();
    const menu = menuRef.current?.getBoundingClientRect();
    if (!anchor || !menu) return;

    const fitsBelow = anchor.bottom + GAP + menu.height <= window.innerHeight - MARGIN;
    const top = fitsBelow ? anchor.bottom + GAP : anchor.top - GAP - menu.height;
    const left = align === 'end' ? anchor.right - menu.width : anchor.left;

    setStyle({
      top: Math.max(MARGIN, top),
      left: Math.min(Math.max(MARGIN, left), window.innerWidth - menu.width - MARGIN),
    });
  }, [open, anchorRef, align]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (menuRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      onClose();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault(); // handled: don't also stop a streaming reply
        onClose();
        anchorRef.current?.focus();
      }
    };
    const onViewportChange = (e) => {
      if (!menuRef.current?.contains(e.target)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    // Focus the first item for keyboard users.
    menuRef.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) setStyle({ visibility: 'hidden' });
  }, [open]);

  if (!open) return null;

  // Arrow keys move between items.
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    const i = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      onKeyDown={onKeyDown}
      style={{ position: 'fixed', ...style }}
      className={`z-50 min-w-44 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl shadow-black/40 ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuItem({ icon: Icon, danger = false, children, onClick, ...props }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover ${
        danger ? 'text-danger' : 'text-fg'
      }`}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-line" role="separator" />;
}
