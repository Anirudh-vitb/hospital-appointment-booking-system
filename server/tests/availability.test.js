import { DateTime } from 'luxon';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertBookableDate, buildSlots, labelSlots } from '../src/services/availabilityService.js';
import { agentFor, app, nextWorkingDate, request, seedBasics } from './helpers.js';

const zone = 'Asia/Kolkata';
const at = (iso) => DateTime.fromISO(iso, { zone });

describe('slot calculation (unit)', () => {
  it('splits schedule blocks into slots and drops a trailing partial slot', () => {
    const slots = buildSlots([{ start: '09:00', end: '10:10' }], 20);
    expect(slots.map((s) => s.start)).toEqual([540, 560, 580]);
  });

  it('labels past, blocked and booked slots', () => {
    const slots = buildSlots([{ start: '09:00', end: '11:00' }], 30);
    const labelled = labelSlots({
      slots,
      isoDate: '2026-11-02',
      now: at('2026-11-02T08:15'), // lead time is 60 minutes, so 09:00 is too soon
      exceptions: [{ start: '10:00', end: '10:30' }],
      booked: [{ startTime: '09:30', endTime: '10:00' }],
    });
    expect(labelled.map((s) => `${s.start}:${s.status}`)).toEqual([
      '09:00:past',
      '09:30:booked',
      '10:00:blocked',
      '10:30:available',
    ]);
  });

  it('a whole-day exception blocks every slot', () => {
    const labelled = labelSlots({
      slots: buildSlots([{ start: '09:00', end: '10:00' }], 30),
      isoDate: '2026-11-02',
      now: at('2026-11-01T08:00'),
      exceptions: [{ reason: 'Leave' }],
      booked: [],
    });
    expect(labelled.every((s) => s.status === 'blocked')).toBe(true);
  });

  it('only allows dates inside the booking window', () => {
    const now = at('2026-11-02T10:00');
    expect(() => assertBookableDate('2026-11-01', now)).toThrow(/already passed/);
    expect(() => assertBookableDate('2026-12-20', now)).toThrow(/30 days/);
    expect(() => assertBookableDate('2026-02-30', now)).toThrow(/valid date/);
    expect(assertBookableDate('2026-11-02', now).toISODate()).toBe('2026-11-02');
  });
});

describe('availability API', () => {
  let data;
  let kavya;
  beforeAll(async () => {
    data = await seedBasics();
    kavya = data.doctors.find((d) => d.displayName === 'Dr. Kavya Raman');
  });

  it('returns slots for a working day without patient details', async () => {
    const date = nextWorkingDate(kavya, 3);
    const res = await request(app).get(`/api/doctors/${kavya._id}/slots?date=${date}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isWorkingDay).toBe(true);
    expect(res.body.data.slots[0]).toEqual({ start: '09:00', end: '09:20', status: 'available' });
    expect(Object.keys(res.body.data.slots[0])).toEqual(['start', 'end', 'status']);
  });

  it('lets a doctor change their own weekly hours', async () => {
    const doctor = await agentFor('kavya.raman@carepoint.example');
    const res = await doctor.agent
      .put('/api/availability/me/schedule')
      .set('X-CSRF-Token', doctor.csrf)
      .send({ slotMinutes: 30, weeklySchedule: [{ dayOfWeek: 1, start: '09:00', end: '12:00' }, { dayOfWeek: 1, start: '16:00', end: '18:00' }] });
    expect(res.status).toBe(200);
    expect(res.body.data.workingDays).toEqual([1]);
    expect(res.body.data.slotMinutes).toBe(30);
  });

  it('rejects a slot length that is not allowed', async () => {
    const doctor = await agentFor('kavya.raman@carepoint.example');
    const res = await doctor.agent.put('/api/availability/me/schedule').set('X-CSRF-Token', doctor.csrf).send({ slotMinutes: 7, weeklySchedule: [] });
    expect(res.status).toBe(400);
  });

  it('blocked time removes slots and can be removed again', async () => {
    const doctor = await agentFor('arjun.varma@carepoint.example');
    const arjun = data.doctors.find((d) => d.displayName === 'Dr. Arjun Varma');
    const date = nextWorkingDate(arjun, 3);
    const block = await doctor.agent
      .post('/api/availability/me/exceptions')
      .set('X-CSRF-Token', doctor.csrf)
      .send({ date, start: '10:00', end: '11:00', reason: 'Ward round' });
    expect(block.status).toBe(201);

    const slots = (await request(app).get(`/api/doctors/${arjun._id}/slots?date=${date}`)).body.data.slots;
    expect(slots.filter((s) => s.status === 'blocked').map((s) => s.start)).toEqual(['10:00', '10:20', '10:40']);

    const removed = await doctor.agent.delete(`/api/availability/me/exceptions/${block.body.data.id}`).set('X-CSRF-Token', doctor.csrf);
    expect(removed.status).toBe(200);
  });

  it("a doctor cannot remove another doctor's blocked time", async () => {
    const arjun = await agentFor('arjun.varma@carepoint.example');
    const arjunDoc = data.doctors.find((d) => d.displayName === 'Dr. Arjun Varma');
    const block = await arjun.agent
      .post('/api/availability/me/exceptions')
      .set('X-CSRF-Token', arjun.csrf)
      .send({ date: nextWorkingDate(arjunDoc, 4), reason: 'Leave' });
    const meera = await agentFor('meera.iyer@carepoint.example');
    const res = await meera.agent.delete(`/api/availability/me/exceptions/${block.body.data.id}`).set('X-CSRF-Token', meera.csrf);
    expect(res.status).toBe(404);
  });

  it('patients cannot use the doctor availability routes', async () => {
    const patient = await agentFor('patient@carepoint.example');
    const res = await patient.agent.put('/api/availability/me/schedule').set('X-CSRF-Token', patient.csrf).send({ slotMinutes: 15, weeklySchedule: [] });
    expect(res.status).toBe(403);
  });
});
