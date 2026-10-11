// Mirrors server/src/config/aiModels.js.
export const MODELS = [
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', description: 'Fast and capable for everyday tasks' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Stable model, thinks before answering' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', description: 'Quickest answers' },
];

export const DEFAULT_MODEL = 'gemini-3.5-flash';

export const modelLabel = (id) => MODELS.find((m) => m.id === id)?.label ?? id;
