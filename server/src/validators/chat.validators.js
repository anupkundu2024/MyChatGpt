import { z } from 'zod';
import { objectId } from './conversation.validators.js';

export const chatParams = z.object({ conversationId: objectId });
export const editParams = z.object({ conversationId: objectId, messageId: objectId });

export const chatMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(32_000, 'Message is too long (max 32,000 characters)'),
});
