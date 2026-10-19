import { Router } from 'express';
import {
  addMyException,
  getMyAvailability,
  listMyExceptions,
  removeMyException,
  updateMySchedule,
} from '../controllers/availabilityController.js';
import { requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { exceptionBody, idParam, scheduleBody } from '../validators/schemas.js';

const router = Router();

router.use(requireRole('doctor'));
router.get('/me', getMyAvailability);
router.put('/me/schedule', validate({ body: scheduleBody }), updateMySchedule);
router.get('/me/exceptions', listMyExceptions);
router.post('/me/exceptions', validate({ body: exceptionBody }), addMyException);
router.delete('/me/exceptions/:id', validate({ params: idParam }), removeMyException);

export default router;
