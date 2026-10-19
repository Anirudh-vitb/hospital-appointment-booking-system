import crypto from 'node:crypto';
import ApiError from '../utils/ApiError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Synchronizer-token CSRF protection. The token lives in the server-side
// session and is handed to the SPA through GET /api/auth/session. A forged
// form on another site can make the browser send the cookie, but it cannot
// read the token or set the custom X-CSRF-Token header.
export function issueCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

export function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const expected = req.session?.csrfToken;
  const received = req.get('x-csrf-token');
  if (
    expected &&
    received &&
    expected.length === received.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  ) {
    return next();
  }
  next(new ApiError(403, 'CSRF_INVALID', 'Your session security token has expired. Reload the page and try again.'));
}
