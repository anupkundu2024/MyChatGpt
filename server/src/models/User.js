import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Excluded from queries by default; use .select('+passwordHash') when verifying a login.
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, trim: true },
    // Added to the system prompt of every chat (Settings → Personalization).
    customInstructions: { type: String, trim: true, maxlength: 4000, default: '' },
    // Embedded in every JWT; incrementing it revokes all of this user's tokens.
    tokenVersion: { type: Number, default: 0, select: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.tokenVersion;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const User = mongoose.model('User', userSchema);
