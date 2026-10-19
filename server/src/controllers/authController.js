import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/respond.js';
import { issueCsrfToken } from '../middleware/csrf.js';
import { SESSION_COOKIE, cookieOptions, destroySession, regenerateSession } from '../middleware/session.js';
import { audit } from '../services/auditService.js';

// Called once when the React app starts: returns the signed-in user (or null)
// and the CSRF token the app must send with every state-changing request.
export function getSession(req, res) {
  ok(res, { user: req.user ? req.user.toSafeJSON() : null, csrfToken: issueCsrfToken(req) });
}

async function startSession(req, user) {
  // A fresh session id after login prevents session fixation: an id planted
  // before login is never promoted to an authenticated session.
  await regenerateSession(req);
  req.session.userId = user._id.toString();
  req.user = user;
  return issueCsrfToken(req);
}

// Public registration always creates a patient. The role is not read from
// the request body (the validator strips unknown fields anyway).
export async function register(req, res) {
  const { name, email, phone, password } = req.valid.body;
  const user = new User({ name, email, phone, role: 'patient' });
  await user.setPassword(password);
  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict('EMAIL_TAKEN', 'An account with this email already exists. Sign in instead.');
    }
    throw error;
  }
  const csrfToken = await startSession(req, user);
  await audit(req, { action: 'user.register', entityType: 'User', entityId: user._id, summary: `Patient account created for ${email}` });
  created(res, { user: user.toSafeJSON(), csrfToken });
}

export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message whether the email or the password is wrong, so the login
  // form cannot be used to discover registered emails.
  const valid = user && user.isActive && (await user.checkPassword(password));
  if (!valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');

  user.lastLoginAt = new Date();
  await user.save();
  const csrfToken = await startSession(req, user);
  await audit(req, { action: 'user.login', entityType: 'User', entityId: user._id, summary: `${user.role} signed in` });
  ok(res, { user: user.toSafeJSON(), csrfToken });
}

export async function logout(req, res) {
  if (req.user) {
    await audit(req, { action: 'user.logout', entityType: 'User', entityId: req.user._id, summary: `${req.user.role} signed out` });
  }
  await destroySession(req);
  const { maxAge, ...clearOptions } = cookieOptions; // eslint-disable-line no-unused-vars
  res.clearCookie(SESSION_COOKIE, clearOptions);
  ok(res, { signedOut: true });
}
