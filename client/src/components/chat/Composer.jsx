import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';

const MAX_HEIGHT = 200;
const MAX_LENGTH = 32_000;

/**
 * Auto-growing message box. Enter sends, Shift+Enter inserts a newline.
 * While a reply streams in this conversation the send button becomes a stop button.
 * The parent can call ref.restore(text) to put text back after a failed send; it does
 * nothing if the user has already started typing something new.
 */
const Composer = forwardRef(function Composer(
  { onSend, onStop, isStreaming = false, sendDisabled = false, autoFocus = false, placeholder = 'Message Gemini' },
  ref,
) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  useImperativeHandle(ref, () => ({
    restore: (text) => {
      setValue((current) => current || text);
      textareaRef.current?.focus();
    },
    focus: () => textareaRef.current?.focus(),
  }));

  // Grow with the content up to MAX_HEIGHT, then scroll inside the box.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, [value]);

  const canSend = value.trim().length > 0 && !isStreaming && !sendDisabled;

  function submit() {
    if (!canSend) return;
    const text = value.trim();
    setValue('');
    onSend(text);
  }

  function handleKeyDown(e) {
    // isComposing: don't send while an IME (e.g. Japanese input) is mid-composition.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 rounded-[28px] border border-line bg-surface p-2.5 pl-5 shadow-lg shadow-black/10 focus-within:border-line-strong"
    >
      <label htmlFor="composer" className="sr-only">
        Message
      </label>
      <textarea
        id="composer"
        ref={textareaRef}
        rows={1}
        value={value}
        maxLength={MAX_LENGTH}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="max-h-50 min-h-6 flex-1 resize-none self-center bg-transparent py-1.5 text-[15px] leading-6 text-fg outline-none placeholder:text-muted"
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop generating"
          title="Stop generating"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fg text-app transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Square className="size-3.5 fill-current" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          title="Send message"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fg text-app transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowUp className="size-5" strokeWidth={2.25} />
        </button>
      )}
    </form>
  );
});

export default Composer;
