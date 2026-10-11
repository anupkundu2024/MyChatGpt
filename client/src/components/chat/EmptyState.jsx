import { Code2, GraduationCap, Lightbulb, PenLine } from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: Code2,
    title: 'Write a function',
    subtitle: 'that debounces another function in JavaScript',
    prompt: 'Write a JavaScript function that debounces another function, with a short explanation and an example.',
  },
  {
    icon: GraduationCap,
    title: 'Explain a concept',
    subtitle: 'like how HTTPS keeps data private',
    prompt: 'Explain how HTTPS keeps data private, in simple terms, step by step.',
  },
  {
    icon: Lightbulb,
    title: 'Brainstorm ideas',
    subtitle: 'for a weekend side project',
    prompt: 'Brainstorm 8 fun weekend side-project ideas for a web developer, with one sentence each.',
  },
  {
    icon: PenLine,
    title: 'Help me write',
    subtitle: 'a polite follow-up email',
    prompt: 'Help me write a short, polite follow-up email after a job interview.',
  },
];

// New-chat screen: greeting, the composer in the middle, and starter prompts.
export default function EmptyState({ userName, composer, onSuggestion, disabled }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8">
      <div className="w-full max-w-3xl">
        <h1 className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-[28px]">
          What can I help with{userName ? `, ${userName}` : ''}?
        </h1>
        {composer}
        <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map(({ icon: Icon, title, subtitle, prompt }) => (
            <li key={title}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSuggestion(prompt)}
                className="flex h-full w-full items-start gap-3 rounded-2xl border border-line px-4 py-3 text-left transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="text-sm">
                  <span className="block font-medium text-fg">{title}</span>
                  <span className="block text-muted">{subtitle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
