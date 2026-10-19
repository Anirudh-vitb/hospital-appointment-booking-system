import Appointment from '../models/Appointment.js';
import DoctorProfile from '../models/DoctorProfile.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/respond.js';
import { pageMeta, paginate } from '../utils/query.js';
import { appointmentView } from '../utils/serializers.js';
import { todayISO } from '../utils/time.js';
import { assertCanAccess, bookAppointment, changeStatus } from '../services/appointmentService.js';
import { doctorSummary } from '../services/statsService.js';
import { audit } from '../services/auditService.js';

const POPULATE = [
  { path: 'doctor', select: 'displayName specialty room' },
  { path: 'department', select: 'name slug icon floor isActive' },
  { path: 'patient', select: 'name phone email patientProfile' },
];

async function loadAppointment(id, user) {
  const appointment = await Appointment.findById(id).populate(POPULATE);
  if (!appointment) throw ApiError.notFound('Appointment not found.');
  await assertCanAccess(appointment, user);
  return appointment;
}

async function myDoctorId(user) {
  const doctor = await DoctorProfile.findOne({ user: user._id }, '_id');
  if (!doctor) throw ApiError.notFound('No doctor profile is linked to this account.');
  return doctor._id;
}

export async function createAppointment(req, res) {
  const appointment = await bookAppointment({ patient: req.user, ...req.valid.body });
  await appointment.populate(POPULATE);
  await audit(req, {
    action: 'appointment.book',
    entityType: 'Appointment',
    entityId: appointment._id,
    summary: `${appointment.reference} with ${appointment.doctor.displayName} on ${appointment.date} ${appointment.startTime}`,
  });
  created(res, appointmentView(appointment, 'patient'));
}

export async function listMyAppointments(req, res) {
  const { scope = 'upcoming', status } = req.valid.query;
  const pg = paginate(req.valid.query);
  const now = new Date();
  const filter = { patient: req.user._id };
  if (status) filter.status = status;

  // "Upcoming" means a future visit that is still going ahead; everything
  // else (past dates, cancelled, rejected, completed) is history.
  if (scope === 'upcoming') {
    filter.startsAt = { $gte: now };
    filter.status = status && ['pending', 'confirmed'].includes(status) ? status : { $in: ['pending', 'confirmed'] };
  } else if (scope === 'past') {
    filter.$or = [{ startsAt: { $lt: now } }, { status: { $in: ['cancelled', 'rejected', 'completed'] } }];
  }

  const sort = scope === 'upcoming' ? { startsAt: 1 } : { startsAt: -1 };
  const [items, total] = await Promise.all([
    Appointment.find(filter).populate(POPULATE).sort(sort).skip(pg.skip).limit(pg.limit),
    Appointment.countDocuments(filter),
  ]);
  ok(res, items.map((a) => appointmentView(a, 'patient')), pageMeta(pg, total));
}

export async function getAppointment(req, res) {
  const appointment = await loadAppointment(req.valid.params.id, req.user);
  ok(res, appointmentView(appointment, req.user.role));
}

export async function cancelAppointment(req, res) {
  const appointment = await loadAppointment(req.valid.params.id, req.user);
  const updated = await changeStatus(appointment, { action: 'cancel', user: req.user, note: req.valid.body.reason });
  await updated.populate(POPULATE);
  await audit(req, { action: 'appointment.cancel', entityType: 'Appointment', entityId: updated._id, summary: `${updated.reference} cancelled by ${req.user.role}` });
  ok(res, appointmentView(updated, req.user.role));
}

export async function updateAppointmentStatus(req, res) {
  const appointment = await loadAppointment(req.valid.params.id, req.user);
  const { action, note } = req.valid.body;
  const updated = await changeStatus(appointment, { action, user: req.user, note });
  await updated.populate(POPULATE);
  await audit(req, {
    action: `appointment.${action}`,
    entityType: 'Appointment',
    entityId: updated._id,
    summary: `${updated.reference} → ${updated.status} by ${req.user.role}${req.user.role === 'admin' ? ' (admin override)' : ''}`,
  });
  ok(res, appointmentView(updated, req.user.role));
}

export async function updateDoctorNotes(req, res) {
  const appointment = await loadAppointment(req.valid.params.id, req.user);
  appointment.doctorNotes = req.valid.body.doctorNotes;
  await appointment.save();
  ok(res, appointmentView(appointment, req.user.role));
}

export async function listDoctorAppointments(req, res) {
  const { scope = 'upcoming', date, status } = req.valid.query;
  const pg = paginate(req.valid.query, { defaultLimit: 20 });
  const filter = { doctor: await myDoctorId(req.user) };
  const now = new Date();
  if (status) filter.status = status;

  if (date) filter.date = date;
  else if (scope === 'today') filter.date = todayISO();
  else if (scope === 'upcoming') filter.startsAt = { $gte: now };
  else if (scope === 'past') filter.startsAt = { $lt: now };

  const sort = scope === 'past' ? { startsAt: -1 } : { startsAt: 1 };
  const [items, total] = await Promise.all([
    Appointment.find(filter).populate(POPULATE).sort(sort).skip(pg.skip).limit(pg.limit),
    Appointment.countDocuments(filter),
  ]);
  ok(res, items.map((a) => appointmentView(a, 'doctor')), pageMeta(pg, total));
}

export async function getDoctorSummary(req, res) {
  ok(res, await doctorSummary(await myDoctorId(req.user)));
}
