# CarePoint — Viva Preparation

Questions an examiner is likely to ask, with answers based on this codebase. Open the referenced file and be ready to show the lines.

## Design decisions

**1. Why React + Express + MongoDB instead of a full-stack framework?**
The R-23 FSD-2 syllabus covers React, Express and MongoDB separately (routing, middleware, sessions, CRUD, aggregation). Keeping them as separate layers makes each concept visible: `client/` is a pure SPA, `server/` is a REST API, MongoDB is accessed only through Mongoose models.

**2. Why sessions instead of JWT?**
The syllabus includes cookies and sessions. Server-side sessions can be revoked instantly (logout destroys the document in the `sessions` collection, and deactivating a user takes effect on the next request through `loadUser`). The browser only holds an opaque HttpOnly id, not a token JavaScript can read.

**3. Why are sessions stored in MongoDB?**
Memory sessions disappear on restart and are not shared between serverless instances. `connect-mongo` stores them in the same database with a TTL index. See `server/src/middleware/session.js` — the store reuses Mongoose's client.

**4. Why is the API proxied through the frontend domain?**
`client/vercel.json` rewrites `/api/*` to the backend. To the browser everything is one site, so the cookie is first-party and can use `SameSite=Lax`; browsers that block third-party cookies still work. Vite's dev proxy reproduces this locally.

**5. Why embed the weekly schedule in DoctorProfile but keep leave in a separate collection?**
The schedule is small, always read with the doctor and replaced as a whole. Leave entries accumulate over time and are queried by date, so they get their own collection with a `{ doctor, date }` index.

**6. Why store dates as strings like "2026-10-24" and times as "09:30"?**
They are wall-clock values in the hospital's timezone — what patients and doctors actually see. Storing them as strings means they never shift because of a server's or browser's timezone. `startsAt` (a real `Date` in UTC) is stored alongside for sorting and "is it in the future" checks. Conversion is in `server/src/utils/time.js`.

**7. Why deactivate doctors instead of deleting them?**
Appointments reference the doctor. Deleting would break history and statistics. `setDoctorStatus` (`adminController.js`) sets `isActive=false` on both the profile and the user, which hides the doctor and blocks sign-in.

**8. Why is there a class component when everything else uses hooks?**
`ErrorBoundary.jsx`: React supports `componentDidCatch`/`getDerivedStateFromError` only in class components.

## Double booking and concurrency

**9. How do you stop two patients booking the same slot?**
Two layers. First, `bookAppointment` recalculates availability on the server. Second, and decisive, a partial unique index `{ doctor: 1, startsAt: 1 }` with `partialFilterExpression: { holdsSlot: true }` (`models/Appointment.js`). If two inserts race, MongoDB lets only one succeed; the other throws error code 11000, which becomes `409 SLOT_TAKEN`.

**10. Why isn't the availability check enough?**
Check-then-insert has a race window: both requests can read "free" before either writes. Only a database constraint is atomic. The test "lets only one of many simultaneous requests win the same slot" fires five requests with `Promise.all` and expects exactly one 201.

**11. If cancelled appointments stay in the collection, how is the slot freed?**
Cancelling sets `holdsSlot: false`. The partial index only includes documents where `holdsSlot` is true, so the cancelled document no longer occupies the unique key.

**12. Why a `holdsSlot` boolean instead of a filter like `status: { $in: [...] }`?**
`$in` inside a partial index filter is only supported on newer MongoDB versions; equality on a boolean works everywhere and is simple to explain.

**13. What if a doctor confirms while the patient cancels at the same time?**
`changeStatus` uses `findOneAndUpdate({ _id, status: { $in: rule.from } }, …)`. The first update changes the status; the second no longer matches the filter, returns null, and the API replies `409 STATUS_CHANGED`.

**14. What happens on a double-click of "Book appointment"?**
The button is disabled while submitting, and even if two requests arrive, the second index `{ patient, startsAt }` (also partial on `holdsSlot`) rejects it with `PATIENT_TIME_CONFLICT`. Tested in "refuses a duplicate submission by the same patient".

## Security

**15. How are passwords stored?**
bcrypt with cost 12 (`User.setPassword`). `passwordHash` has `select: false`, so it is never loaded unless a query asks for it (`login`, `changePassword`).

**16. Can a user make themselves an admin by sending `role: "admin"` to register?**
No. `registerBody` (zod) strips unknown fields and `register` hard-codes `role: 'patient'`. Test: "always creates a patient, even if the request asks for another role".

**17. Where is the role checked?**
`requireRole(...)` in `middleware/auth.js`, applied in each router. `req.user` comes from the database on every request (`loadUser`), never from the client. Ownership is checked by `assertCanAccess` (patient owns it, or doctor is the booked doctor).

**18. Why does another patient get 404, not 403, for my appointment?**
So the API does not reveal which appointment ids exist (`assertCanAccess`).

**19. What is CSRF and how do you prevent it?**
A malicious site could submit a form to our API and the browser would attach the session cookie. We require an `X-CSRF-Token` header whose value matches a random token in the session (`middleware/csrf.js`). Another site can neither read the token nor set custom headers on a cross-site form post. `SameSite=Lax` cookies add a second layer.

**20. What is session fixation and how do you handle it?**
An attacker plants a known session id in a victim's browser and waits for them to log in. `startSession` calls `req.session.regenerate()` at login, so the authenticated session gets a brand-new id. A test checks the cookie value changes.

**21. How do you prevent NoSQL injection and regex abuse?**
zod validates types (e.g. ids must match `/^[a-f\d]{24}$/`, so an object like `{ "$gt": "" }` is rejected); Mongoose `strictQuery` is on; search text is escaped with `escapeRegex` before building a `RegExp`. Test: searching `.*` returns no doctors.

**22. How do you prevent XSS?**
React escapes all text it renders and we never use `dangerouslySetInnerHTML`. EJS uses `<%= %>` (escaped) for every value. Helmet sets a Content-Security-Policy on API responses, and the session cookie is HttpOnly.

**23. What does Helmet do here?**
Adds headers such as `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options`, and removes `X-Powered-By`.

**24. How is CORS configured?**
`app.js` allows only origins listed in `FRONTEND_URL`, with `credentials: true` and only the `Content-Type` and `X-CSRF-Token` headers. Unknown origins get no CORS headers.

**25. What is rate limiting used for?**
`authLimiter` (20 attempts per 15 minutes per IP) on login and register; `bookingLimiter` on bookings. Limitation: counters are per instance in memory.

## Express concepts

**26. Explain the middleware order in `app.js`.**
Security headers and CORS first, then logging, then body parsers. `/api/health` comes before `dbReady` so it works when the database is down. Inside `/api`: `dbReady` (connect or 503) → `sessionHandler` → `loadUser` → `verifyCsrf` → routers → `notFound`. `errorHandler` is last because Express identifies error handlers by their four arguments and calls them only after an error.

**27. How do async errors reach the error handler?**
Express 5 automatically forwards rejected promises from async handlers to `next(err)`, so controllers simply `throw new ApiError(...)`.

**28. What does `validate()` do and why `req.valid`?**
It parses `params`, `query` and `body` with zod schemas and places the cleaned values on `req.valid`. Express 5 makes `req.query` a read-only getter, so we don't overwrite it.

**29. Show the EJS demonstration.**
`GET /demo/server-info` renders `views/server-info.ejs` (with an `include` of `partials/styles.ejs`). Its form posts `application/x-www-form-urlencoded` to `POST /demo/availability`; `express.urlencoded()` fills `req.body`, the handler calls the same `getDaySlots` service as the API, and re-renders the template with results.

**30. What HTTP status codes do you use?**
200, 201 (created), 400 (validation), 401 (not signed in), 403 (wrong role / CSRF), 404, 409 (conflicts: slot taken, invalid transition, duplicates), 413, 429 (rate limit), 500, 503 (database unavailable).

## MongoDB concepts

**31. Which aggregation stages do you use and where?**
`statsService.js`: `$facet` (several summaries in one pass), `$group` with `$sum`, `$match`, `$sort`, `$limit`, `$count`, `$lookup` + `$unwind` + `$project` for appointments by department, `$substrBytes` to group by month. `departmentsWithDoctorCounts` uses a pipeline-style `$lookup` with `let`/`$expr` to count only active doctors.

**32. Why compute statistics in MongoDB rather than in the browser?**
Downloading every appointment would be slow and would leak data. Aggregation returns only small summaries.

**33. Explain one index and the query it supports.**
`{ isActive: 1, workingDays: 1 }` on doctor profiles supports `GET /api/doctors?availableOn=2026-10-24`: the date is converted to a weekday number and the filter is `{ isActive: true, workingDays: 5 }`.

**34. How does pagination work?**
`utils/query.js#paginate` turns `page`/`limit` into `skip`/`limit` (limit capped at 50); `countDocuments` with the same filter gives `total`, returned in `meta`. No endpoint returns an unbounded list.

**35. Where do you use a transaction?**
`createDoctor` in `adminController.js` creates the doctor's `User` and `DoctorProfile` inside `session.withTransaction`, so a failure never leaves a login without a profile. Transactions need a replica set — Atlas provides one; locally we start MongoDB with `--replSet`.

**36. Is the seed script safe to run twice?**
Yes. Departments are upserted by slug, users by email, profiles by user; only appointments with `isSample: true` and sample leave are deleted and recreated. Real bookings are untouched.

## React concepts

**37. How does the app know who is logged in after a refresh?**
`AuthProvider` calls `/api/auth/session` on mount; the cookie identifies the session. Until it answers, `status` is `loading` and `ProtectedRoute` shows a spinner instead of redirecting.

**38. How do protected routes work?**
`RoleBasedRoute` wraps `ProtectedRoute`: no user → `<Navigate to="/login" state={{ from: location }}>`; wrong role → redirect to that role's home. After login, `Login.jsx` sends the user back to `from` if it belongs to their role. This is only for user experience — the API checks again.

**39. Explain `useApi`.**
It builds a `requestKey` from path + params + a reload counter. The effect fetches with an `AbortController` and stores the result together with its key; `loading` is simply "the stored key isn't the current key". Aborting in the cleanup prevents an old slow response from overwriting a newer one.

**40. Why are directory filters in the URL?**
`useSearchParams` makes filtered results shareable and lets the Back button restore the previous filter. Typing is debounced (`useDebouncedValue`) and uses `replace` so each keystroke is not a history entry.

**41. How do child components send data up?**
Callbacks passed as props: `SlotPicker onSelect`, `DateStrip onSelect`, `DoctorSearch onSearch`, `AppointmentActions onUpdated`, `DoctorForm onSaved`.

**42. Where is conditional rendering most important?**
`AppointmentActions` shows only the actions allowed for the current status; `SlotPicker` disables taken slots; `Navbar` swaps sign-in links for the role dashboard link and sign-out; pages switch between skeleton, error, empty and data states.

## Debugging and testing

**43. Tell us about a bug you fixed.**
Example 1: the first version of the slot list overflowed the page on desktop because a flex/grid child with a horizontally scrolling date strip had no `min-width: 0`; adding `min-w-0` to the grid columns fixed it. Example 2: Tailwind v4 refused `@apply btn` inside `@layer components`; reusable classes had to be declared with `@utility`. Example 3: a test that "logout invalidates the session" originally passed even without logout because it never sent a valid cookie; it was rewritten to prove the cookie works before logout and fails after.

**44. How do the tests avoid touching real data?**
Tests run with `NODE_ENV=test`, which selects `MONGODB_URI_TEST` (default `carepoint_test`), and `tests/setup.js` throws if the database name lacks "test" before dropping it. End-to-end tests use a separate `carepoint_e2e` database.

**45. How do you test that the app survives a database outage?**
`tests/resilience.test.js` mocks `connectDB` to reject: `/api/doctors` returns 503 `DATABASE_UNAVAILABLE` without leaking the driver error, and `/api/health` still answers. On the frontend, the API client does not retry `DATABASE_UNAVAILABLE`, and pages show the message with a Retry button.

**46. What happens when the free server is asleep?**
GET requests retry with back-off on network/502/503/504 errors, and after 4 seconds `ServerWakeNotice` explains that the server is starting.

## Limitations and future work

**47. What would you add next?**
Email/SMS notifications, automatic handling of bookings when a doctor adds leave, family member profiles, a shared rate-limit store (e.g. Redis), online payment, and doctor-written prescriptions with stricter access control.

**48. Is this ready for a real hospital?**
No. It is an academic demonstration. Real health data needs audits, legal compliance, backups, monitoring and penetration testing that are outside this project's scope.
