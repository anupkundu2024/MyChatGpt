// Grey placeholder blocks shown while content loads.
export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-surface ${className}`} aria-hidden="true" />;
}

const TITLE_WIDTHS = ['w-4/5', 'w-3/5', 'w-11/12', 'w-2/3', 'w-3/4', 'w-1/2'];

// Sidebar conversation list placeholder.
export function ConversationListSkeleton() {
  return (
    <div role="status" className="px-2.5 py-1">
      <Skeleton className="mb-3 h-3 w-16" />
      {TITLE_WIDTHS.map((w) => (
        <Skeleton key={w} className={`mb-3.5 h-4 ${w}`} />
      ))}
      <span className="sr-only">Loading chats</span>
    </div>
  );
}

// Transcript placeholder: alternating user bubbles and assistant paragraphs.
export function MessageListSkeleton() {
  return (
    <div role="status" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pt-6 sm:px-6">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-8">
          <div className="flex justify-end">
            <Skeleton className="h-11 w-2/5 rounded-3xl" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="hidden size-8 shrink-0 rounded-lg sm:block" />
            <div className="flex-1 space-y-3 pt-1">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading messages</span>
    </div>
  );
}
