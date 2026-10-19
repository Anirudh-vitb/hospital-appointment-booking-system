import Appointment from '../models/Appointment.js';
import DoctorProfile from '../models/DoctorProfile.js';
import { BOOKING_RULES } from '../config/hospital.js';
import ApiError from '../utils/ApiError.js';
import { makeReference } from '../utils/reference.js';
import { nowInZone, toInstant } from '../utils/time.js';
import { getDaySlots } from './availabilityService.js';

const UNAVAILABLE_MESSAGES = {
  booked: 'This time was just booked by someone else. Refresh the available times and pick another slot.',
  blocked: 'The doctor is not available at this time. Refresh the available times and pick another slot.',
  past: 'This time is too close to now or has already passed. Choose a later slot.',
};

// Creates a booking. Availability is recalculated here on the server even
// though the patient picked from a list, because that list may be stale.
export async function bookAppointment({ patient, doctorId, date, startTime, reason }) {
  const doctor = await DoctorProfile.findOne({ _id: doctorId, isActive: true });
  if (!doctor) throw ApiError.notFound('This doctor is not accepting appointments.');

  const day = await getDaySlots(doctor, date);
  const slot = day.slots.find((s) => s.start === startTime);
  if (!slot) {
    throw new ApiError(400, 'SLOT_INVALID', `${startTime} is not one of ${doctor.displayName}'s consultation times on ${date}.`);
  }
  if (slot.status !== 'available') {
    throw ApiError.conflict('SLOT_UNAVAILABLE', UNAVAILABLE_MESSAGES[slot.status]);
  }

  const base = {
    patient: patient._id,
    doctor: doctor._id,
    department: doctor.department,
    date,
    startTime: slot.start,
    endTime: slot.end,
    startsAt: toInstant(date, slot.start).toJSDate(),
    endsAt: toInstant(date, slot.end).toJSDate(),
    reason,
    fee: doctor.consultationFee,
    status: 'pending',
    history: [{ status: 'pending', byRole: 'patient', by: patient._id, note: 'Booked online' }],
  };

  // Two patients can pass the check above at the same moment. The partial
  // unique index on { doctor, startsAt } lets only one insert succeed; the
  // other gets duplicate-key error 11000, reported as "slot taken".
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await Appointment.create({ ...base, reference: makeReference(date) });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      const key = Object.keys(error.keyPattern || {});
      if (key.includes('reference')) continue; // astronomically rare; retry with a new reference
      if (key.includes('patient')) {
        throw ApiError.conflict('PATIENT_TIME_CONFLICT', 'You already have an appointment that starts at this time.');
      }
      throw ApiError.conflict('SLOT_TAKEN', UNAVAILABLE_MESSAGES.booked);
    }
  }
  throw new ApiError(500, 'REFERENCE_FAILED', 'Could not generate a booking reference. Please try again.');
}

// Allowed status changes. Anything not listed here is rejected.
export const TRANSITIONS = {
  confirm: { from: ['pending'], to: 'confirmed', roles: ['doctor', 'admin'] },
  reject: { from: ['pending'], to: 'rejected', roles: ['doctor', 'admin'], needsNote: ['doctor', 'admin'] },
  complete: { from: ['confirmed'], to: 'completed', roles: ['doctor', 'admin'] },
  cancel: { from: ['pending', 'confirmed'], to: 'cancelled', roles: ['patient', 'doctor', 'admin'], needsNote: ['doctor', 'admin'] },
};

// Ownership check shared by every appointment endpoint. A patient sees only
// their own bookings and a doctor only bookings made with them.
export async function assertCanAccess(appointment, user) {
  if (user.role === 'admin') return;
  if (user.role === 'patient' && appointment.patient._id.equals(user._id)) return;
  if (user.role === 'doctor') {
    const doctor = await DoctorProfile.findOne({ user: user._id }, '_id');
    if (doctor && appointment.doctor._id.equals(doctor._id)) return;
  }
  // 404 rather than 403 so an attacker cannot probe which ids exist.
  throw ApiError.notFound('Appointment not found.');
}

export function checkTransition(appointment, action, role, note, now = nowInZone()) {
  const rule = TRANSITIONS[action];
  if (!rule) throw ApiError.badRequest(`Unknown action "${action}".`);
  if (!rule.roles.includes(role)) throw ApiError.forbidden(`A ${role} cannot ${action} an appointment.`);
  if (!rule.from.includes(appointment.status)) {
    throw ApiError.conflict('INVALID_TRANSITION', `A ${appointment.status} appointment cannot be changed to ${rule.to}.`);
  }
  if (rule.needsNote?.includes(role) && !note) {
    throw ApiError.badRequest('Please give a reason. The patient will see it.');
  }

  const startsAt = appointment.startsAt.getTime();
  if (action === 'complete' && startsAt > now.toMillis()) {
    throw ApiError.conflict('TOO_EARLY', 'An appointment can be marked completed only after its start time.');
  }
  if (action === 'cancel' && role === 'patient') {
    const minutesLeft = (startsAt - now.toMillis()) / 60000;
    if (minutesLeft < BOOKING_RULES.patientCancelCutoffMinutes) {
      throw ApiError.conflict(
        'CANCEL_WINDOW_CLOSED',
        `Online cancellation closes ${BOOKING_RULES.patientCancelCutoffMinutes / 60} hours before the appointment. Please call the hospital desk.`,
      );
    }
  }
  return rule;
}

export async function changeStatus(appointment, { action, user, note }) {
  const rule = checkTransition(appointment, action, user.role, note);
  const to = rule.to;

  // The status condition in the filter makes this an atomic compare-and-set:
  // if a doctor confirms while the patient cancels, only one update wins.
  const updated = await Appointment.findOneAndUpdate(
    { _id: appointment._id, status: { $in: rule.from } },
    {
      $set: { status: to, holdsSlot: ['pending', 'confirmed', 'completed'].includes(to), statusNote: note || undefined },
      $push: { history: { status: to, byRole: user.role, by: user._id, note: note || undefined, at: new Date() } },
    },
    { new: true },
  );
  if (!updated) {
    throw ApiError.conflict('STATUS_CHANGED', 'This appointment was updated by someone else. Reload to see its current status.');
  }
  return updated;
}
