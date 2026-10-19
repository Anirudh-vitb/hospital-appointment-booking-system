import { Router } from 'express';
import { changePassword, getProfile, updateProfile } from '../controllers/patientController.js';
import { requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { passwordBody, profileBody } from '../validators/schemas.js';

const router = Router();

router.use(requireRole('patient'));
router.get('/me', getProfile);
router.patch('/me', validate({ body: profileBody }), updateProfile);
router.put('/me/password', validate({ body: passwordBody }), changePassword);

export default router;
