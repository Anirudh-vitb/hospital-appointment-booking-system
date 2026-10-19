import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { seed } from '../scripts/seed.js';
import { dayOfWeek, nowInZone } from '../src/utils/time.js';

export const PASSWORD = 'CarePoint@2026';

export async function seedBasics() {
  const data = await seed({ log: () => {} });
  const admin = new User({ name: 'Test Admin', email: 'admin@test.example', role: 'admin' });
  await admin.setPassword(PASSWORD);
  await admin.save();
  return { ...data, admin };
}

// A supertest agent keeps cookies between requests, like a browser does.
export async function agentFor(email, password = PASSWORD) {
  const agent = request.agent(app);
  const csrf = await fetchCsrf(agent);
  if (!email) return { agent, csrf };
  const res = await agent.post('/api/auth/login').set('X-CSRF-Token', csrf).send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, csrf: res.body.data.csrfToken, user: res.body.data.user };
}

export async function fetchCsrf(agent) {
  const res = await agent.get('/api/auth/session');
  return res.body.data.csrfToken;
}

export async function newPatient(email, phone = '9123456780') {
  const { agent, csrf } = await agentFor();
  const res = await agent
    .post('/api/auth/register')
    .set('X-CSRF-Token', csrf)
    .send({ name: 'Test Patient', email, phone, password: PASSWORD });
  return { agent, csrf: res.body.data.csrfToken, user: res.body.data.user };
}

// Next date (at least minDays ahead) on which the doctor has outpatient hours.
export function nextWorkingDate(doctor, minDays = 2) {
  let day = nowInZone().startOf('day').plus({ days: minDays });
  while (!doctor.workingDays.includes(dayOfWeek(day))) day = day.plus({ days: 1 });
  return day.toISODate();
}

export { app, request };
