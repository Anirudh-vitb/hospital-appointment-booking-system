import { beforeAll, describe, expect, it } from 'vitest';
import AvailabilityException from '../src/models/AvailabilityException.js';
import { PASSWORD, agentFor, app, request, seedBasics } from './helpers.js';

let data;
beforeAll(async () => {
  data = await seedBasics();
});

describe('public doctor directory', () => {
  it('searches by name or specialty, case-insensitively', async () => {
    const byName = await request(app).get('/api/doctors?q=kavya');
    expect(byName.body.data.map((d) => d.name)).toEqual(['Dr. Kavya Raman']);
    const bySpecialty = await request(app).get('/api/doctors?q=CARDIO');
    expect(bySpecialty.body.data).toHaveLength(2);
  });

  it('treats regex characters in the search as plain text', async () => {
    const res = await request(app).get('/api/doctors?q=.*');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('filters by department slug and specialty', async () => {
    const dept = await request(app).get('/api/doctors?department=paediatrics');
    expect(dept.body.data.every((d) => d.department.slug === 'paediatrics')).toBe(true);
    expect(dept.body.meta.total).toBe(2);
    const spec = await request(app).get('/api/doctors?specialty=neonatology');
    expect(spec.body.data.map((d) => d.name)).toEqual(['Dr. Rohan Mehta']);
  });

  it('filters by availability on a date and excludes doctors on leave', async () => {
    const doctor = data.doctors.find((d) => d.displayName === 'Dr. Anitha Reddy');
    const { nextWorkingDate } = await import('./helpers.js');
    const date = nextWorkingDate(doctor, 3);
    const before = await request(app).get(`/api/doctors?availableOn=${date}&limit=50`);
    expect(before.body.data.map((d) => d.name)).toContain('Dr. Anitha Reddy');
    await AvailabilityException.create({ doctor: doctor._id, date, reason: 'Leave' });
    const after = await request(app).get(`/api/doctors?availableOn=${date}&limit=50`);
    expect(after.body.data.map((d) => d.name)).not.toContain('Dr. Anitha Reddy');
  });

  it('paginates and never exposes account details publicly', async () => {
    const res = await request(app).get('/api/doctors?limit=5&page=2&sort=fee');
    expect(res.body.meta).toMatchObject({ page: 2, limit: 5, total: 12, totalPages: 3 });
    const fees = res.body.data.map((d) => d.consultationFee);
    expect([...fees].sort((a, b) => a - b)).toEqual(fees);
    expect(JSON.stringify(res.body)).not.toMatch(/@carepoint\.example/);
  });

  it('rejects an invalid doctor id and an invalid limit', async () => {
    expect((await request(app).get('/api/doctors/not-an-id')).status).toBe(400);
    expect((await request(app).get('/api/doctors?limit=500')).status).toBe(400);
  });
});

describe('doctor CRUD (administrator)', () => {
  let admin;
  let doctorId;
  const cardiology = () => data.departments.cardiology._id.toString();

  beforeAll(async () => {
    admin = await agentFor('admin@test.example');
  });

  it('creates a doctor together with a doctor login', async () => {
    const res = await admin.agent
      .post('/api/admin/doctors')
      .set('X-CSRF-Token', admin.csrf)
      .send({
        name: 'Test Physician',
        email: 'new.doc@test.example',
        password: PASSWORD,
        department: cardiology(),
        specialty: 'Cardiology',
        experienceYears: 5,
        consultationFee: 300,
        slotMinutes: 30,
        weeklySchedule: [{ dayOfWeek: 1, start: '09:00', end: '11:00' }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Dr. Test Physician');
    expect(res.body.data.workingDays).toEqual([1]);
    doctorId = res.body.data.id;
    const login = await agentFor('new.doc@test.example');
    expect(login.user.role).toBe('doctor');
  });

  it('updates a doctor', async () => {
    const res = await admin.agent.patch(`/api/admin/doctors/${doctorId}`).set('X-CSRF-Token', admin.csrf).send({ consultationFee: 350, isFeatured: true });
    expect(res.status).toBe(200);
    expect(res.body.data.consultationFee).toBe(350);
  });

  it('rejects overlapping schedule blocks', async () => {
    const res = await admin.agent
      .patch(`/api/admin/doctors/${doctorId}`)
      .set('X-CSRF-Token', admin.csrf)
      .send({ weeklySchedule: [{ dayOfWeek: 2, start: '09:00', end: '12:00' }, { dayOfWeek: 2, start: '11:00', end: '13:00' }] });
    expect(res.status).toBe(400);
  });

  it('deactivates a doctor: hidden from directory and cannot sign in', async () => {
    const res = await admin.agent.patch(`/api/admin/doctors/${doctorId}/status`).set('X-CSRF-Token', admin.csrf).send({ isActive: false });
    expect(res.status).toBe(200);
    expect((await request(app).get(`/api/doctors/${doctorId}`)).status).toBe(404);
    await expect(agentFor('new.doc@test.example')).rejects.toThrow(/401/);
    const list = await admin.agent.get('/api/admin/doctors?includeInactive=true&limit=50');
    expect(list.body.data.find((d) => d.id === doctorId).isActive).toBe(false);
  });

  it('does not let patients or doctors manage doctors', async () => {
    const patient = await agentFor('patient@carepoint.example');
    const asPatient = await patient.agent.post('/api/admin/doctors').set('X-CSRF-Token', patient.csrf).send({});
    expect(asPatient.status).toBe(403);
    const doctor = await agentFor('kavya.raman@carepoint.example');
    const asDoctor = await doctor.agent.patch(`/api/admin/doctors/${doctorId}/status`).set('X-CSRF-Token', doctor.csrf).send({ isActive: true });
    expect(asDoctor.status).toBe(403);
  });
});

describe('department CRUD', () => {
  let admin;
  let deptId;
  beforeAll(async () => {
    admin = await agentFor('admin@test.example');
  });

  it('lists departments with doctor counts (public)', async () => {
    const res = await request(app).get('/api/departments');
    expect(res.status).toBe(200);
    expect(res.body.data.find((d) => d.slug === 'cardiology').doctorCount).toBeGreaterThanOrEqual(2);
  });

  it('creates, rejects duplicates and updates', async () => {
    const created = await admin.agent.post('/api/departments').set('X-CSRF-Token', admin.csrf).send({ name: 'Nephrology', description: 'Kidney care' });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('nephrology');
    deptId = created.body.data.id;
    const dup = await admin.agent.post('/api/departments').set('X-CSRF-Token', admin.csrf).send({ name: 'nephrology' });
    expect(dup.status).toBe(409);
    const updated = await admin.agent.patch(`/api/departments/${deptId}`).set('X-CSRF-Token', admin.csrf).send({ floor: 'Block D' });
    expect(updated.body.data.floor).toBe('Block D');
  });

  it('refuses to deactivate a department that still has active doctors', async () => {
    const id = data.departments.cardiology._id.toString();
    const res = await admin.agent.patch(`/api/departments/${id}`).set('X-CSRF-Token', admin.csrf).send({ isActive: false });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DEPARTMENT_IN_USE');
  });

  it('requires an administrator', async () => {
    const res = await request(app).post('/api/departments').send({ name: 'X-ray' });
    expect([401, 403]).toContain(res.status);
  });
});
