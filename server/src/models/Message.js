import mongoose from 'mongoose';

export const MESSAGE_ROLES = ['user', 'assistant'];
export const FEEDBACK_VALUES = ['up', 'down'];

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number, min: 0 },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    role: { type: String, enum: MESSAGE_ROLES, required: true },
    content: { type: String, required: true },
    tokens: { type: Number, min: 0 },
    // Left unset (not []) when a message has no attachments.
    attachments: { type: [attachmentSchema], default: undefined },
    // Thumbs up/down on an assistant message; unset when the user hasn't rated it.
    feedback: { type: String, enum: FEEDBACK_VALUES },
  },
  { timestamps: true },
);

// Indexes conversationId and serves "messages of a conversation in order".
messageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
