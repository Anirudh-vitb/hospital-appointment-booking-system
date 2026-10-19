import { z } from 'zod';
import { BOOKING_RULES } from '../config/hospital.js';
import { ROLES } from '../models/User.js';
import { STATUSES } from '../models/Appointment.js';

// Server-side validation rules. The React forms validate the same fields for
// a quicker response, but these schemas are the ones that actually protect
// the database.

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use the 24-hour format HH:mm');
const trimmed = (min, max, label) =>
  z.string().trim().min(min, `${label} must be at least ${min} characters`).max(max, `${label} must be at most ${max} characters`);
const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');
const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));
const page = z.coerce.number().int().min(1).optional();
const limit = z.coerce.number().int().min(1).max(50).optional();

export const idParam = z.object({ id: objectId });

export const registerBody = z.object({
  name: trimmed(2, 80, 'Name'),
  email,
  phone,
  password,
});

export const loginBody = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(72),
});

export const profileBody = z.object({
  name: trimmed(2, 80, 'Name').optional(),
  phone: phone.optional(),
  patientProfile: z
    .object({
      dateOfBirth: isoDate.nullable().optional(),
      gender: z.enum(['female', 'male', 'other', 'prefer_not_to_say']).nullable().optional(),
      address: z.string().trim().max(200).optional(),
      emergencyContact: z.string().trim().max(100).optional(),
    })
    .optional(),
});

export const passwordBody = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: password,
});

export const departmentBody = z.object({
  name: trimmed(2, 60, 'Name'),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens').optional(),
  description: z.string().trim().max(400).optional(),
  icon: z.string().trim().max(40).optional(),
  floor: z.string().trim().max(40).optional(),
  isActive: z.boolean().optional(),
});

const scheduleBlock = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  start: hhmm,
  end: hhmm,
});

export const scheduleBody = z.object({
  slotMinutes: z
    .number()
    .int()
    .refine((n) => BOOKING_RULES.allowedSlotMinutes.includes(n), 'Choose one of the allowed slot lengths'),
  weeklySchedule: z.array(scheduleBlock).max(21),
});

const doctorFields = {
  department: objectId,
  specialty: trimmed(2, 80, 'Specialty'),
  qualifications: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
  experienceYears: z.number().int().min(0).max(60),
  consultationFee: z.number().int().min(0).max(10000),
  bio: z.string().trim().max(800).optional(),
  languages: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
  room: z.string().trim().max(40).optional(),
  gender: z.enum(['female', 'male', 'other']).optional(),
  slotMinutes: scheduleBody.shape.slotMinutes.optional(),
  weeklySchedule: scheduleBody.shape.weeklySchedule.optional(),
  isFeatured: z.boolean().optional(),
};

export const createDoctorBody = z.object({
  name: trimmed(2, 80, 'Name'),
  email,
  phone: phone.optional(),
  password,
  ...doctorFields,
});

export const updateDoctorBody = z
  .object({ name: trimmed(2, 80, 'Name'), phone, ...doctorFields })
  .partial();

export const doctorStatusBody = z.object({ isActive: z.boolean() });

export const doctorListQuery = z.object({
  q: z.string().trim().max(60).optional(),
  department: z.string().trim().max(60).optional(),
  specialty: z.string().trim().max(80).optional(),
  availableOn: isoDate.optional(),
  sort: z.enum(['name', 'experience', 'fee']).optional(),
  includeInactive: z.enum(['true', 'false']).optional(),
  page,
  limit,
});

export const slotsQuery = z.object({ date: isoDate });

export const exceptionBody = z
  .object({
    date: isoDate,
    start: hhmm.optional(),
    end: hhmm.optional(),
    reason: z.string().trim().max(120).optional(),
  })
  .refine((v) => (v.start && v.end) || (!v.start && !v.end), 'Give both a start and end time, or neither to block the whole day')
  .refine((v) => !v.start || v.start < v.end, 'The end time must be after the start time');

export const bookingBody = z.object({
  doctorId: objectId,
  date: isoDate,
  startTime: hhmm,
  reason: trimmed(3, 300, 'Reason'),
});

export const myAppointmentsQuery = z.object({
  scope: z.enum(['upcoming', 'past', 'all']).optional(),
  status: z.enum(STATUSES).optional(),
  page,
  limit,
});

export const doctorAppointmentsQuery = z.object({
  scope: z.enum(['today', 'upcoming', 'past', 'all']).optional(),
  date: isoDate.optional(),
  status: z.enum(STATUSES).optional(),
  page,
  limit,
});

export const adminAppointmentsQuery = z.object({
  q: z.string().trim().max(40).optional(),
  status: z.enum(STATUSES).optional(),
  doctor: objectId.optional(),
  department: objectId.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  sort: z.enum(['date_asc', 'date_desc', 'created_desc']).optional(),
  page,
  limit,
});

export const statusBody = z.object({
  action: z.enum(['confirm', 'reject', 'complete', 'cancel']),
  note: z.string().trim().max(300).optional(),
});

export const cancelBody = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const notesBody = z.object({
  doctorNotes: z.string().trim().max(1000),
});

export const auditQuery = z.object({
  action: z.string().trim().max(60).optional(),
  role: z.enum([...ROLES, 'system']).optional(),
  page,
  limit,
});
