import { AI_MODELS, DEFAULT_AI_MODEL } from '../config/aiModels.js';
import { Conversation, Message } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

// Conversations saved with a model that's no longer allowed (e.g. after switching provider)
// would fail schema validation on their next save; move them to the default. Idempotent.
export async function migrateConversationModels() {
  const { modifiedCount } = await Conversation.updateMany(
    { model: { $nin: AI_MODELS } },
    { $set: { model: DEFAULT_AI_MODEL } },
    { timestamps: false },
  );
  if (modifiedCount) console.log(`[db] Moved ${modifiedCount} conversation(s) to ${DEFAULT_AI_MODEL}`);
}

// The single ownership check every conversation route goes through.
// Answers 404 (not 403) so other users' conversation ids aren't revealed.
export async function getOwnedConversation(userId, conversationId) {
  const conversation = await Conversation.findOne({ _id: conversationId, userId });
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  return conversation;
}

export const listConversations = (userId) =>
  Conversation.find({ userId }).sort({ pinned: -1, updatedAt: -1 });

export const createConversation = (userId, data) => Conversation.create({ ...data, userId });

// Renaming, pinning or switching model doesn't count as activity, so updatedAt
// (the sidebar's "recent" order) is left alone.
export async function updateConversation(userId, conversationId, changes) {
  const conversation = await getOwnedConversation(userId, conversationId);
  conversation.set(changes);
  return conversation.save({ timestamps: false });
}

export async function deleteConversation(userId, conversationId) {
  const conversation = await Conversation.findOneAndDelete({ _id: conversationId, userId });
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  await Message.deleteMany({ conversationId: conversation._id });
}

export async function listMessages(userId, conversationId) {
  const conversation = await getOwnedConversation(userId, conversationId);
  return Message.find({ conversationId: conversation._id }).sort({ createdAt: 1, _id: 1 });
}

// Thumbs up/down on an assistant message; null clears it.
export async function setMessageFeedback(userId, conversationId, messageId, feedback) {
  const conversation = await getOwnedConversation(userId, conversationId);
  const message = await Message.findOne({ _id: messageId, conversationId: conversation._id, role: 'assistant' });
  if (!message) throw new ApiError(404, 'Message not found');
  message.feedback = feedback ?? undefined;
  return message.save({ timestamps: false });
}
