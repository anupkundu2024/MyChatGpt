import * as conversationService from '../services/conversation.service.js';

export async function list(req, res) {
  const conversations = await conversationService.listConversations(req.user._id);
  res.json({ conversations });
}

export async function create(req, res) {
  const conversation = await conversationService.createConversation(
    req.user._id,
    req.validated.body,
  );
  res.status(201).json({ conversation });
}

export async function update(req, res) {
  const conversation = await conversationService.updateConversation(
    req.user._id,
    req.validated.params.id,
    req.validated.body,
  );
  res.json({ conversation });
}

export async function remove(req, res) {
  await conversationService.deleteConversation(req.user._id, req.validated.params.id);
  res.status(204).end();
}

export async function setFeedback(req, res) {
  const { id, messageId } = req.validated.params;
  const message = await conversationService.setMessageFeedback(
    req.user._id,
    id,
    messageId,
    req.validated.body.feedback,
  );
  res.json({ message });
}

export async function listMessages(req, res) {
  const messages = await conversationService.listMessages(req.user._id, req.validated.params.id);
  res.json({ messages });
}
