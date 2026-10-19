import { beforeAll, describe, expect, it } from 'vitest';
import Appointment from '../src/models/Appointment.js';
import { agentFor, app, newPatient, nextWorkingDate, request, seedBasics } from './helpers.js';

let data;
let doctor; // Dr. Lakshmi Narayana, works Mon–Sat 09:00–12:00 in 15-minute slots
let date;

beforeAll(async () => {
  data = await seedBasics();
  doctor = data.doctors.find((d) => d.displayName === 'Dr. Lakshmi Narayana');
  date = nextWorkingDate(doctor, 3);
});

const book = (who, body) => who.agent.post('/api/appointments').set('X-CSRF-Token', who.csrf).send(body);
const slotsFor = async (d = date) => (await request(app).get(`/api/doctors/${doctor._id}/slots?date=${d}`)).body.data.slots;

describe('booking', () => {
  it('books an available slot and returns a reference', async () => {
    const patient = await agentFor('patient@carepoint.example');
    const res = await book(patient, { doctorId: doctor._id.toString(), date, startTime: '09:00', reason: 'Fever for two days' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'pending', date, startTime: '09:00', endTime: '09:15', fee: 450 });
    expect(res.body.data.reference).toMatch(/^CP-\d{8}-[A-Z2-9]{5}$/);
    expect((await slotsFor()).find((s) => s.start === '09:00').status).toBe('booked');
  });

  it('refuses a second booking for the same slot', async () => {
    const other = await newPatient('second@test.example', '9100000001');
    const res = await book(other, { doctorId: doctor._id.toString(), date, startTime: '09:00', reason: 'Check-up' });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/Refresh the available times/);
  });

  it('lets only one of many simultaneous requests win the same slot', async () => {
    const patients = await Promise.all(
      [1, 2, 3, 4, 5].map((n) => newPatient(`race${n}@test.example`, `920000000${n}`)),
    );
    const results = await Promise.all(
      patients.map((p) => book(p, { doctorId: doctor._id.toString(), date, startTime: '10:00', reason: 'Race condition test' })),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    expect(await Appointment.countDocuments({ doctor: doctor._id, date, startTime: '10:00', holdsSlot: true })).toBe(1);
  });

  it('refuses a duplicate submission by the same patient', async () => {
    const patient = await newPatient('double@test.example', '9100000002');
    const body = { doctorId: doctor._id.toString(), date, startTime: '10:30', reason: 'Double click' };
    const [a, b] = await Promise.all([book(patient, body), book(patient, body)]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });

  it('rejects times outside the schedule, past dates and missing reasons', async () => {
    const patient = await agentFor('patient@carepoint.example');
    const outside = await book(patient, { doctorId: doctor._id.toString(), date, startTime: '15:00', reason: 'Late visit' });
    expect(outside.status).toBe(400);
    expect(outside.body.error.code).toBe('SLOT_INVALID');
    const past = await book(patient, { doctorId: doctor._id.toString(), date: '2020-01-06', startTime: '09:00', reason: 'Past' });
    expect(past.body.error.code).toBe('DATE_IN_PAST');
    const noReason = await book(patient, { doctorId: doctor._id.toString(), date, startTime: '09:15', reason: '' });
    expect(noReason.status).toBe(400);
  });

  it('only patients can book', async () => {
    const doc = await agentFor('kavya.raman@carepoint.example');
    const res = await book(doc, { doctorId: doctor._id.toString(), date, startTime: '09:30', reason: 'Not allowed' });
    expect(res.status).toBe(403);
  });
});

describe('access control and cancellation', () => {
  let mine;
  let patient;
  beforeAll(async () => {
    patient = await newPatient('owner@test.example', '9300000001');
    mine = (await book(patient, { doctorId: doctor._id.toString(), date, startTime: '11:00', reason: 'Cough' })).body.data;
  });

  it('shows the booking in the patient’s upcoming list', async () => {
    const res = await patient.agent.get('/api/appointments/mine?scope=upcoming');
    expect(res.body.data.map((a) => a.reference)).toContain(mine.reference);
  });

  it('hides it from other patients and from other doctors', async () => {
    const stranger = await newPatient('stranger@test.example', '9300000002');
    expect((await stranger.agent.get(`/api/appointments/${mine.id}`)).status).toBe(404);
    const cancel = await stranger.agent.patch(`/api/appointments/${mine.id}/cancel`).set('X-CSRF-Token', stranger.csrf).send({});
    expect(cancel.status).toBe(404);
    const otherDoctor = await agentFor('kavya.raman@carepoint.example');
    expect((await otherDoctor.agent.get(`/api/appointments/${mine.id}`)).status).toBe(404);
  });

  it('cancelling releases the slot for someone else', async () => {
    const res = await patient.agent.patch(`/api/appointments/${mine.id}/cancel`).set('X-CSRF-Token', patient.csrf).send({ reason: 'Feeling better' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
    expect((await slotsFor()).find((s) => s.start === '11:00').status).toBe('available');
    const someoneElse = await newPatient('next@test.example', '9300000003');
    const rebook = await book(someoneElse, { doctorId: doctor._id.toString(), date, startTime: '11:00', reason: 'Took the freed slot' });
    expect(rebook.status).toBe(201);
  });

  it('a cancelled appointment cannot be cancelled again', async () => {
    const res = await patient.agent.patch(`/api/appointments/${mine.id}/cancel`).set('X-CSRF-Token', patient.csrf).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('patients cannot cancel inside the 2-hour window', async () => {
    const soon = await Appointment.create({
      reference: 'CP-TEST-SOON1',
      patient: patient.user.id,
      doctor: doctor._id,
      department: doctor.department,
      date: '2030-01-01',
      startTime: '09:00',
      endTime: '09:15',
      startsAt: new Date(Date.now() + 30 * 60000),
      endsAt: new Date(Date.now() + 45 * 60000),
      reason: 'Soon',
      fee: 1,
    });
    const res = await patient.agent.patch(`/api/appointments/${soon._id}/cancel`).set('X-CSRF-Token', patient.csrf).send({});
    expect(res.body.error.code).toBe('CANCEL_WINDOW_CLOSED');
  });
});

describe('status transitions', () => {
  let doctorAgent;
  let appt;
  beforeAll(async () => {
    doctorAgent = await agentFor('lakshmi.narayana@carepoint.example');
    const p = await newPatient('flow@test.example', '9400000001');
    appt = (await book(p, { doctorId: doctor._id.toString(), date, startTime: '11:30', reason: 'Vaccination' })).body.data;
  });

  const act = (who, id, body) => who.agent.patch(`/api/appointments/${id}/status`).set('X-CSRF-Token', who.csrf).send(body);

  it('doctor sees the booking with patient contact details', async () => {
    const res = await doctorAgent.agent.get(`/api/appointments/doctor?date=${date}`);
    const found = res.body.data.find((a) => a.id === appt.id);
    expect(found.patient).toMatchObject({ name: 'Test Patient', phone: '9400000001' });
    expect(found.patient.email).toBeUndefined();
  });

  it('rejecting requires a reason; confirming works', async () => {
    expect((await act(doctorAgent, appt.id, { action: 'reject' })).status).toBe(400);
    const res = await act(doctorAgent, appt.id, { action: 'confirm' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('confirmed');
    expect(res.body.data.history.map((h) => h.status)).toEqual(['pending', 'confirmed']);
  });

  it('cannot complete before the start time or confirm twice', async () => {
    expect((await act(doctorAgent, appt.id, { action: 'complete' })).body.error.code).toBe('TOO_EARLY');
    expect((await act(doctorAgent, appt.id, { action: 'confirm' })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('completes an appointment whose time has passed', async () => {
    await Appointment.updateOne({ _id: appt.id }, { startsAt: new Date(Date.now() - 60000) });
    const res = await act(doctorAgent, appt.id, { action: 'complete' });
    expect(res.body.data.status).toBe('completed');
  });

  it('patients cannot change status; admins can override with a reason', async () => {
    const p = await newPatient('override@test.example', '9400000002');
    const fresh = (await book(p, { doctorId: doctor._id.toString(), date, startTime: '09:45', reason: 'Override' })).body.data;
    expect((await act(p, fresh.id, { action: 'confirm' })).status).toBe(403);
    const admin = await agentFor('admin@test.example');
    expect((await act(admin, fresh.id, { action: 'cancel' })).status).toBe(400);
    const res = await act(admin, fresh.id, { action: 'cancel', note: 'Doctor called in sick' });
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data.statusNote).toBe('Doctor called in sick');
  });
});

describe('administrator views', () => {
  it('returns aggregated statistics', async () => {
    const admin = await agentFor('admin@test.example');
    const res = await admin.agent.get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.activeDoctors).toBe(12);
    expect(res.body.data.totalAppointments).toBeGreaterThan(0);
    expect(res.body.data.daily).toHaveLength(14);
    expect(res.body.data.byStatus.pending).toBeGreaterThan(0);
  });

  it('searches appointments by reference and filters by status', async () => {
    const admin = await agentFor('admin@test.example');
    const one = await Appointment.findOne({ status: 'completed' });
    const res = await admin.agent.get(`/api/admin/appointments?q=${one.reference}`);
    expect(res.body.data).toHaveLength(1);
    const byStatus = await admin.agent.get('/api/admin/appointments?status=cancelled');
    expect(byStatus.body.data.every((a) => a.status === 'cancelled')).toBe(true);
  });

  it('records audit logs for important actions', async () => {
    const admin = await agentFor('admin@test.example');
    const res = await admin.agent.get('/api/admin/audit-logs?action=appointment');
    expect(res.body.data.some((l) => l.action === 'appointment.book')).toBe(true);
    expect(res.body.data.some((l) => /admin override/.test(l.summary))).toBe(true);
  });

  it('doctors cannot read admin data', async () => {
    const doc = await agentFor('lakshmi.narayana@carepoint.example');
    expect((await doc.agent.get('/api/admin/appointments')).status).toBe(403);
    expect((await doc.agent.get('/api/admin/audit-logs')).status).toBe(403);
  });
});
