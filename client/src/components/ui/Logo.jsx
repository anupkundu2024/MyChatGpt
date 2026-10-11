// Generic sparkle mark for the app.
export default function Logo({ className = 'size-10' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" fillOpacity="0.08" />
      <path
        d="M16 6c.6 4.7 2.3 6.9 7 8-4.7 1.1-6.4 3.3-7 8-.6-4.7-2.3-6.9-7-8 4.7-1.1 6.4-3.3 7-8Z"
        fill="currentColor"
      />
      <path d="M23.5 20.5c.25 1.6.9 2.35 2.5 2.75-1.6.4-2.25 1.15-2.5 2.75-.25-1.6-.9-2.35-2.5-2.75 1.6-.4 2.25-1.15 2.5-2.75Z" fill="currentColor" fillOpacity="0.6" />
    </svg>
  );
}
