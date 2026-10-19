// Repeatable seed: departments, doctors and demo patients are upserted by
// slug/email, and only documents marked isSample are deleted and recreated.
// Running it twice leaves the database in the same state; real bookings made
// through the app are never touched.
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import Appointment from '../src/models/Appointment.js';
import AvailabilityException from '../src/models/AvailabilityException.js';
import Department from '../src/models/Department.js';
import DoctorProfile from '../src/models/DoctorProfile.js';
import User from '../src/models/User.js';
import { buildSlots } from '../src/services/availabilityService.js';
import { makeReference } from '../src/utils/reference.js';
import { dayOfWeek, hhmmOf, nowInZone, toInstant } from '../src/utils/time.js';
import { departments, doctors, samplePatients, sampleReasons } from './seedData.js';

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'CarePoint@2026';

async function upsertUser({ email, password, ...fields }) {
  let user = await User.findOne({ email });
  if (!user) user = new User({ email });
  Object.assign(user, fields, { isActive: true });
  await user.setPassword(password);
  await user.save();
  return user;
}

function nextWorkingDates(doctor, from, count, direction = 1) {
  const dates = [];
  let cursor = from;
  for (let i = 0; i < 40 && dates.length < count; i += 1) {
    cursor = cursor.plus({ days: direction });
    if (doctor.workingDays.includes(dayOfWeek(cursor))) dates.push(cursor);
  }
  return dates;
}

export async function seed({ log = console.log } = {}) {
  await connectDB();
  await Promise.all([User.init(), Department.init(), DoctorProfile.init(), Appointment.init(), AvailabilityException.init()]);
  log(`[seed] database: ${mongoose.connection.name} on ${mongoose.connection.host}`);

  const deptBySlug = {};
  for (const dept of departments) {
    deptBySlug[dept.slug] = await Department.findOneAndUpdate({ slug: dept.slug }, { ...dept, isActive: true }, { upsert: true, new: true });
  }
  log(`[seed] ${departments.length} departments`);

  const doctorProfiles = [];
  for (const { name, email, department, ...profile } of doctors) {
    const user = await upsertUser({ name, email, role: 'doctor', password: DEMO_PASSWORD });
    let doc = await DoctorProfile.findOne({ user: user._id });
    if (!doc) doc = new DoctorProfile({ user: user._id });
    Object.assign(doc, profile, { displayName: `Dr. ${name}`, department: deptBySlug[department]._id, isActive: true });
    await doc.save();
    doctorProfiles.push(doc);
  }
  log(`[seed] ${doctorProfiles.length} doctors`);

  const patients = [];
  for (const patient of samplePatients) {
    patients.push(await upsertUser({ ...patient, role: 'patient', password: DEMO_PASSWORD }));
  }
  log(`[seed] ${patients.length} sample patients`);

  if (env.isTest) return { departments: deptBySlug, doctors: doctorProfiles, patients };

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await upsertUser({ name: 'CarePoint Administrator', email: process.env.ADMIN_EMAIL.toLowerCase(), role: 'admin', password: process.env.ADMIN_PASSWORD });
    log(`[seed] administrator ${process.env.ADMIN_EMAIL}`);
  } else {
    log('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — no administrator created (run npm run create-admin later)');
  }

  // Sample appointments are regenerated around today's date so the demo
  // always has upcoming and past bookings.
  await Appointment.deleteMany({ isSample: true });
  await AvailabilityException.deleteMany({ reason: /\(sample\)$/ });
  const today = nowInZone().startOf('day');
  const statusesPast = ['completed', 'completed', 'cancelled', 'completed'];
  const statusesFuture = ['confirmed', 'pending', 'confirmed'];
  let created = 0;

  for (const [index, doctor] of doctorProfiles.entries()) {
    const plan = [
      ...nextWorkingDates(doctor, today, 2, -1).map((d, i) => ({ day: d, status: statusesPast[(index + i) % statusesPast.length] })),
      ...nextWorkingDates(doctor, today.minus({ days: 1 }), 2, 1).map((d, i) => ({ day: d, status: statusesFuture[(index + i) % statusesFuture.length] })),
    ];
    for (const [i, { day, status }] of plan.entries()) {
      const blocks = doctor.weeklySchedule.filter((b) => b.dayOfWeek === dayOfWeek(day));
      const slots = buildSlots(blocks, doctor.slotMinutes);
      // Late-in-the-day slots keep today's sample bookings in the future.
      const slot = slots[Math.min(slots.length - 1, 3 + ((index + i) % 4) * 2)];
      const date = day.toISODate();
      const patient = patients[(index + i) % patients.length];
      const startsAt = toInstant(date, hhmmOf(slot.start));
      const finalStatus = startsAt < nowInZone() && status !== 'cancelled' ? 'completed' : startsAt > nowInZone() && status === 'completed' ? 'confirmed' : status;
      const history = [{ status: 'pending', byRole: 'patient', by: patient._id, note: 'Sample booking', at: startsAt.minus({ days: 3 }).toJSDate() }];
      if (finalStatus !== 'pending') {
        history.push({
          status: finalStatus === 'completed' ? 'confirmed' : finalStatus,
          byRole: finalStatus === 'cancelled' ? 'patient' : 'doctor',
          at: startsAt.minus({ days: 2 }).toJSDate(),
        });
      }
      if (finalStatus === 'completed') history.push({ status: 'completed', byRole: 'doctor', at: startsAt.plus({ minutes: doctor.slotMinutes }).toJSDate() });

      try {
        await Appointment.create({
          reference: makeReference(date),
          patient: patient._id,
          doctor: doctor._id,
          department: doctor.department,
          date,
          startTime: hhmmOf(slot.start),
          endTime: hhmmOf(slot.end),
          startsAt: startsAt.toJSDate(),
          endsAt: toInstant(date, hhmmOf(slot.end)).toJSDate(),
          reason: sampleReasons[(index + i) % sampleReasons.length],
          fee: doctor.consultationFee,
          status: finalStatus,
          statusNote: finalStatus === 'cancelled' ? 'Patient travelling (sample)' : undefined,
          history,
          isSample: true,
        });
        created += 1;
      } catch (error) {
        // Slot already taken by a real booking made through the app — skip it.
        if (error?.code !== 11000) throw error;
      }
    }
  }
  log(`[seed] ${created} sample appointments`);

  const leaveDoctor = doctorProfiles[3];
  const [leaveDay] = nextWorkingDates(leaveDoctor, today.plus({ days: 5 }), 1, 1);
  await AvailabilityException.create({ doctor: leaveDoctor._id, date: leaveDay.toISODate(), reason: 'Conference leave (sample)' });
  log('[seed] 1 sample leave day');

  return { departments: deptBySlug, doctors: doctorProfiles, patients };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => console.log('[seed] done'))
    .catch((error) => {
      console.error('[seed] failed:', error);
      process.exitCode = 1;
    })
    .finally(() => disconnectDB());
}
