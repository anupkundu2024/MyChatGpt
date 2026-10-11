import { Router } from 'express';
import * as conversations from '../controllers/conversation.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  conversationIdParams,
  createConversationSchema,
  feedbackSchema,
  messageParams,
  updateConversationSchema,
} from '../validators/conversation.validators.js';

const router = Router();

router.use(requireAuth);

router.get('/', conversations.list);
router.post('/', validate({ body: createConversationSchema }), conversations.create);
router.patch(
  '/:id',
  validate({ params: conversationIdParams, body: updateConversationSchema }),
  conversations.update,
);
router.delete('/:id', validate({ params: conversationIdParams }), conversations.remove);
router.get('/:id/messages', validate({ params: conversationIdParams }), conversations.listMessages);
router.patch(
  '/:id/messages/:messageId/feedback',
  validate({ params: messageParams, body: feedbackSchema }),
  conversations.setFeedback,
);

export default router;
