# CarePoint — Hospital Appointment Booking System

Full-stack outpatient appointment booking for a fictional hospital, built with **React, Express and MongoDB**.

Individual mini-project · **Full Stack Development – 2 (R-23)** · III B.Tech I Semester · Department of CSE, Vishnu Institute of Technology (Autonomous), Bhimavaram · 2026–27.

| | |
|---|---|
| GitHub repository | https://github.com/anirudh-vitb/hospital-appointment-booking-system |
| Live application | **https://carepoint-vitb.vercel.app** (API: https://carepoint-hospital-api.vercel.app/api/health) |

> **Academic demonstration.** All doctors, patients, fees and contact details are fictional. The application has not been assessed for real health records and must not be used for real medical appointments.

---

## 1. Overview

Patients search for a doctor, see which consultation times are still free, reserve one and get a booking reference. Doctors confirm or decline requests, mark visits completed and control their own hours and leave. Administrators manage the doctor roster and departments, oversee every appointment and read an audit log. Every screen reads and writes real data in MongoDB through the Express REST API.

## 2. Problem statement

At many hospital outpatient desks patients queue to get a time with a doctor, cannot see in advance whether that doctor is available that day, and have no record of the booking except a paper slip. Desk staff cannot easily prevent two patients being promised the same time. CarePoint replaces this with a self-service booking system in which availability is calculated on the server from each doctor's own schedule, and the database itself guarantees one patient per slot.

## 3. Objectives

1. Build a working React single-page application backed by an Express REST API and MongoDB.
2. Calculate availability on the server from weekly schedules, leave and existing bookings.
3. Make double booking impossible, even under simultaneous requests.
4. Implement secure, session-based authentication with three roles enforced on the server.
5. Demonstrate the R-23 FSD-2 syllabus (React, Express, MongoDB) in real, working features.
6. Deploy on free hosting and document the project so it can be run and explained.

## 4. Main features

**Patients** — register, sign in/out, edit profile and password · search doctors by name or specialty · filter by department, specialty and "has OPD hours on <date>" · sort by name, experience or fee · doctor profile with qualifications, fee, languages, room and weekly hours · pick a date (non-working days disabled) and a free time · enter a reason · confirmation dialog → booking slip with reference (printable) · upcoming list and history with status filters · appointment details with status timeline · cancel (up to 2 hours before) · clear messages when a slot was just taken.

**Doctors** — today's agenda with inline confirm/decline/complete · pending requests list · appointment list with Today/Upcoming/Past tabs, date and status filters · appointment details with patient age/gender/phone, reason, history and private notes · weekly OPD hours editor (multiple blocks per day, slot length) · block whole days or time ranges for leave · summary counts.

**Administrators** — dashboard with live aggregated statistics (patients, active doctors, totals, today, by status, per day for 14 days, by month, by department) · create, edit, activate/deactivate doctors (creates the doctor's login) · create, edit, activate/deactivate departments · search appointments by reference, patient name or email, filter by status, department and date range, sort, view details and override status with a reason · audit log filtered by action group and role.

**Cross-cutting** — server-side validation (zod) · CSRF tokens · rate limiting · Helmet headers · centralised errors · cold-start banner and automatic retries · loading skeletons, empty states and specific error messages · responsive layouts · keyboard-accessible dialogs and focus states · EJS server-rendered demo page.

## 5. User roles

| Role | How the account is created | Can access |
|---|---|---|
| Patient | Public registration (`/register`) — the only role registration can create | `/patient/*`, own appointments only |
| Doctor | An administrator creates it in **Admin → Doctors** (or the seed script) | `/doctor/*`, only appointments booked with them, only their own schedule |
| Administrator | `npm run create-admin` or the seed script with `ADMIN_EMAIL`/`ADMIN_PASSWORD` set — requires server/database access | `/admin/*` and every appointment |

The role is stored in MongoDB and loaded on every request from the session's user id; it is never read from the request body, query string or browser storage.

## 6. Technology stack

| Layer | Technology (version in `package.json`) |
|---|---|
| Frontend | React 19.3, React Router 7.18, Vite 8.3, Tailwind CSS 4.3, lucide-react icons, self-hosted fonts (Source Serif 4, Public Sans via Fontsource) |
| Backend | Node.js ≥ 20 (developed on 22), Express 5.3, express-session 1.19, connect-mongo 6, Mongoose 8.24 (MongoDB driver 6.20), zod 4, bcryptjs 3, Helmet 8, cors, express-rate-limit 8, morgan, EJS 7, Luxon 3 |
| Database | MongoDB (Atlas free tier in production; MongoDB 7 replica set locally) |
| Testing | Vitest 5 + Supertest (API), Vitest + React Testing Library + jsdom (UI), Playwright 1.56 (end-to-end) |
| Hosting | Vercel (frontend and backend as a Node function) or Render (backend, `render.yaml`) · MongoDB Atlas |

## 7. Architecture

```
 Browser (React SPA)
   │  fetch('/api/...', credentials: 'include', X-CSRF-Token)
   ▼
 Vercel – carepoint-hospital  (static React build)
   │  rewrite /api/* and /demo/* ──────────────┐   same origin for the browser,
   ▼                                           │   so the session cookie is first-party
 Vercel – carepoint-hospital-api (Express app as a Node function)   [or Render web service]
   │  helmet → cors → morgan → json/urlencoded → dbReady → session → loadUser → verifyCsrf → routers → errorHandler
   ▼
 MongoDB Atlas: users · doctorprofiles · departments · appointments · availabilityexceptions · auditlogs · sessions
```

* **Frontend** (`client/`) renders the UI, keeps form state, and calls the API through one client (`client/src/api/client.js`). It holds no business rules that matter for security.
* **Backend** (`server/`) owns every rule: who may do what, which slots exist, which status changes are allowed. Controllers stay thin; logic lives in `server/src/services/`.
* **Why a proxy rewrite?** If the browser called the API on another domain, the session cookie would be a third-party cookie, which Safari and Chrome increasingly block. Proxying `/api` through the frontend's own domain keeps the cookie first-party, lets it use `SameSite=Lax`, and needs no permissive CORS. (A direct cross-site mode is still supported with `CROSS_SITE_COOKIES=true`.)

## 8. ReactJS syllabus mapping

| Concept | Where it is used |
|---|---|
| JSX & functional components | All of `client/src/components/` (Navbar, Footer, DoctorCard, DoctorSearch, SpecialtyCard, AppointmentCard, StatusBadge, LoadingSpinner, ErrorMessage, ProtectedRoute, RoleBasedRoute, FormField, ConfirmationDialog, …) and `client/src/layouts/DashboardLayout.jsx` |
| Props | `DoctorCard({ doctor })`, `AppointmentCard({ appointment, viewer, actions })`, `SlotPicker({ slots, selected, onSelect })` |
| Child → parent callbacks | `DoctorSearch onSearch`, `DateStrip onSelect`, `SlotPicker onSelect`, `AppointmentActions onUpdated`, `DoctorForm onSaved` |
| State (`useState`) | Form values (`Login.jsx`, `Register.jsx`), search text (`Doctors.jsx`), selected date/slot and dialog visibility (`BookAppointment.jsx`), loading/error/success (`PatientProfile.jsx`) |
| Event handling | Form submit, search, filter changes, date and slot clicks, booking confirmation, cancellation, logout, Escape key in `Navbar.jsx` |
| Conditional rendering | Logged-in vs logged-out navbar, role dashboards, available vs unavailable slots, loading/error/empty states, buttons per appointment status in `AppointmentActions.jsx` |
| Lists & keys | Doctors, departments, slots, appointments, audit rows — keyed by database ids or slot times |
| Forms & validation | Controlled inputs with `FormField` (label/error wiring), client checks in `utils/validation.js`, server field errors mapped back (`ApiError.fieldErrors`) |
| React Router | `App.jsx`: public, patient, doctor, admin routes, nested layouts, lazy loading, `*` not-found; filters stored in the URL (`useSearchParams`) so Back works; redirect back after login (`location.state.from`) |
| `useEffect` | Fetching in `useApi`, event listeners in `Navbar`, `ServerWakeNotice`, `AuthContext`; `showModal()` in `ConfirmationDialog`; debounced URL sync in `Doctors.jsx` |
| `useContext` | `AuthContext` (`context/AuthContext.jsx`) read through the `useAuth` hook |
| `useRef` | `<dialog>` element in `ConfirmationDialog`, focusing invalid fields in `Login`, scrolling to the slot list in `BookAppointment`, blurring the search input |
| Custom hooks | `useAuth`, `useApi` (fetch + abort + reload), `useDebouncedValue`, `useDocumentTitle` |
| Class component | `ErrorBoundary.jsx` — React error boundaries can only be written as classes |

## 9. ExpressJS syllabus mapping

| Concept | Where |
|---|---|
| Routing & `express.Router` | `server/src/routes/` — auth, patients, departments, doctors, availability, appointments, admin, public, health, demo |
| HTTP methods | GET lists/details, POST create/login, PUT replace schedule/password, PATCH partial updates and status changes, DELETE blocked times |
| Middleware | `helmet`, `cors` (origin allow-list), `morgan` logging, `express.json`, `express.urlencoded`, `dbReady`, `sessionHandler`, `loadUser`, `verifyCsrf`, `requireAuth`, `requireRole`, `validate(zod)`, `authLimiter`/`bookingLimiter`, `notFound`, `errorHandler` (`server/src/middleware/`) |
| Templating | EJS view `server/src/views/server-info.ejs` with a partial, served at `GET /demo/server-info` (supplementary demonstration) |
| Form data | JSON from React everywhere; URL-encoded HTML form handled by `POST /demo/availability` |
| Cookies & sessions | `express-session` + `connect-mongo` (`middleware/session.js`): HttpOnly, Secure in production, SameSite, 8-hour rolling lifetime, `session.regenerate` on login, `session.destroy` + `clearCookie` on logout, `trust proxy` |
| Authentication & authorisation | `controllers/authController.js`, bcrypt hashing (cost 12), `requireRole`, ownership checks in `services/appointmentService.js#assertCanAccess` |
| REST API | Documented in [`docs/API.md`](docs/API.md); consistent `{ success, data, meta }` / `{ success, error }` responses |
| Error handling | `utils/ApiError.js` + `middleware/errorHandler.js` (validation, cast, duplicate key, DB unavailable, bad JSON) |
| Environment config | `server/src/config/env.js`, `.env.example` |

## 10. MongoDB syllabus mapping

| Concept | Where |
|---|---|
| Schemas, validation, references, timestamps | `server/src/models/*.js` (e.g. `Appointment.patient → User`, `doctor → DoctorProfile`, `department → Department`) |
| CRUD | Doctors (admin create/read/update/deactivate), departments (create/read/update/deactivate), appointments (create, read, status update, cancel), availability (update schedule, create/delete blocked times), user profile |
| Queries | Case-insensitive escaped regex search, department/specialty/working-day filters, `$nin` for doctors on leave, date ranges, status filters, sorting, `skip/limit` pagination (`utils/query.js`) |
| Indexes | See §12 |
| Aggregation | `services/statsService.js`: `$facet`, `$group`, `$lookup`, `$unwind`, `$project`, `$substrBytes`, `$sort`, `$limit`, `$count`, plus department doctor counts with a pipeline `$lookup` |
| Transactions | Creating a doctor writes `User` and `DoctorProfile` in one transaction (`adminController.createDoctor`) |
| Atomic updates | Status changes use `findOneAndUpdate` with the expected current status in the filter (compare-and-set) |

## 11. Database collections and relationships

```
users ─────────┐ 1                         departments
  role: patient│doctor│admin                  ▲ 1
               │                              │
               │ 1        1                   │ n
               └──── doctorprofiles ──────────┘
                        │ 1   weeklySchedule[] (embedded), workingDays[]
                        │
                        ├── n availabilityexceptions (date, optional start/end, reason)
                        │
 users(patient) 1 ── n appointments n ── 1 doctorprofiles
                        reference, date, startTime, endTime, startsAt, status,
                        holdsSlot, history[] (embedded), reason, fee, doctorNotes
 auditlogs  (actor → users, action, entityType, entityId, summary, ip)
 sessions   (managed by connect-mongo, TTL index expires them)
```

Weekly hours are embedded in the doctor profile because they are always read together and are small; leave days are a separate collection because they grow over time and are queried by date.

## 12. Indexes and why

| Collection | Index | Query it serves |
|---|---|---|
| users | `{ email: 1 }` unique | Login lookup; makes duplicate registration impossible |
| users | `{ role: 1, createdAt: -1 }` | Role counts and patient search in admin |
| departments | `{ slug: 1 }` unique, `{ name: 1 }` unique (case-insensitive collation) | URLs and duplicate prevention |
| doctorprofiles | `{ user: 1 }` unique | Doctor's own profile from the session user |
| doctorprofiles | `{ isActive, department, specialty }` | Directory filters |
| doctorprofiles | `{ isActive, workingDays }` | "Has OPD hours on <date>" filter |
| appointments | `{ doctor, startsAt }` **unique, partial `holdsSlot: true`** | Double-booking prevention |
| appointments | `{ patient, startsAt }` **unique, partial `holdsSlot: true`** | One patient cannot hold two bookings at the same moment (duplicate submissions) |
| appointments | `{ patient, startsAt: -1 }` | Patient upcoming/history lists |
| appointments | `{ doctor, date, startTime }` | Slot calculation and doctor day view |
| appointments | `{ status, startsAt: -1 }` | Admin filters by status and date |
| appointments | `{ reference: 1 }` unique, `{ createdAt: -1 }` | Reference search, "recently booked" |
| availabilityexceptions | `{ doctor, date }` | Slot calculation |
| auditlogs | `{ createdAt: -1 }`, `{ action, createdAt: -1 }` | Audit log pages |

## 13. Appointment booking and double-booking prevention

1. `GET /api/doctors/:id/slots?date=` builds slots from the doctor's weekly blocks (`availabilityService.buildSlots`) and labels each as `available`, `booked` (overlaps an appointment that holds its slot), `blocked` (overlaps leave) or `past` (starts less than 60 minutes from now). Dates must be between today and 30 days ahead.
2. `POST /api/appointments` **recalculates** the same thing on the server; the client's view is never trusted.
3. The insert is protected by a **partial unique index** on `{ doctor, startsAt }` covering only documents with `holdsSlot: true`. If two requests pass step 2 at the same instant, MongoDB accepts exactly one; the other gets duplicate-key error 11000, which the API turns into `409 SLOT_TAKEN` with "This time was just booked by someone else. Refresh the available times and pick another slot." The booking page then reloads the times automatically.
4. Cancelling or declining sets `holdsSlot: false`, which removes the document from the partial index, so the slot is immediately bookable again — without deleting the record.
5. The partial index uses only an equality filter (`holdsSlot: true`), which every MongoDB version that supports partial indexes accepts, including Atlas free clusters.

This is verified by `server/tests/appointments.test.js` (five simultaneous requests → exactly one 201) and the Playwright test "a stale page cannot double-book".

## 14. Timezone rules

The hospital timezone is `HOSPITAL_TIMEZONE` (default `Asia/Kolkata`). Dates are stored as `"YYYY-MM-DD"` and times as `"HH:mm"` wall-clock strings in that zone — exactly what patients see — and `startsAt`/`endsAt` store the same moment as a UTC `Date` for sorting and "upcoming vs past". Conversion happens only on the server with Luxon (`server/src/utils/time.js`), so the result does not depend on the server's or the browser's timezone.

## 15. How sessions and cookies work here

1. When the SPA loads it calls `GET /api/auth/session`. The server creates an anonymous session containing only a random CSRF token, stores it in MongoDB (`sessions` collection) and sends a cookie `carepoint.sid` that contains only a signed session id.
2. On login the server checks the bcrypt hash, **regenerates** the session (new id, so an id planted before login is useless), stores `userId` in it, and returns a new CSRF token.
3. On each request `express-session` reads the cookie, loads the session from MongoDB, and `loadUser` fetches the user to get the current role. A deactivated user is signed out automatically.
4. The cookie is `HttpOnly` (JavaScript cannot read it), `Secure` in production (HTTPS only), `SameSite=Lax` (not sent on cross-site POSTs), and expires after 8 hours of inactivity (`rolling`).
5. Because cookies are sent automatically, state-changing requests also need the `X-CSRF-Token` header, which a forged page on another site cannot read or set.
6. Logout destroys the session document and clears the cookie, so replaying the old cookie fails (tested).

No password, role or patient data is stored in the session — only the user id and the CSRF token.

## 16. Project folder structure

```
hospital-appointment-booking-system/
├── client/                    React + Vite SPA
│   ├── src/
│   │   ├── api/client.js      fetch wrapper (CSRF, retries, errors)
│   │   ├── context/           AuthContext
│   │   ├── hooks/             useAuth, useApi, useDebouncedValue, useDocumentTitle
│   │   ├── components/        reusable UI components (+ components.test.jsx)
│   │   ├── layouts/           PublicLayout, DashboardLayout
│   │   ├── pages/{public,patient,doctor,admin}/   25 routed pages (+ pages.test.jsx)
│   │   ├── utils/             formatting, validation, status labels
│   │   ├── App.jsx            routes
│   │   └── index.css          design tokens (Tailwind @theme)
│   ├── e2e/booking.spec.js    Playwright end-to-end tests
│   ├── vercel.json            SPA fallback + /api proxy
│   └── .env.example
├── server/                    Express API
│   ├── src/
│   │   ├── config/            env, db, hospital rules
│   │   ├── controllers/       request handlers
│   │   ├── middleware/        session, auth, csrf, validate, rate limits, errors, dbReady
│   │   ├── models/            Mongoose schemas
│   │   ├── routes/            Express routers
│   │   ├── services/          availability, appointments, stats (aggregation), audit
│   │   ├── utils/             ApiError, time, pagination, serializers, references
│   │   ├── validators/        zod schemas
│   │   ├── views/             EJS demo page
│   │   ├── app.js             middleware pipeline
│   │   └── server.js          HTTP server entry (Render/local)
│   ├── api/index.js           Vercel function entry
│   ├── scripts/               seed.js, seedData.js, createAdmin.js
│   ├── tests/                 Vitest + Supertest
│   ├── vercel.json
│   └── .env.example
├── docs/API.md · docs/DESIGN.md
├── render.yaml                optional Render blueprint for the API
├── PROJECT_STATUS.md · PROJECT_WALKTHROUGH.md · VIVA_PREPARATION.md · CLAUDE.md
└── README.md
```

## 17. Prerequisites

* Node.js 20 or newer (22 LTS recommended) and npm 10+
* MongoDB: either a free MongoDB Atlas cluster, or a local MongoDB **started as a replica set** (needed only for the transaction used when an admin creates a doctor; everything else works on a standalone server)
* Git

## 18. Installation

```bash
git clone https://github.com/anirudh-vitb/hospital-appointment-booking-system.git
cd hospital-appointment-booking-system
cd server && npm install && cd ..
cd client && npm install && cd ..
```

## 19. Environment configuration

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env      # optional; the default /api works in development
```

**Backend (`server/.env`)**

| Variable | Required | Meaning |
|---|---|---|
| `MONGODB_URI` | yes (production) | Atlas or local connection string. Defaults to `mongodb://127.0.0.1:27017/carepoint` in development. |
| `SESSION_SECRET` | yes (production) | Long random string used to sign the session cookie. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `FRONTEND_URL` | yes (production) | Exact frontend origin(s), comma-separated, no trailing slash. Used for CORS. |
| `NODE_ENV` | | `production` enables Secure cookies, trust proxy, combined logs |
| `PORT` | | Default 5000 |
| `HOSPITAL_TIMEZONE` | | Default `Asia/Kolkata` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for seed / create-admin | Administrator account |
| `SEED_DEMO_PASSWORD` | | Password for seeded demo accounts (default `CarePoint@2026`) |
| `CROSS_SITE_COOKIES` | | `true` only if the browser calls the API on another site directly (sets `SameSite=None`) |
| `TRUST_PROXY` | | Number of proxy hops to trust (default 1 in production) |
| `MONGODB_URI_TEST` | | Test database (name must contain `test`) |

**Frontend (`client/.env`)** — `VITE_API_BASE_URL` (default `/api`). Anything starting with `VITE_` is bundled into public JavaScript, so it must never contain secrets; the frontend has none.

## 20. MongoDB Atlas setup

1. Sign in at https://cloud.mongodb.com → **Create** a cluster → choose the **free (M0)** tier, provider AWS, region **Mumbai (ap-south-1)**.
2. **Database Access** → Add a database user (password authentication). Use a generated password without special URL characters, or URL-encode it.
3. **Network Access** → Add IP address → `0.0.0.0/0` (allow from anywhere). Free hosting platforms do not have fixed outbound IPs, so this is required; access is still protected by the user/password.
4. **Connect → Drivers** → copy the `mongodb+srv://…` string, insert the password and add the database name: `…mongodb.net/carepoint?retryWrites=true&w=majority`.
5. Put it in `server/.env` as `MONGODB_URI` (locally) and in the hosting dashboard (production).

## 21. Seeding the database

```bash
cd server
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='StrongPass123' npm run seed
```

Creates/updates 8 departments, 12 fictional doctors with weekly hours, 4 sample patients, the administrator, ~48 sample appointments around today's date (marked `isSample`) and one sample leave day. Safe to run repeatedly: records are upserted by slug/email, and only sample appointments are replaced — bookings made through the app are kept.

Create or reset only the administrator: `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run create-admin`.

## 22. Running locally

```bash
# terminal 1 – API on http://localhost:5000
cd server && npm run dev
# terminal 2 – React app on http://localhost:5173 (proxies /api and /demo to :5000)
cd client && npm run dev
```

Open http://localhost:5173. Server-rendered demo: http://localhost:5173/demo/server-info. Health: http://localhost:5000/api/health.

Production build of the frontend: `cd client && npm run build` (output in `client/dist`), preview with `npm run preview`.

## 23. Tests

| Command | What it runs |
|---|---|
| `cd server && npm test` | 60 API tests (Vitest + Supertest) against `carepoint_test` — refuses to run on a database whose name lacks "test". Needs MongoDB running as a replica set locally (for the doctor-creation transaction). |
| `cd server && npm run lint` | ESLint |
| `cd client && npm test` | 19 component/page tests (Vitest + React Testing Library) — no server needed |
| `cd client && npm run lint` | ESLint incl. React Hooks rules |
| `cd client && npm run test:e2e` | 4 Playwright end-to-end tests. Starts its own API (port 5055, database `carepoint_e2e`, re-seeded) and Vite (port 5180). Needs local MongoDB and `npx playwright install chromium` once. |

Quick local MongoDB replica set with Docker:
```bash
docker run -d --name mongo -p 27017:27017 mongo:7 --replSet rs0
docker exec mongo mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
```

Latest results are recorded in `PROJECT_STATUS.md`.

## 24. API

See [`docs/API.md`](docs/API.md) for every endpoint, its access level, inputs and error codes.

## 25. Demo accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Patient | `patient@carepoint.example` | `CarePoint@2026` (or your `SEED_DEMO_PASSWORD`) |
| Doctor | `lakshmi.narayana@carepoint.example` (works Mon–Sat) — every seeded doctor is `firstname.lastname@carepoint.example` | same |
| Administrator | the `ADMIN_EMAIL` you chose | the `ADMIN_PASSWORD` you chose — not published |

`.example` is a reserved domain, so these addresses can never belong to real people.

## 26. Deployment

The recommended free setup is **two Vercel projects + MongoDB Atlas**. (Render is an alternative for the API via `render.yaml`; its free instances sleep after 15 minutes idle and take up to a minute to wake — the frontend shows a "connecting to the server" banner and retries in that case.)

**A. Atlas** — follow §20 and keep the connection string.

**B. Let Vercel read the repository** — Vercel → Account Settings → **Authentication / Git** → connect the GitHub account that owns `anirudh-vitb/hospital-appointment-booking-system`, and make sure the **Vercel GitHub App** is installed for that repository (GitHub → Settings → Applications → Vercel → Repository access).

**C. Backend project** — Vercel → Add New → Project → import the repository →
* Project name: `carepoint-hospital-api` · Root Directory: `server` · Framework preset: **Other** · Build command: `npm run vercel-build` (seeds the database when `SEED_ON_BUILD=true`, and writes the small static `public/` folder Vercel requires)
* Environment variables: `NODE_ENV=production`, `MONGODB_URI=<Atlas string>`, `SESSION_SECRET=<random>`, `FRONTEND_URL=https://carepoint-vitb.vercel.app`, `HOSPITAL_TIMEZONE=Asia/Kolkata`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SEED_ON_BUILD=true`
* Deploy, then open `https://carepoint-hospital-api.vercel.app/api/health` → `"database":"connected"`.

**D. Seed Atlas** — either let the build do it (`SEED_ON_BUILD=true`, then redeploy), or from your computer: `cd server && MONGODB_URI='<Atlas string>' ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run seed`.

**E. Frontend project** — import the same repository again →
* Project name: `carepoint-vitb` · Root Directory: `client` · Framework preset: **Vite** (build `npm run build`, output `dist`)
* If Vercel gave the backend a different domain than `carepoint-hospital-api.vercel.app`, edit the two URLs in `client/vercel.json`, commit and push.
* If the frontend domain differs from `carepoint-vitb.vercel.app`, update `FRONTEND_URL` on the backend and redeploy it.

**F. Disable Vercel Authentication** for production on both projects if it is on (Settings → Deployment Protection), so evaluators can open the site.

**G. Verify** — `cd server && BASE_URL=https://carepoint-vitb.vercel.app ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run smoke` runs the main journey over HTTP; then check the UI by hand (checklist in `PROJECT_STATUS.md`): home page loads doctors, register, sign in/out, search, book, refresh, cancel, try booking a taken slot, patient blocked from `/admin`, `/demo/server-info` renders.

## 27. Known limitations

* Rate-limit counters live in memory per server instance; on serverless hosting each instance counts separately.
* No email/SMS notifications — patients see status changes when they open the app.
* Fixed-length slots only; a doctor changing slot length does not move existing bookings.
* Doctors blocking leave do not automatically cancel bookings already made in that period (the UI warns about this).
* One appointment per account at a given time; there is no family-member profile.
* Payments are not handled online.
* Free-tier hosting sleeps when idle, so the first request after a pause is slow.

## 28. Security notes and disclaimer

Implemented: bcrypt password hashing, server-side sessions in MongoDB, HttpOnly/Secure/SameSite cookies, session regeneration on login, CSRF tokens, role and ownership checks on every endpoint, zod validation that strips unknown fields, escaped regex search, rate limiting on login/registration/booking, Helmet security headers, CORS restricted to configured origins, generic login errors, no stack traces in production responses, secrets only in server environment variables.

This is an educational project. It is **not** certified or audited for handling real clinical records or for production healthcare use.

## 29. Academic attribution

Developed as an individual mini-project for **Full Stack Development – 2 (R-23)**, Department of Computer Science and Engineering, Vishnu Institute of Technology (Autonomous), Bhimavaram. Third-party software is used under its open-source licence (see `package.json` files): React, React Router, Vite, Tailwind CSS, lucide-react (ISC), Fontsource packages of Source Serif 4 and Public Sans (SIL Open Font License), Express, Mongoose, and the other listed libraries. No page templates or external images were used; doctor avatars are generated monograms. AI assistance (Claude Code) was used during development; disclose this according to your institution's rules.
