// End-to-end smoke test against a running deployment, using only HTTP:
//   BASE_URL=https://carepoint-vitb.vercel.app ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/smokeTest.js
// It registers a throwaway patient, books, confirms, cancels and checks the
// main permission rules. It creates real (clearly labelled) records.

const BASE = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'CarePoint@2026';
let failures = 0;

function check(label, condition, detail = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures += 1;
}

// A tiny browser-like client: keeps the session cookie and CSRF token.
function client() {
  let cookie = '';
  let csrf = '';
  async function call(method, path, body) {
    const headers = { Accept: 'application/json' };
    if (cookie) headers.Cookie = cookie;
    if (body) headers['Content-Type'] = 'application/json';
    if (method !== 'GET' && csrf) headers['X-CSRF-Token'] = csrf;
    const res = await fetch(`${BASE}/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const json = await res.json().catch(() => null);
    if (json?.data?.csrfToken) csrf = json.data.csrfToken;
    return { status: res.status, body: json, cookie: setCookie };
  }
  return {
    get: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b),
    patch: (p, b) => call('PATCH', p, b),
    async start() {
      await call('GET', '/auth/session');
    },
    async login(email, password) {
      await this.start();
      return call('POST', '/auth/login', { email, password });
    },
  };
}

async function main() {
  console.log(`Smoke test against ${BASE}\n`);

  const page = await fetch(`${BASE}/doctors`);
  check('SPA deep link serves the app', page.status === 200 && (await page.text()).includes('CarePoint'));

  const health = await client().get('/health');
  check('health: database connected', health.body?.data?.database === 'connected', JSON.stringify(health.body?.data));

  const anon = client();
  const doctors = await anon.get('/doctors?limit=50');
  check('doctor directory lists seeded doctors', doctors.body?.meta?.total >= 12, `total=${doctors.body?.meta?.total}`);
  const search = await anon.get('/doctors?q=cardio');
  check('search "cardio" finds cardiologists', search.body?.data?.length >= 2);
  check('public data has no emails', !JSON.stringify(doctors.body).includes('@carepoint.example'));

  const lakshmi = doctors.body.data.find((d) => d.name === 'Dr. Lakshmi Narayana');
  let date;
  let slot;
  for (let i = 2; i < 14 && !slot; i += 1) {
    const d = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
    const res = await anon.get(`/doctors/${lakshmi.id}/slots?date=${d}`);
    const free = res.body?.data?.slots?.filter((s) => s.status === 'available') || [];
    if (free.length) {
      date = d;
      slot = free.at(-1).start;
    }
  }
  check('found a free slot', Boolean(slot), `${date} ${slot}`);

  const stamp = Date.now();
  const patient = client();
  await patient.start();
  const reg = await patient.post('/auth/register', { name: 'Smoke Test Patient', email: `smoke${stamp}@test.example`, phone: '9000012345', password: 'SmokeTest123' });
  check('register patient', reg.status === 201 && reg.body?.data?.user?.role === 'patient');
  check('session cookie is HttpOnly + Secure', /HttpOnly/i.test(reg.cookie || '') && /Secure/i.test(reg.cookie || ''));

  const booked = await patient.post('/appointments', { doctorId: lakshmi.id, date, startTime: slot, reason: 'Live smoke test booking' });
  check('book appointment', booked.status === 201, booked.body?.data?.reference || JSON.stringify(booked.body?.error));
  const appt = booked.body?.data;

  const mine = await patient.get('/appointments/mine?scope=upcoming');
  check('booking appears in patient list', mine.body?.data?.some((a) => a.id === appt?.id));

  const rival = client();
  await rival.start();
  await rival.post('/auth/register', { name: 'Smoke Rival', email: `rival${stamp}@test.example`, phone: '9000054321', password: 'SmokeTest123' });
  const clash = await rival.post('/appointments', { doctorId: lakshmi.id, date, startTime: slot, reason: 'Trying the same slot' });
  check('double booking refused', clash.status === 409, clash.body?.error?.code);
  const peek = await rival.get(`/appointments/${appt?.id}`);
  check("other patient cannot see the booking", peek.status === 404);

  const doctor = client();
  const dlogin = await doctor.login('lakshmi.narayana@carepoint.example', DEMO_PASSWORD);
  check('doctor login', dlogin.status === 200 && dlogin.body?.data?.user?.role === 'doctor');
  const confirm = await doctor.patch(`/appointments/${appt?.id}/status`, { action: 'confirm' });
  check('doctor confirms', confirm.body?.data?.status === 'confirmed');

  const seen = await patient.get(`/appointments/${appt?.id}`);
  check('patient sees confirmed status', seen.body?.data?.status === 'confirmed');

  const cancel = await patient.patch(`/appointments/${appt?.id}/cancel`, { reason: 'Smoke test clean-up' });
  check('patient cancels', cancel.body?.data?.status === 'cancelled');
  const after = await anon.get(`/doctors/${lakshmi.id}/slots?date=${date}`);
  check('slot is free again', after.body?.data?.slots?.find((s) => s.start === slot)?.status === 'available');

  const forbidden = await patient.get('/admin/stats');
  check('patient blocked from admin API', forbidden.status === 403);
  const noCsrf = await fetch(`${BASE}/api/patients/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  check('state change without session/CSRF rejected', [401, 403].includes(noCsrf.status));

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const admin = client();
    const alogin = await admin.login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    check('admin login', alogin.body?.data?.user?.role === 'admin');
    const stats = await admin.get('/admin/stats');
    check('admin statistics', stats.body?.data?.activeDoctors >= 12, `patients=${stats.body?.data?.patients}, appointments=${stats.body?.data?.totalAppointments}`);
    const audit = await admin.get('/admin/audit-logs?action=appointment');
    check('audit log records the booking', audit.body?.data?.some((l) => l.summary?.includes(appt?.reference || '-')));
  }

  const out = await patient.post('/auth/logout');
  check('logout', out.status === 200);
  const afterLogout = await patient.get('/appointments/mine');
  check('old session no longer works', afterLogout.status === 401);

  const demo = await fetch(`${BASE}/demo/server-info`);
  check('EJS demo page renders', demo.status === 200 && (await demo.text()).includes('CarePoint server information'));

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures ? 1 : 0;
}

main().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exitCode = 1;
});
