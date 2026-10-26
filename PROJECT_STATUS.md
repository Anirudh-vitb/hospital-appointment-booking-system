# Project status — CarePoint

_Last updated: 26 October 2026 · Submission deadline: 26 October 2026_

## Phase summary

| Phase | State |
|---|---|
| A. Inspection and planning | ✅ Done |
| B. Foundation (Express, Mongoose models, sessions, seed) | ✅ Done |
| C. Core booking (search, availability, booking, conflict prevention, patient dashboard) | ✅ Done |
| D. Role dashboards (doctor, administrator) | ✅ Done |
| E. UI polish, EJS demo, syllabus coverage | ✅ Done (desktop + mobile screenshots reviewed) |
| F. Verification (tests, build) | ✅ Done — results below |
| G. GitHub and deployment | ⚠️ Code on `main`; frontend and API live on Vercel; **database connection blocked by Atlas network access** — see below |
| H. Handover docs | ✅ README, docs/API.md, docs/DESIGN.md, PROJECT_WALKTHROUGH.md, VIVA_PREPARATION.md |

## Tests actually run (19 Oct 2026, local, MongoDB 7 replica set in Docker, Node 22)

| Suite | Command | Result |
|---|---|---|
| API | `cd server && npm test` | **60 / 60 passed** (5 files) |
| UI | `cd client && npm test` | **19 / 19 passed** (2 files) |
| End-to-end | `cd client && npm run test:e2e` | **4 / 4 passed** (Chromium) |
| Lint | `npm run lint` in server and client | no errors, no warnings |
| Production build | `cd client && npm run build` | succeeded |
| Production mode without DB | `NODE_ENV=production node src/server.js` | health reports `not configured`, data routes return 503 (no crash) |
| Secret scan | grep of `client/dist` and tracked files | no connection strings or secrets |

## Deployment status (26 Oct 2026)

| Part | URL | State |
|---|---|---|
| Frontend (Vercel project `carepoint-vitb`) | https://carepoint-vitb.vercel.app | ✅ Live; SPA routes and the `/api` + `/demo` proxy verified from a Vercel sandbox |
| API (Vercel project `carepoint-hospital-api`) | https://carepoint-hospital-api.vercel.app/api/health | ✅ Running; environment variables set (incl. `MONGODB_URI`, set by the owner) |
| Database (Atlas `carepoint-cluster`) | – | ❌ Atlas refuses connections from Vercel (`tlsv1 alert internal error`, the IP-access-list rejection). Network Access must contain `0.0.0.0/0` with status **Active** |

Notes:
- Vercel cannot link the GitHub repository (`repo_no_access`), so deployments are created from the public repository via the Vercel API rather than on every push. Installing the Vercel GitHub App on the repository would enable automatic deploys.
- `carepoint-hospital.vercel.app` belongs to an unrelated project, hence the `carepoint-vitb` name.
- After network access works: redeploy the API (`SEED_ON_BUILD=true` seeds Atlas), then run `npm run smoke` (see README §26 G).

## Live verification checklist (tick after deploying)

- [ ] `/api/health` on the API shows `"database":"connected"`
- [ ] Atlas seeded (`npm run seed` with the Atlas URI and admin credentials)
- [ ] Home page shows departments, "Seeing patients today" and featured doctors
- [ ] Register a new patient; sign out; sign in again; refresh keeps you signed in
- [ ] Search "cardio" and filter by a date
- [ ] Book a slot; refresh; it appears under Upcoming
- [ ] Sign in as `lakshmi.narayana@carepoint.example` in another browser and confirm it
- [ ] Patient sees "Confirmed"; cancel it; the time is free again
- [ ] Try booking a slot that is already taken → "That time is no longer available"
- [ ] As a patient open `/admin` → redirected; admin can open `/admin`
- [ ] `/demo/server-info` renders and its form works
- [ ] Fresh private window works; no errors in Vercel logs
- [ ] Record final URLs in README and submit the Google Form

## Outstanding issues / limitations

See README §27. No known failing tests.

## Exact next action

Owner: in Atlas → Network Access, make sure `0.0.0.0/0` is listed and **Active** for the project that contains `carepoint-cluster`. Then redeploy the API to seed, and run the smoke test.
