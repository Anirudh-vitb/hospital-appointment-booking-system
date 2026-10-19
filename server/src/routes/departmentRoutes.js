import { Router } from 'express';
import { createDepartment, getDepartment, listDepartments, updateDepartment } from '../controllers/departmentController.js';
import { requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { departmentBody, idParam } from '../validators/schemas.js';

const router = Router();

router.get('/', listDepartments);
router.get('/:slug', getDepartment);
router.post('/', requireRole('admin'), validate({ body: departmentBody }), createDepartment);
router.patch('/:id', requireRole('admin'), validate({ params: idParam, body: departmentBody.partial() }), updateDepartment);

export default router;
