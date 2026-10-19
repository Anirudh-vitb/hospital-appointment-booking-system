import { connectDB } from '../config/db.js';
import ApiError from '../utils/ApiError.js';

// Makes sure MongoDB is reachable before any route that needs it runs. On a
// cold start the first request waits for the connection; if Atlas cannot be
// reached the client gets a clear 503 instead of a hanging request.
export default async function dbReady(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('[db] connection failed:', error.message);
    next(new ApiError(503, 'DATABASE_UNAVAILABLE', 'The appointment database is not reachable right now. Please try again in a minute.'));
  }
}
