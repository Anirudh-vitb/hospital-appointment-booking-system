import { Router } from 'express';
import { publicSummary } from '../services/statsService.js';
import { HOSPITAL, BOOKING_RULES } from '../config/hospital.js';
import { ok } from '../utils/respond.js';

const router = Router();

router.get('/summary', async (req, res) => {
  ok(res, { hospital: HOSPITAL, bookingRules: BOOKING_RULES, counts: await publicSummary() });
});

export default router;
