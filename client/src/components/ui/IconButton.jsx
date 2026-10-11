import { forwardRef } from 'react';

// Square, label-only icon button (the label is the accessible name and tooltip).
const IconButton = forwardRef(function IconButton({ label, className = '', children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export default IconButton;
