# Project status — CarePoint

_Last updated: 19 October 2026 · Submission deadline: 26 October 2026_

## Phase summary

| Phase | State |
|---|---|
| A. Inspection and planning | ✅ Done |
| B. Foundation (Express, Mongoose models, sessions, seed) | ✅ Done |
| C. Core booking (search, availability, booking, conflict prevention, patient dashboard) | ✅ Done |
| D. Role dashboards (doctor, administrator) | ✅ Done |
| E. UI polish, EJS demo, syllabus coverage | ✅ Done (desktop + mobile screenshots reviewed) |
| F. Verification (tests, build) | ✅ Done — results below |
| G. GitHub and deployment | ⚠️ Code pushed to branch `claude/great-ride-vk3k6u` (PR open). **Live deployment blocked on owner actions** — see below |
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

## Deployment — what is blocking a live URL

1. **MongoDB Atlas** cluster does not exist yet (no access from this environment). Owner must create it (README §20).
2. **Vercel cannot link the GitHub repository**: the Vercel account (`anirudhleetcode-max`) returned `repo_no_access` for `anirudh-vitb/hospital-appointment-booking-system`. Owner must connect that GitHub account / install the Vercel GitHub App on the repo (README §26 B).
3. Render's connector was unavailable in this session; `render.yaml` is provided as an alternative for the API.

Once 1 and 2 are done, follow README §26 C–G. Expected URLs: frontend `https://carepoint-hospital.vercel.app`, API `https://carepoint-hospital-api.vercel.app`.

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

Owner: create the Atlas cluster and fix Vercel ↔ GitHub access, then deploy following README §26 (or share the Atlas connection string privately in a new session so the deployment can be completed and verified).
