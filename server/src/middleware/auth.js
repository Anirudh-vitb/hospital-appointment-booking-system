import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

// Reads the user id stored in the session and loads the user from MongoDB on
// every request. The role used for authorisation therefore always comes from
// the database, never from the request body, query string or client storage.
export async function loadUser(req, res, next) {
  const userId = req.session?.userId;
  if (!userId) return next();

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    // Account was deactivated or deleted after login: end the session.
    delete req.session.userId;
    return next();
  }
  req.user = user;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}
