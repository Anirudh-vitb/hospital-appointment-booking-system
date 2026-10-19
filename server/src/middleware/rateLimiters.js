import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const tooMany = (message) => ({
  success: false,
  error: { code: 'RATE_LIMITED', message },
});

// Counters are kept in memory per server instance — good enough to slow down
// password guessing on a single free-tier instance.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest && process.env.ENABLE_RATE_LIMIT_IN_TESTS !== 'true',
  message: tooMany('Too many sign-in attempts from this network. Wait 15 minutes and try again.'),
});

export const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: tooMany('Too many booking attempts in the last hour. Please try again later.'),
});
