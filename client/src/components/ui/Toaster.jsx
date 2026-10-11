import { createPortal } from 'react-dom';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore.js';

const VARIANTS = {
  error: { icon: CircleAlert, className: 'border-danger/40 text-danger' },
  info: { icon: Info, className: 'border-line text-fg' },
  success: { icon: CircleCheck, className: 'border-accent/40 text-accent' },
};

// Stack of toasts in the bottom-right corner (bottom-center on mobile). Mounted once in App.
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
      // Errors interrupt screen readers; everything else waits its turn.
      aria-live="polite"
    >
      {toasts.map(({ id, message, variant }) => {
        const { icon: Icon, className } = VARIANTS[variant];
        return (
          <div
            key={id}
            role={variant === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-surface px-4 py-3 text-sm shadow-2xl shadow-black/40 ${className}`}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="flex-1 text-fg">{message}</p>
            <button
              type="button"
              onClick={() => dismiss(id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-md text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
