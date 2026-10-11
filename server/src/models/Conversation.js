import mongoose from 'mongoose';
import { AI_MODELS, DEFAULT_AI_MODEL } from '../config/aiModels.js';

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New chat', trim: true, maxlength: 200 },
    model: { type: String, enum: AI_MODELS, default: DEFAULT_AI_MODEL },
    systemPrompt: { type: String, trim: true, maxlength: 10_000 },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Sidebar query: a user's conversations, pinned first, most recently active first.
conversationSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
