import Department from '../models/Department.js';
import DoctorProfile from '../models/DoctorProfile.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/respond.js';
import { departmentView, doctorView } from '../utils/serializers.js';
import { departmentsWithDoctorCounts } from '../services/statsService.js';
import { audit } from '../services/auditService.js';

const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function listDepartments(req, res) {
  const includeInactive = req.user?.role === 'admin' && req.query.includeInactive === 'true';
  const departments = await departmentsWithDoctorCounts({ includeInactive });
  ok(res, departments.map(departmentView));
}

export async function getDepartment(req, res) {
  const department = await Department.findOne({ slug: req.params.slug, isActive: true });
  if (!department) throw ApiError.notFound('Department not found.');
  const doctors = await DoctorProfile.find({ department: department._id, isActive: true })
    .populate('department')
    .sort({ displayName: 1 })
    .limit(50);
  ok(res, { ...departmentView(department), doctors: doctors.map((d) => doctorView(d)) });
}

export async function createDepartment(req, res) {
  const body = req.valid.body;
  try {
    const department = await Department.create({ ...body, slug: body.slug || slugify(body.name) });
    await audit(req, { action: 'department.create', entityType: 'Department', entityId: department._id, summary: `Created department ${department.name}` });
    created(res, departmentView(department));
  } catch (error) {
    if (error?.code === 11000) throw ApiError.conflict('DEPARTMENT_EXISTS', 'A department with this name or slug already exists.');
    throw error;
  }
}

export async function updateDepartment(req, res) {
  const department = await Department.findById(req.valid.params.id);
  if (!department) throw ApiError.notFound('Department not found.');
  const body = req.valid.body;

  if (body.isActive === false && department.isActive) {
    const activeDoctors = await DoctorProfile.countDocuments({ department: department._id, isActive: true });
    if (activeDoctors > 0) {
      throw ApiError.conflict('DEPARTMENT_IN_USE', `Move or deactivate the ${activeDoctors} active doctor(s) in ${department.name} first.`);
    }
  }

  Object.assign(department, body);
  try {
    await department.save();
  } catch (error) {
    if (error?.code === 11000) throw ApiError.conflict('DEPARTMENT_EXISTS', 'A department with this name or slug already exists.');
    throw error;
  }
  await audit(req, { action: 'department.update', entityType: 'Department', entityId: department._id, summary: `Updated department ${department.name}` });
  ok(res, departmentView(department));
}
