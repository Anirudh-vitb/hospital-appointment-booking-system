import { Router } from 'express';
import {
  createDoctor,
  getStats,
  listAppointments,
  listAuditLogs,
  setDoctorStatus,
  updateDoctor,
} from '../controllers/adminController.js';
import { listDoctors } from '../controllers/doctorController.js';
import { requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  adminAppointmentsQuery,
  auditQuery,
  createDoctorBody,
  doctorListQuery,
  doctorStatusBody,
  idParam,
  updateDoctorBody,
} from '../validators/schemas.js';

const router = Router();

// Every route below requires an administrator session.
router.use(requireRole('admin'));

router.get('/stats', getStats);
router.get('/doctors', validate({ query: doctorListQuery }), listDoctors);
router.post('/doctors', validate({ body: createDoctorBody }), createDoctor);
router.patch('/doctors/:id', validate({ params: idParam, body: updateDoctorBody }), updateDoctor);
router.patch('/doctors/:id/status', validate({ params: idParam, body: doctorStatusBody }), setDoctorStatus);
router.get('/appointments', validate({ query: adminAppointmentsQuery }), listAppointments);
router.get('/audit-logs', validate({ query: auditQuery }), listAuditLogs);

export default router;
