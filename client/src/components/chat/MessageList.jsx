import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { AssistantMessage, StreamingMessage, UserMessage } from './Message.jsx';

// Within this many pixels of the bottom counts as "at the bottom".
const BOTTOM_THRESHOLD = 80;

/**
 * Scrollable transcript. Follows new content while the user is at the bottom; once they
 * scroll up it stops following and shows a "scroll to bottom" button instead.
 * `busy` (any reply streaming) hides edit and regenerate. The action callbacks should be
 * stable references (store actions) so memoized messages don't re-render.
 */
export default function MessageList({
  conversationId,
  messages,
  streaming,
  busy,
  onEdit,
  onRegenerate,
  onFeedback,
}) {
  const scrollRef = useRef(null);
  const followRef = useRef(true);
  const [atBottom, setAtBottom] = useState(true);

  const scrollToBottom = useCallback((behavior = 'auto') => {
    const el = scrollRef.current;
    if (!el) return;
    followRef.current = true;
    setAtBottom(true);
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD;
    followRef.current = near;
    setAtBottom(near);
  };

  // Opening a conversation starts at the bottom.
  useLayoutEffect(() => {
    scrollToBottom();
  }, [conversationId, scrollToBottom]);

  // Sending a message always jumps back down to it.
  const last = messages.at(-1);
  useLayoutEffect(() => {
    if (last?.role === 'user') scrollToBottom();
  }, [last, scrollToBottom]);

  // New tokens: follow only if the user hasn't scrolled away.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && followRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, streaming?.text]);

  // Content can also grow after render (fonts, wrapping on resize).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (followRef.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto" aria-live="off">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-6 pb-10 sm:px-6">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <UserMessage key={m._id} message={m} canEdit={!busy} onEdit={onEdit} />
            ) : (
              <AssistantMessage
                key={m._id}
                message={m}
                onFeedback={onFeedback}
                onRegenerate={!busy && i === messages.length - 1 ? onRegenerate : undefined}
              />
            ),
          )}
          {streaming && <StreamingMessage text={streaming.text} phase={streaming.phase} />}
        </div>
      </div>

      {!atBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          aria-label="Scroll to bottom"
          className="absolute bottom-3 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-app text-fg shadow-lg transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ArrowDown className="size-4" />
        </button>
      )}
    </div>
  );
}
