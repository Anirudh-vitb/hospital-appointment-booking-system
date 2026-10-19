import { Router } from 'express';
import {
  cancelAppointment,
  createAppointment,
  getAppointment,
  getDoctorSummary,
  listDoctorAppointments,
  listMyAppointments,
  updateAppointmentStatus,
  updateDoctorNotes,
} from '../controllers/appointmentController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { bookingLimiter } from '../middleware/rateLimiters.js';
import {
  bookingBody,
  cancelBody,
  doctorAppointmentsQuery,
  idParam,
  myAppointmentsQuery,
  notesBody,
  statusBody,
} from '../validators/schemas.js';

const router = Router();

router.use(requireAuth);

// Patient
router.post('/', requireRole('patient'), bookingLimiter, validate({ body: bookingBody }), createAppointment);
router.get('/mine', requireRole('patient'), validate({ query: myAppointmentsQuery }), listMyAppointments);

// Doctor (must come before "/:id" so "doctor" is not read as an id)
router.get('/doctor', requireRole('doctor'), validate({ query: doctorAppointmentsQuery }), listDoctorAppointments);
router.get('/doctor/summary', requireRole('doctor'), getDoctorSummary);

// Shared — ownership is checked inside the controller
router.get('/:id', validate({ params: idParam }), getAppointment);
router.patch('/:id/cancel', validate({ params: idParam, body: cancelBody }), cancelAppointment);
router.patch('/:id/status', requireRole('doctor', 'admin'), validate({ params: idParam, body: statusBody }), updateAppointmentStatus);
router.patch('/:id/notes', requireRole('doctor'), validate({ params: idParam, body: notesBody }), updateDoctorNotes);

export default router;
