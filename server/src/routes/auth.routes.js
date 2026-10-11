import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { credentialsLimiter, sessionLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.validators.js';

const router = Router();

router.post('/register', credentialsLimiter, validate({ body: registerSchema }), auth.register);
router.post('/login', credentialsLimiter, validate({ body: loginSchema }), auth.login);
router.post('/refresh', sessionLimiter, auth.refresh);
router.post('/logout', sessionLimiter, auth.logout);
router.get('/me', sessionLimiter, requireAuth, auth.me);

export default router;
