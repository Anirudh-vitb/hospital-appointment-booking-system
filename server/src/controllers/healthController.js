import { dbState } from '../config/db.js';
import { ok } from '../utils/respond.js';

// Used by the hosting platform's health check and by the frontend to detect
// a sleeping (cold-started) backend. Does not require the database.
export function health(req, res) {
  ok(res, {
    status: 'ok',
    database: dbState(),
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
}
