import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import env from '../config/env.js';

export const SESSION_COOKIE = 'carepoint.sid';
const EIGHT_HOURS = 8 * 60 * 60 * 1000;

export const cookieOptions = {
  httpOnly: true, // not readable from JavaScript, so XSS cannot steal it
  secure: env.isProduction, // HTTPS only in production
  // Lax is enough when the frontend proxies /api through its own domain
  // (first-party cookie). A direct cross-site setup needs SameSite=None.
  sameSite: env.crossSiteCookies ? 'none' : 'lax',
  maxAge: EIGHT_HOURS,
  path: '/',
};

let sessionMiddleware = null;

// Built lazily, after the database connection exists, so the session store
// shares Mongoose's MongoClient instead of opening a second connection pool.
export function sessionHandler(req, res, next) {
  if (!sessionMiddleware) {
    sessionMiddleware = session({
      name: SESSION_COOKIE,
      secret: env.sessionSecret,
      resave: false,
      // No cookie is set until something is stored in the session.
      saveUninitialized: false,
      rolling: true,
      proxy: env.isProduction,
      cookie: cookieOptions,
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: 'sessions',
        ttl: EIGHT_HOURS / 1000,
        touchAfter: 10 * 60,
      }),
    });
  }
  return sessionMiddleware(req, res, next);
}

export function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

export function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}
