import { memo, useId, useLayoutEffect, useRef, useState } from 'react';
import { Pencil, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react';
import { isLocalId } from '../../store/chatStore.js';
import Logo from '../ui/Logo.jsx';
import CopyButton from './CopyButton.jsx';
import Markdown from './Markdown.jsx';

// Hover-revealed row of small icon actions under a message (always visible on touch screens).
function Actions({ align = 'start', children }) {
  return (
    <div
      className={`mt-1 flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 ${
        align === 'end' ? 'justify-end' : ''
      }`}
    >
      {children}
    </div>
  );
}

function ActionButton({ label, pressed, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={`inline-flex rounded-md p-1.5 transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40 ${
        pressed ? 'text-fg' : 'text-muted'
      }`}
    >
      {children}
    </button>
  );
}

function EditBox({ initial, onCancel, onSubmit }) {
  const [value, setValue] = useState(initial);
  const ref = useRef(null);
  const id = useId();

  useLayoutEffect(() => {
    const el = ref.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [value]);

  const canSubmit = value.trim() && value.trim() !== initial.trim();
  const submit = () => canSubmit && onSubmit(value.trim());

  return (
    <div className="w-full rounded-3xl bg-surface p-3">
      <label htmlFor={id} className="sr-only">
        Edit message
      </label>
      <textarea
        id={id}
        ref={ref}
        autoFocus
        value={value}
        maxLength={32_000}
        onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault(); // don't also trigger the global "stop generating" shortcut
            onCancel();
          } else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className="w-full resize-none bg-transparent px-2 py-1 text-[15px] leading-relaxed text-fg outline-none"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-full bg-fg px-4 py-1.5 text-sm font-medium text-app hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-30"
        >
          Send
        </button>
      </div>
    </div>
  );
}

/**
 * onEdit(messageId, newContent) is called when an edit is submitted; pass canEdit={false}
 * while a reply is streaming. Messages not yet confirmed by the server can't be edited.
 */
export const UserMessage = memo(function UserMessage({ message, canEdit, onEdit }) {
  const [editing, setEditing] = useState(false);
  const editable = canEdit && !isLocalId(message._id);

  if (editing) {
    return (
      <EditBox
        initial={message.content}
        onCancel={() => setEditing(false)}
        onSubmit={(content) => {
          setEditing(false);
          onEdit(message._id, content);
        }}
      />
    );
  }

  return (
    <div className="group flex flex-col items-end">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl bg-surface px-5 py-2.5 text-[15px] leading-relaxed sm:max-w-[70%]">
        {message.content}
      </div>
      <Actions align="end">
        <CopyButton getText={() => message.content} label="Copy message" className="p-1.5" />
        {editable && (
          <ActionButton label="Edit message" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
          </ActionButton>
        )}
      </Actions>
    </div>
  );
});

function AssistantShell({ children }) {
  return (
    <div className="group flex gap-4">
      <div className="hidden shrink-0 sm:block">
        <Logo className="size-8 text-fg" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
    </div>
  );
}

/**
 * onFeedback(messageId, 'up' | 'down' | null): clicking the active thumb again clears it.
 * onRegenerate is only passed for the last answer, and only when no reply is streaming.
 */
export const AssistantMessage = memo(function AssistantMessage({ message, onFeedback, onRegenerate }) {
  const rateable = !isLocalId(message._id);
  const rate = (value) => onFeedback(message._id, message.feedback === value ? null : value);

  return (
    <AssistantShell>
      <Markdown>{message.content}</Markdown>
      <Actions>
        <CopyButton getText={() => message.content} label="Copy response" className="p-1.5" />
        {rateable && (
          <>
            <ActionButton label="Good response" pressed={message.feedback === 'up'} onClick={() => rate('up')}>
              <ThumbsUp className={`size-3.5 ${message.feedback === 'up' ? 'fill-current' : ''}`} />
            </ActionButton>
            <ActionButton label="Bad response" pressed={message.feedback === 'down'} onClick={() => rate('down')}>
              <ThumbsDown className={`size-3.5 ${message.feedback === 'down' ? 'fill-current' : ''}`} />
            </ActionButton>
          </>
        )}
        {onRegenerate && (
          <ActionButton label="Regenerate response" onClick={onRegenerate}>
            <RefreshCw className="size-3.5" />
          </ActionButton>
        )}
      </Actions>
    </AssistantShell>
  );
});

// The reply currently arriving: a thinking indicator until the first token, then live
// Markdown with a blinking cursor at the end of the text.
export function StreamingMessage({ text, phase }) {
  return (
    <AssistantShell>
      {text ? (
        <Markdown streaming>{text}</Markdown>
      ) : (
        <div className="flex h-7 items-center gap-2 text-[15px] text-muted" role="status">
          <span className="size-2.5 animate-pulse rounded-full bg-fg" aria-hidden="true" />
          {phase === 'thinking' && <span className="animate-pulse">Thinking…</span>}
          <span className="sr-only">Gemini is responding</span>
        </div>
      )}
    </AssistantShell>
  );
}
