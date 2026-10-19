# CarePoint — Project Walkthrough

A guided tour of the code for the project review and viva. Every statement here refers to a file in this repository; open the file while reading.

## 1. Problem statement

Outpatient desks often run on queues and paper slips: patients cannot see in advance when a doctor is free, desk staff can accidentally promise the same time twice, and nobody has a reliable record of who booked, cancelled or confirmed what. CarePoint lets patients book a free slot themselves, gives doctors control of their hours, and guarantees in the database that one slot holds one patient.

## 2. Objectives

1. React SPA + Express REST API + MongoDB, all features backed by real data.
2. Availability computed on the server from schedules, leave and bookings.
3. No double booking under concurrent requests.
4. Session-based authentication; patient, doctor and admin permissions enforced on the server.
5. Demonstrate the R-23 FSD-2 syllabus in working features; deploy on free hosting.

## 3. Architecture overview

```
React (client/)  ──fetch /api/* with cookie + X-CSRF-Token──▶  Express (server/)  ──Mongoose──▶  MongoDB
```

In production the frontend host rewrites `/api/*` to the backend, so the browser sees a single origin and the session cookie is first-party (`client/vercel.json`). In development Vite does the same (`client/vite.config.js` → `server.proxy`).

The Express request pipeline is assembled in `server/src/app.js`:

```
helmet → cors → morgan → express.json → express.urlencoded
   /api/health  (no database needed)
   /demo/*      dbReady → EJS routes
   /api/*       dbReady → sessionHandler → loadUser → verifyCsrf → routers → notFound
errorHandler
```

## 4. Frontend vs backend responsibilities

| Frontend (`client/src`) | Backend (`server/src`) |
|---|---|
| Pages, navigation, forms and their state | Every business rule and permission check |
| Instant validation for usability (`utils/validation.js`) | Authoritative validation (`validators/schemas.js`) |
| Shows slots returned by the API | Calculates slots (`services/availabilityService.js`) |
| Hides buttons a role cannot use | Rejects the request anyway (`middleware/auth.js`, `assertCanAccess`) |
| Formats dates/times for display (`utils/format.js`) | Converts between hospital time and UTC (`utils/time.js`) |

## 5. MongoDB collection design (`server/src/models/`)

* **User** — name, email (unique), phone, `passwordHash` (`select:false`), role, isActive, embedded `patientProfile`.
* **Department** — name, slug, description, icon name, floor, isActive.
* **DoctorProfile** — `user` → User, `department` → Department, specialty, qualifications, fee, room, embedded `weeklySchedule` blocks, `workingDays` (kept in sync in a `pre('save')` hook for indexed filtering), `slotMinutes`, isFeatured, isActive. `displayName` duplicates the doctor's name so the directory can search and sort without a join.
* **AvailabilityException** — doctor, date, optional start/end (none = whole day), reason.
* **Appointment** — reference, patient, doctor, department, `date`/`startTime`/`endTime` (hospital wall-clock), `startsAt`/`endsAt` (UTC), reason, fee, status, `holdsSlot`, embedded `history`, `statusNote`, `doctorNotes`, `isSample`.
* **AuditLog** — actor, role, action, entity, summary, IP.
* **sessions** — created by connect-mongo; a TTL index removes expired sessions.

## 6. Important API endpoints (full list: `docs/API.md`)

| Endpoint | Why it matters |
|---|---|
| `GET /api/auth/session` | Bootstraps the SPA: current user + CSRF token |
| `POST /api/auth/login` | bcrypt check, session regeneration |
| `GET /api/doctors?q=&department=&availableOn=` | Search, filter, sort, paginate |
| `GET /api/doctors/:id/slots?date=` | Server-side availability |
| `POST /api/appointments` | Booking with re-validation and unique-index protection |
| `PATCH /api/appointments/:id/status` | Doctor/admin state transitions |
| `PATCH /api/appointments/:id/cancel` | Cancellation that frees the slot |
| `GET /api/admin/stats` | Aggregation pipelines |
| `GET /demo/server-info`, `POST /demo/availability` | EJS + URL-encoded form demonstration |

## 7. Authentication and session flow

1. `AuthProvider` (`client/src/context/AuthContext.jsx`) calls `GET /api/auth/session` on load. `getSession` (`server/src/controllers/authController.js`) returns `user` (or null) and calls `issueCsrfToken`, which stores a random token in the session. Storing something makes express-session save the session in MongoDB and set the `carepoint.sid` cookie.
2. `login` finds the user by email (`select('+passwordHash')`), compares with bcrypt, then `startSession` calls `req.session.regenerate()` (session fixation defence), saves `userId`, and returns a fresh CSRF token. The client stores the token in memory (`setCsrfToken` in `api/client.js`).
3. Every later request: `sessionHandler` loads the session; `loadUser` loads the User from MongoDB and drops the session if the account is inactive; `verifyCsrf` compares the header and session token with `crypto.timingSafeEqual` for non-GET requests; routers use `requireAuth`/`requireRole`.
4. `logout` writes an audit entry, calls `req.session.destroy()` and `res.clearCookie`. The client then requests a new anonymous session to get a new CSRF token.
5. If a request returns 401, the API client broadcasts `carepoint:session` with `null`, and `AuthContext` clears the user so route guards send the visitor to `/login`.

Cookie options are in `server/src/middleware/session.js`: `httpOnly`, `secure` in production, `sameSite: 'lax'` (or `'none'` with `CROSS_SITE_COOKIES=true`), 8-hour rolling `maxAge`.

## 8. Appointment booking flow

UI (`client/src/pages/patient/BookAppointment.jsx`):
1. Load the doctor (`useApi('/doctors/:id')`).
2. `DateStrip` shows 14 days; days not in `doctor.workingDays` are disabled.
3. Selecting a date triggers `useApi('/doctors/:id/slots', { date })`; `SlotPicker` renders slots grouped into morning/afternoon/evening, disabling unavailable ones.
4. Reason is validated, then a `ConfirmationDialog` asks for confirmation.
5. `apiPost('/appointments', …)`. On success → `/patient/appointments/:id/confirmation` with the result in router state. On `SLOT_TAKEN`/`SLOT_UNAVAILABLE`/`SLOT_INVALID` the selected slot is cleared and the slot list reloaded, with a specific message.

Server (`server/src/services/appointmentService.js#bookAppointment`):
1. Load active doctor → 404 otherwise.
2. `getDaySlots` (availabilityService) checks the date window, builds slots from schedule blocks, loads leave and slot-holding appointments for that date, labels each slot.
3. Reject if the time is not a slot (400) or not `available` (409 with a reason-specific message).
4. Insert with a random reference (`utils/reference.js`), initial history entry, fee copied from the doctor.
5. Map duplicate-key errors: doctor index → `SLOT_TAKEN`, patient index → `PATIENT_TIME_CONFLICT`, reference index → retry.

## 9. Double-booking prevention

* Partial unique index `unique_active_doctor_slot` on `{ doctor: 1, startsAt: 1 }` where `holdsSlot: true` (`server/src/models/Appointment.js`).
* `holdsSlot` is `true` for pending/confirmed/completed and `false` for cancelled/rejected; set in `pre('validate')` on create and explicitly in `changeStatus`'s update.
* The availability check alone would have a race window (check-then-insert). The index closes it: MongoDB checks uniqueness atomically during the insert.
* Status changes use `findOneAndUpdate({ _id, status: { $in: allowedFrom } }, …)` so two people changing the same appointment cannot both succeed.
* Evidence: `server/tests/appointments.test.js` "lets only one of many simultaneous requests win the same slot" and "refuses a duplicate submission by the same patient"; `client/e2e/booking.spec.js` "a stale page cannot double-book".

## 10. React hooks used and why

| Hook | Where | Why |
|---|---|---|
| `useState` | Every form and page | Form values, selected date/slot, dialog visibility, saving/error flags |
| `useEffect` | `useApi` (fetch with `AbortController` cleanup), `Navbar` (Escape key listener), `ServerWakeNotice` and `AuthContext` (window event listeners), `ConfirmationDialog` (calls `showModal`), `Doctors.jsx` (sync debounced search to the URL), `useDocumentTitle` | Synchronising with things outside React: network, DOM APIs, browser events, URL |
| `useContext` | `useAuth` → `AuthContext` | Current user and login/logout shared without prop drilling |
| `useRef` | `ConfirmationDialog` (dialog element, note textarea), `Login` (focus first invalid field), `BookAppointment` (scroll to slots), `DoctorSearch` (blur input) | Direct DOM access |
| `useCallback`/`useMemo` | `AuthContext`, `useApi` | Stable function identities so effects and consumers do not re-run needlessly |
| `useId` | `FormField` | Unique ids linking labels, inputs and error messages |
| `useSearchParams`, `useParams`, `useNavigate`, `useLocation` | Pages | Router state in the URL; redirects after login and booking |
| Custom: `useApi`, `useAuth`, `useDebouncedValue`, `useDocumentTitle` | `client/src/hooks/` | Reused logic; `useApi` derives `loading` from a request key instead of setting state at the start of the effect |

The one class component, `ErrorBoundary.jsx`, exists because React offers error boundaries only as classes.

## 11. CRUD operations implemented

| Entity | Create | Read | Update | Delete / deactivate |
|---|---|---|---|---|
| Doctor | `POST /api/admin/doctors` (transaction: User + profile) | directory, profile, admin list | `PATCH /api/admin/doctors/:id`, doctor's own schedule `PUT /api/availability/me/schedule` | `PATCH …/status` (soft deactivate, keeps history) |
| Department | `POST /api/departments` | list with counts, by slug | `PATCH /api/departments/:id` | deactivate via `isActive` |
| Appointment | `POST /api/appointments` | patient/doctor/admin lists, details | status transitions, doctor notes | cancel (record kept, slot released) |
| Blocked time | `POST /api/availability/me/exceptions` | list | – | `DELETE /api/availability/me/exceptions/:id` |
| User/profile | register | session, profile | profile, password | admin deactivation of doctors |

Records referenced by appointments are deactivated rather than deleted so history stays valid.

## 12. Testing strategy

* **API (60 tests, `server/tests/`)** — real Express app via Supertest against the `carepoint_test` database, dropped and re-seeded per file; a guard refuses any database without "test" in its name. Covers validation, sessions, logout replay, CSRF, roles, CRUD, slot rules (pure unit tests on `buildSlots`/`labelSlots`), concurrency, transitions, aggregation, audit logs, and a mocked database outage.
* **UI (19 tests, `client/src/**/*.test.jsx`)** — React Testing Library with a fake `AuthContext` and mocked `fetch`: cards, search callback, slot selection, loading/error components, navbar per role, login/registration validation, directory search, route guards.
* **End-to-end (4 tests, `client/e2e/booking.spec.js`)** — Playwright starts the real API on an isolated seeded database plus Vite, then: patient searches → profile → date/slot → books → sees it after reload; doctor confirms in a separate browser; patient sees "Confirmed" → cancels → slot is free again; stale page double-booking is refused; patient cannot enter `/admin` and gets 403 from the API; admin sees statistics and audit entries.

## 13. Deployment process

See README §26: Atlas cluster → Vercel backend project (root `server`, env vars) → seed Atlas → Vercel frontend project (root `client`, rewrites in `client/vercel.json`) → verify the checklist in `PROJECT_STATUS.md`. `render.yaml` describes the alternative Render backend.

## 14. Known limitations

In-memory rate-limit counters, no notifications, fixed slot lengths, leave does not auto-cancel existing bookings, no family profiles, no online payment, free-tier cold starts. See README §27.

## 15. Files to read before the viva

1. `server/src/app.js` — middleware order.
2. `server/src/middleware/session.js`, `csrf.js`, `auth.js` — sessions and permissions.
3. `server/src/models/Appointment.js` — indexes, `holdsSlot`.
4. `server/src/services/availabilityService.js` and `appointmentService.js` — the core logic.
5. `server/src/services/statsService.js` — aggregation.
6. `server/src/controllers/doctorController.js#buildDoctorFilter` — queries.
7. `client/src/api/client.js` and `client/src/hooks/useApi.js` — how React talks to Express.
8. `client/src/context/AuthContext.jsx`, `components/RoleBasedRoute.jsx`, `App.jsx` — auth and routing.
9. `client/src/pages/patient/BookAppointment.jsx` — the main workflow.
10. `server/tests/appointments.test.js` — proof of the concurrency claim.
