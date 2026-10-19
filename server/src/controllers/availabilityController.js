import AvailabilityException from '../models/AvailabilityException.js';
import DoctorProfile from '../models/DoctorProfile.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/respond.js';
import { doctorView } from '../utils/serializers.js';
import { todayISO } from '../utils/time.js';
import { validateSchedule } from '../services/availabilityService.js';
import { audit } from '../services/auditService.js';

// Every handler here works on the signed-in doctor's own profile. The doctor
// id is looked up from the session user, never taken from the URL, so one
// doctor cannot edit another doctor's schedule.
async function myProfile(req) {
  const doctor = await DoctorProfile.findOne({ user: req.user._id }).populate('department');
  if (!doctor) throw ApiError.notFound('No doctor profile is linked to this account.');
  return doctor;
}

export async function getMyAvailability(req, res) {
  const doctor = await myProfile(req);
  ok(res, doctorView(doctor));
}

export async function updateMySchedule(req, res) {
  const doctor = await myProfile(req);
  const { slotMinutes, weeklySchedule } = req.valid.body;
  validateSchedule(weeklySchedule);
  doctor.slotMinutes = slotMinutes;
  doctor.weeklySchedule = weeklySchedule;
  await doctor.save();
  await audit(req, { action: 'schedule.update', entityType: 'DoctorProfile', entityId: doctor._id, summary: `${doctor.displayName} updated weekly hours` });
  ok(res, doctorView(doctor));
}

export async function listMyExceptions(req, res) {
  const doctor = await myProfile(req);
  const exceptions = await AvailabilityException.find({ doctor: doctor._id, date: { $gte: todayISO() } })
    .sort({ date: 1, start: 1 })
    .limit(100)
    .lean();
  ok(res, exceptions.map(({ _id, date, start, end, reason }) => ({ id: _id.toString(), date, start, end, reason })));
}

export async function addMyException(req, res) {
  const doctor = await myProfile(req);
  const { date, start, end, reason } = req.valid.body;
  if (date < todayISO()) throw ApiError.badRequest('You can only block today or a future date.');
  const exception = await AvailabilityException.create({ doctor: doctor._id, date, start, end, reason, createdBy: req.user._id });
  await audit(req, {
    action: 'schedule.block',
    entityType: 'AvailabilityException',
    entityId: exception._id,
    summary: `${doctor.displayName} blocked ${date}${start ? ` ${start}–${end}` : ' (whole day)'}`,
  });
  created(res, { id: exception._id.toString(), date, start, end, reason });
}

export async function removeMyException(req, res) {
  const doctor = await myProfile(req);
  const removed = await AvailabilityException.findOneAndDelete({ _id: req.valid.params.id, doctor: doctor._id });
  if (!removed) throw ApiError.notFound('Blocked time not found.');
  await audit(req, { action: 'schedule.unblock', entityType: 'AvailabilityException', entityId: removed._id, summary: `${doctor.displayName} unblocked ${removed.date}` });
  ok(res, { removed: true });
}
