import { Router } from 'express';
import { getSession, login, logout, register } from '../controllers/authController.js';
import validate from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { loginBody, registerBody } from '../validators/schemas.js';

const router = Router();

router.get('/session', getSession);
router.post('/register', authLimiter, validate({ body: registerBody }), register);
router.post('/login', authLimiter, validate({ body: loginBody }), login);
router.post('/logout', logout);

export default router;
