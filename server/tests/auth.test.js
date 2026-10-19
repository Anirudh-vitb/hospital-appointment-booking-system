import { beforeAll, describe, expect, it } from 'vitest';
import { PASSWORD, agentFor, app, fetchCsrf, newPatient, request, seedBasics } from './helpers.js';

beforeAll(seedBasics);

describe('registration', () => {
  it('rejects invalid input with field-level messages', async () => {
    const { agent, csrf } = await agentFor();
    const res = await agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({ name: 'A', email: 'not-an-email', phone: '12345', password: 'short' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'phone', 'password']));
  });

  it('always creates a patient, even if the request asks for another role', async () => {
    const { agent, csrf } = await agentFor();
    const res = await agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({ name: 'Sneaky User', email: 'sneaky@test.example', phone: '9000000001', password: PASSWORD, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('patient');
    const adminCall = await agent.get('/api/admin/stats');
    expect(adminCall.status).toBe(403);
  });

  it('refuses a duplicate email', async () => {
    const { agent, csrf } = await agentFor();
    const res = await agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({ name: 'Again', email: 'SNEAKY@test.example', phone: '9000000002', password: PASSWORD });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });
});

describe('login, session and logout', () => {
  it('rejects a wrong password with a generic message', async () => {
    const { agent, csrf } = await agentFor();
    const res = await agent.post('/api/auth/login').set('X-CSRF-Token', csrf).send({ email: 'patient@carepoint.example', password: 'Wrong1234' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('The email or password is incorrect.');
  });

  it('sets an HttpOnly session cookie and issues a new session id on login', async () => {
    const agent = request.agent(app);
    const first = await agent.get('/api/auth/session');
    const before = first.headers['set-cookie'][0].split(';')[0];
    const res = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', first.body.data.csrfToken)
      .send({ email: 'patient@carepoint.example', password: PASSWORD });
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie.split(';')[0]).not.toBe(before); // session fixation defence
    const session = await agent.get('/api/auth/session');
    expect(session.body.data.user.email).toBe('patient@carepoint.example');
  });

  it('logout destroys the server-side session', async () => {
    const first = await request(app).get('/api/auth/session');
    const anonCookie = first.headers['set-cookie'][0].split(';')[0];
    const login = await request(app)
      .post('/api/auth/login')
      .set('Cookie', anonCookie)
      .set('X-CSRF-Token', first.body.data.csrfToken)
      .send({ email: 'patient@carepoint.example', password: PASSWORD });
    const cookie = login.headers['set-cookie'][0].split(';')[0];

    const before = await request(app).get('/api/appointments/mine').set('Cookie', cookie);
    expect(before.status).toBe(200);

    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie).set('X-CSRF-Token', login.body.data.csrfToken);
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toMatch(/carepoint\.sid=;/);

    // Replaying the old cookie must not work any more.
    const replay = await request(app).get('/api/appointments/mine').set('Cookie', cookie);
    expect(replay.status).toBe(401);
  });

  it('blocks state-changing requests without a CSRF token', async () => {
    const { agent } = await agentFor('patient@carepoint.example');
    const res = await agent.patch('/api/patients/me').send({ name: 'Changed' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_INVALID');
  });
});

describe('authentication middleware', () => {
  it('returns 401 for protected routes without a session', async () => {
    const res = await request(app).get('/api/appointments/mine');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' } });
  });

  it('lets a patient update their own profile', async () => {
    const { agent, csrf } = await newPatient('profile@test.example', '9000000003');
    const res = await agent
      .patch('/api/patients/me')
      .set('X-CSRF-Token', csrf)
      .send({ name: 'Updated Name', patientProfile: { gender: 'female', dateOfBirth: '2000-01-01' } });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
    expect(res.body.data.patientProfile.gender).toBe('female');
  });

  it('changes the password only with the correct current password', async () => {
    const { agent, csrf } = await newPatient('pw@test.example', '9000000004');
    const wrong = await agent.put('/api/patients/me/password').set('X-CSRF-Token', csrf).send({ currentPassword: 'nope', newPassword: 'NewPass123' });
    expect(wrong.status).toBe(400);
    const right = await agent.put('/api/patients/me/password').set('X-CSRF-Token', csrf).send({ currentPassword: PASSWORD, newPassword: 'NewPass123' });
    expect(right.status).toBe(200);
    await expect(agentFor('pw@test.example', 'NewPass123')).resolves.toBeTruthy();
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(await fetchCsrf(request.agent(app))).toHaveLength(64);
  });
});
