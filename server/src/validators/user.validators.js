import { z } from 'zod';

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100).optional(),
    customInstructions: z.string().trim().max(4000, 'Keep custom instructions under 4,000 characters').optional(),
  })
  .refine((v) => v.name !== undefined || v.customInstructions !== undefined, {
    message: 'Provide name and/or customInstructions',
  });
