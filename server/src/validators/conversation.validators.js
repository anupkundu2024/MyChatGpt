import { z } from 'zod';
import { AI_MODELS } from '../config/aiModels.js';
import { FEEDBACK_VALUES } from '../models/index.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const conversationIdParams = z.object({ id: objectId });
export const messageParams = z.object({ id: objectId, messageId: objectId });

const title = z.string().trim().min(1, 'Title cannot be empty').max(200);

export const createConversationSchema = z.object({
  title: title.optional(),
  model: z.enum(AI_MODELS).optional(),
  systemPrompt: z.string().trim().max(10_000).optional(),
});

export const updateConversationSchema = z
  .object({
    title: title.optional(),
    pinned: z.boolean().optional(),
    model: z.enum(AI_MODELS).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Provide title, pinned and/or model',
  });

// null clears the rating.
export const feedbackSchema = z.object({
  feedback: z.enum(FEEDBACK_VALUES).nullable(),
});
