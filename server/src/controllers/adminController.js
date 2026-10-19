import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import AuditLog from '../models/AuditLog.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Department from '../models/Department.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/respond.js';
import { escapeRegex, pageMeta, paginate } from '../utils/query.js';
import { appointmentView, doctorView } from '../utils/serializers.js';
import { adminOverview } from '../services/statsService.js';
import { validateSchedule } from '../services/availabilityService.js';
import { audit } from '../services/auditService.js';

const withDrPrefix = (name) => (/^dr\.?\s/i.test(name) ? name : `Dr. ${name}`);

export async function getStats(req, res) {
  ok(res, await adminOverview());
}

async function assertDepartment(id) {
  const department = await Department.findOne({ _id: id, isActive: true });
  if (!department) throw ApiError.badRequest('Choose an active department.', [{ field: 'department', message: 'Choose an active department' }]);
}

// Doctor accounts are created only here, by an administrator. The User and
// DoctorProfile documents are written in one transaction so a failure can
// never leave a doctor login without a profile (or the reverse).
export async function createDoctor(req, res) {
  const { name, email, phone, password, ...profile } = req.valid.body;
  await assertDepartment(profile.department);
  if (profile.weeklySchedule) validateSchedule(profile.weeklySchedule);

  const session = await mongoose.startSession();
  let doctor;
  try {
    await session.withTransaction(async () => {
      const user = new User({ name, email, phone, role: 'doctor' });
      await user.setPassword(password);
      await user.save({ session });
      [doctor] = await DoctorProfile.create([{ ...profile, user: user._id, displayName: withDrPrefix(name) }], { session });
    });
  } catch (error) {
    if (error?.code === 11000) throw ApiError.conflict('EMAIL_TAKEN', 'An account with this email already exists.');
    throw error;
  } finally {
    await session.endSession();
  }

  await doctor.populate(['department', { path: 'user', select: 'email phone' }]);
  await audit(req, { action: 'doctor.create', entityType: 'DoctorProfile', entityId: doctor._id, summary: `Created ${doctor.displayName} (${email})` });
  created(res, doctorView(doctor, { includeAdmin: true }));
}

export async function updateDoctor(req, res) {
  const doctor = await DoctorProfile.findById(req.valid.params.id).populate('user');
  if (!doctor) throw ApiError.notFound('Doctor not found.');
  const { name, phone, ...profile } = req.valid.body;
  if (profile.department) await assertDepartment(profile.department);
  if (profile.weeklySchedule) validateSchedule(profile.weeklySchedule);

  if (name !== undefined) {
    doctor.user.name = name;
    doctor.displayName = withDrPrefix(name);
  }
  if (phone !== undefined) doctor.user.phone = phone;
  Object.assign(doctor, profile);
  await doctor.user.save();
  await doctor.save();
  await doctor.populate('department');
  await audit(req, { action: 'doctor.update', entityType: 'DoctorProfile', entityId: doctor._id, summary: `Updated ${doctor.displayName}` });
  ok(res, doctorView(doctor, { includeAdmin: true }));
}

// Deactivation instead of deletion: past appointments keep pointing at a
// valid doctor record, and the doctor can no longer sign in or be booked.
export async function setDoctorStatus(req, res) {
  const doctor = await DoctorProfile.findById(req.valid.params.id).populate('user');
  if (!doctor) throw ApiError.notFound('Doctor not found.');
  const { isActive } = req.valid.body;
  doctor.isActive = isActive;
  doctor.user.isActive = isActive;
  await doctor.user.save();
  await doctor.save();
  await doctor.populate('department');

  let openAppointments = 0;
  if (!isActive) {
    openAppointments = await Appointment.countDocuments({ doctor: doctor._id, status: { $in: ['pending', 'confirmed'] }, startsAt: { $gte: new Date() } });
  }
  await audit(req, {
    action: isActive ? 'doctor.activate' : 'doctor.deactivate',
    entityType: 'DoctorProfile',
    entityId: doctor._id,
    summary: `${isActive ? 'Activated' : 'Deactivated'} ${doctor.displayName}`,
  });
  ok(res, { doctor: doctorView(doctor, { includeAdmin: true }), openAppointments });
}

const ADMIN_SORTS = {
  date_asc: { startsAt: 1 },
  date_desc: { startsAt: -1 },
  created_desc: { createdAt: -1 },
};

export async function listAppointments(req, res) {
  const { q, status, doctor, department, from, to, sort } = req.valid.query;
  const pg = paginate(req.valid.query, { defaultLimit: 15 });
  const filter = {};
  if (status) filter.status = status;
  if (doctor) filter.doctor = doctor;
  if (department) filter.department = department;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  if (q) {
    // Search by booking reference, or by patient name/email.
    const pattern = new RegExp(escapeRegex(q), 'i');
    const patients = await User.find({ role: 'patient', $or: [{ name: pattern }, { email: pattern }] }, '_id').limit(200);
    filter.$or = [{ reference: pattern }, { patient: { $in: patients.map((p) => p._id) } }];
  }

  const [items, total] = await Promise.all([
    Appointment.find(filter)
      .populate([
        { path: 'doctor', select: 'displayName specialty room' },
        { path: 'department', select: 'name slug icon floor isActive' },
        { path: 'patient', select: 'name phone email patientProfile' },
      ])
      .sort(ADMIN_SORTS[sort] || ADMIN_SORTS.date_desc)
      .skip(pg.skip)
      .limit(pg.limit),
    Appointment.countDocuments(filter),
  ]);
  ok(res, items.map((a) => appointmentView(a, 'admin')), pageMeta(pg, total));
}

export async function listAuditLogs(req, res) {
  const { action, role } = req.valid.query;
  const pg = paginate(req.valid.query, { defaultLimit: 25 });
  const filter = {};
  if (action) filter.action = new RegExp(`^${escapeRegex(action)}`);
  if (role) filter.actorRole = role;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  ok(
    res,
    items.map((log) => ({
      id: log._id.toString(),
      actorName: log.actorName || 'System',
      actorRole: log.actorRole,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      summary: log.summary,
      ip: log.ip,
      createdAt: log.createdAt,
    })),
    pageMeta(pg, total),
  );
}
