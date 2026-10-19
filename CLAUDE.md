# CLAUDE.md — working notes for this repository

CarePoint: hospital appointment booking (React 19 + Vite / Express 5 + Mongoose 8 / MongoDB). Academic project for VIT Bhimavaram FSD-2 (R-23). Keep the prescribed stack; do not switch frameworks or databases.

## Layout
- `server/src` — `config/`, `models/`, `routes/` (thin), `controllers/`, `services/` (business rules), `middleware/`, `validators/schemas.js` (zod), `utils/`, `views/` (EJS demo only).
- `client/src` — `api/client.js` (only place that calls fetch), `hooks/useApi.js`, `context/AuthContext.jsx`, `components/`, `pages/{public,patient,doctor,admin}`.

## Conventions
- API responses: `{ success, data, meta? }` / `{ success:false, error:{ code, message, details? } }`; throw `ApiError` from controllers/services.
- Validate with `validate({ params, query, body })`; read values from `req.valid` (Express 5 `req.query` is read-only).
- Every state-changing request needs `X-CSRF-Token`; tests use `agentFor()` helpers in `server/tests/helpers.js`.
- Dates `YYYY-MM-DD` and times `HH:mm` in hospital time; UTC `startsAt` for ordering. Convert only in `server/src/utils/time.js`.
- Slot locking relies on the partial unique index on `{doctor, startsAt}` with `holdsSlot: true`; any status change must keep `holdsSlot` in sync.
- Styling: Tailwind v4 tokens in `client/src/index.css`; reusable classes are `@utility` (btn-primary, card, input…).
- Comments explain decisions, not the next line. UI copy is specific and plain.

## Commands
- Local Mongo (needs replica set for transactions): `docker run -d --name mongo -p 27017:27017 mongo:7 --replSet rs0` then `rs.initiate(...)`.
- `server`: `npm run dev`, `npm test` (uses `carepoint_test`), `npm run lint`, `npm run seed`.
- `client`: `npm run dev`, `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e` (in this sandbox: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`).

## Progress
See `PROJECT_STATUS.md`. All features implemented and tested locally; deployment pending owner actions (Atlas cluster, Vercel GitHub access).
