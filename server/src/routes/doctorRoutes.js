import { Router } from 'express';
import { featuredDoctors, getDoctor, getDoctorSlots, listDoctors, listSpecialties } from '../controllers/doctorController.js';
import validate from '../middleware/validate.js';
import { doctorListQuery, idParam, slotsQuery } from '../validators/schemas.js';

// Public doctor directory. None of these responses contain patient data.
const router = Router();

router.get('/', validate({ query: doctorListQuery }), listDoctors);
router.get('/featured', featuredDoctors);
router.get('/specialties', listSpecialties);
router.get('/:id', validate({ params: idParam }), getDoctor);
router.get('/:id/slots', validate({ params: idParam, query: slotsQuery }), getDoctorSlots);

export default router;
