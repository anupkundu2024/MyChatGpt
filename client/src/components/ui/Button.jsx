import { forwardRef } from 'react';
import Spinner from './Spinner.jsx';

const VARIANTS = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'border border-line bg-transparent text-fg hover:bg-surface',
  ghost: 'bg-transparent text-fg hover:bg-surface',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const SIZES = {
  md: 'h-12 px-5 text-[15px]',
  sm: 'h-9 px-4 text-sm',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
});

export default Button;
