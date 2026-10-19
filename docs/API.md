# CarePoint REST API reference

Base path: `/api`. All responses are JSON.

```jsonc
// success
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
// error
{ "success": false, "error": { "code": "SLOT_TAKEN", "message": "This time was just booked…", "details": [{ "field": "email", "message": "…" }] } }
```

**Authentication** uses the `carepoint.sid` session cookie (HttpOnly). Browsers must send `credentials: 'include'`.
**CSRF:** every `POST`, `PUT`, `PATCH` and `DELETE` must carry the header `X-CSRF-Token` with the token returned by `GET /api/auth/session` (or by login/register). Missing or wrong token → `403 CSRF_INVALID`.

Roles: 🌐 public · 🧑 patient · 🩺 doctor · 🛡 admin. Source: `server/src/routes/*.js`.

## Health and public information

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | 🌐 | `{ status, database, uptimeSeconds, time }`. Works even when MongoDB is down. |
| GET | `/api/public/summary` | 🌐 | Hospital contact info, booking rules, counts of active doctors/departments/specialties. |

## Authentication — `authRoutes.js`

| Method | Path | Access | Body | Notes |
|---|---|---|---|---|
| GET | `/api/auth/session` | 🌐 | – | `{ user \| null, csrfToken }`. Called once when the SPA starts. |
| POST | `/api/auth/register` | 🌐 | `{ name, email, phone, password }` | Always creates a **patient**. 201. Rate-limited. 409 `EMAIL_TAKEN`. |
| POST | `/api/auth/login` | 🌐 | `{ email, password }` | Regenerates the session id. 401 `INVALID_CREDENTIALS`. Rate-limited (20 / 15 min / IP). |
| POST | `/api/auth/logout` | any | – | Destroys the session in MongoDB and clears the cookie. |

## Patient profile — `patientRoutes.js`

| Method | Path | Access | Body |
|---|---|---|---|
| GET | `/api/patients/me` | 🧑 | – |
| PATCH | `/api/patients/me` | 🧑 | `{ name?, phone?, patientProfile?: { dateOfBirth, gender, address, emergencyContact } }` |
| PUT | `/api/patients/me/password` | 🧑 | `{ currentPassword, newPassword }` |

## Departments — `departmentRoutes.js`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/departments` | 🌐 | Active departments with `doctorCount` (aggregation `$lookup`). Admin may add `?includeInactive=true`. |
| GET | `/api/departments/:slug` | 🌐 | Department plus its active doctors. |
| POST | `/api/departments` | 🛡 | `{ name, slug?, description?, icon?, floor? }` → 201; 409 if name/slug exists. |
| PATCH | `/api/departments/:id` | 🛡 | Partial update; `isActive:false` refused (409 `DEPARTMENT_IN_USE`) while active doctors remain. |

## Doctor directory — `doctorRoutes.js`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/doctors` | 🌐 | Query: `q` (name/specialty, case-insensitive), `department` (slug or id), `specialty`, `availableOn` (YYYY-MM-DD), `sort` = `name`\|`experience`\|`fee`, `page`, `limit` (≤ 50). Paginated. |
| GET | `/api/doctors/featured` | 🌐 | Up to 4 featured doctors. |
| GET | `/api/doctors/specialties` | 🌐 | Distinct specialties. |
| GET | `/api/doctors/:id` | 🌐 | Public profile and weekly schedule (no email/phone). |
| GET | `/api/doctors/:id/slots?date=YYYY-MM-DD` | 🌐 | `{ date, isWorkingDay, blockedAllDay, blockReason?, slots: [{ start, end, status }] }` with status `available`, `booked`, `blocked` or `past`. Never reveals who booked. |

## Doctor availability (own schedule only) — `availabilityRoutes.js`

| Method | Path | Access | Body |
|---|---|---|---|
| GET | `/api/availability/me` | 🩺 | – |
| PUT | `/api/availability/me/schedule` | 🩺 | `{ slotMinutes ∈ {10,15,20,30,45,60}, weeklySchedule: [{ dayOfWeek 0–6, start "HH:mm", end "HH:mm" }] }` — overlapping blocks are rejected. |
| GET | `/api/availability/me/exceptions` | 🩺 | Upcoming blocked dates/times. |
| POST | `/api/availability/me/exceptions` | 🩺 | `{ date, start?, end?, reason? }` — no times = whole day. |
| DELETE | `/api/availability/me/exceptions/:id` | 🩺 | 404 if it belongs to another doctor. |

## Appointments — `appointmentRoutes.js`

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/appointments` | 🧑 | `{ doctorId, date, startTime, reason }`. Server recalculates availability. 201 with reference. 409 `SLOT_TAKEN` / `SLOT_UNAVAILABLE` / `PATIENT_TIME_CONFLICT`; 400 `SLOT_INVALID`, `DATE_IN_PAST`, `DATE_TOO_FAR`. |
| GET | `/api/appointments/mine` | 🧑 | `scope` = `upcoming` (default) \| `past` \| `all`, `status`, `page`, `limit`. |
| GET | `/api/appointments/doctor` | 🩺 | `scope` = `today` \| `upcoming` \| `past` \| `all`, `date`, `status`, paging. Only the doctor's own. |
| GET | `/api/appointments/doctor/summary` | 🩺 | Aggregated counts for the doctor dashboard. |
| GET | `/api/appointments/:id` | 🧑 🩺 🛡 | Owner patient, the booked doctor, or admin; otherwise 404. |
| PATCH | `/api/appointments/:id/cancel` | 🧑 🩺 🛡 | `{ reason? }` (reason required for doctor/admin). Patients: up to 2 h before start. Releases the slot. |
| PATCH | `/api/appointments/:id/status` | 🩺 🛡 | `{ action: confirm \| reject \| complete \| cancel, note? }`. Allowed transitions: pending→confirmed/rejected/cancelled, confirmed→completed/cancelled. `complete` only after start time. |
| PATCH | `/api/appointments/:id/notes` | 🩺 | `{ doctorNotes }` — private notes, never shown to the patient. |

## Administration — `adminRoutes.js` (all 🛡)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/stats` | Aggregation pipelines: patients, active/inactive doctors, totals, by status, last 14 days, by month, by department. |
| GET | `/api/admin/doctors` | Same filters as the directory, plus `includeInactive=true`; includes login email. |
| POST | `/api/admin/doctors` | Creates User (role doctor) + DoctorProfile in one transaction. |
| PATCH | `/api/admin/doctors/:id` | Update profile fields. |
| PATCH | `/api/admin/doctors/:id/status` | `{ isActive }` — deactivation also blocks sign-in; returns count of open future appointments. |
| GET | `/api/admin/appointments` | `q` (reference, patient name/email), `status`, `doctor`, `department`, `from`, `to`, `sort` = `date_desc`\|`date_asc`\|`created_desc`, paging. |
| GET | `/api/admin/audit-logs` | `action` (prefix such as `appointment`), `role`, paging. |

## Server-rendered demonstration (EJS) — `demoRoutes.js`

| Method | Path | Notes |
|---|---|---|
| GET | `/demo/server-info` | HTML page rendered with EJS: runtime info, database state, doctor list. |
| POST | `/demo/availability` | `application/x-www-form-urlencoded` form `doctorId`, `date`; re-renders the page with that day's slots. Read-only, public data. |

## Error codes worth knowing

`UNAUTHENTICATED` 401 · `FORBIDDEN` 403 · `CSRF_INVALID` 403 · `NOT_FOUND` 404 · `ROUTE_NOT_FOUND` 404 · `BAD_REQUEST` 400 (with `details`) · `RATE_LIMITED` 429 · `DATABASE_UNAVAILABLE` 503 · `INTERNAL_ERROR` 500.
