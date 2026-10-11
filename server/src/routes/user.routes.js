import { Router } from 'express';
import { updateMe } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { updateMeSchema } from '../validators/user.validators.js';

const router = Router();

router.patch('/me', requireAuth, validate({ body: updateMeSchema }), updateMe);

export default router;
