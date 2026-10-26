import { connectDB, dbState, lastConnectionError } from '../config/db.js';
import { ok } from '../utils/respond.js';

// Used by the hosting platform's health check and by the frontend to detect
// a sleeping (cold-started) backend. It tries to connect so the reported
// database state is current, but still answers if the database is down.
export async function health(req, res) {
  await connectDB().catch(() => {});
  ok(res, {
    status: 'ok',
    database: dbState(),
    databaseError: lastConnectionError() || undefined,
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
}
