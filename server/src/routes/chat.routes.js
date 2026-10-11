import { Router } from 'express';
import { editMessage, regenerate, sendMessage } from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { chatMessageSchema, chatParams, editParams } from '../validators/chat.validators.js';

const router = Router();

router.use(requireAuth, chatLimiter);

router.post('/:conversationId', validate({ params: chatParams, body: chatMessageSchema }), sendMessage);
router.post('/:conversationId/regenerate', validate({ params: chatParams }), regenerate);
router.post(
  '/:conversationId/edit/:messageId',
  validate({ params: editParams, body: chatMessageSchema }),
  editMessage,
);

export default router;
