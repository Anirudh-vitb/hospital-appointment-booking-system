import fs from 'node:fs';

// Loads server/.env during local development. Hosting platforms inject real
// environment variables instead, and existing variables are never overridden.
if (fs.existsSync('.env')) process.loadEnvFile('.env');

// Central place for environment configuration. Every other module reads
// settings from here instead of touching process.env directly.
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv,
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 5000,
  // Not enforced at startup: without it the API still boots, the health check
  // reports "not configured" and data routes answer 503, which is easier to
  // diagnose on a hosting dashboard than a crashing process.
  mongoUri: isTest
    ? process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/carepoint_test'
    : process.env.MONGODB_URI || (isProduction ? '' : 'mongodb://127.0.0.1:27017/carepoint'),
  // A weak fallback is acceptable only on a developer machine.
  sessionSecret: required('SESSION_SECRET', isProduction ? undefined : 'dev-only-session-secret-change-me'),
  // Comma-separated list so a Vercel preview URL can be allowed alongside production.
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),
  timezone: process.env.HOSPITAL_TIMEZONE || 'Asia/Kolkata',
  // Set to "true" only when the browser talks to this API directly from another
  // site (e.g. Render URL used without the Vercel proxy). Switches the cookie to
  // SameSite=None, which browsers only accept together with Secure.
  crossSiteCookies: process.env.CROSS_SITE_COOKIES === 'true',
};

export default env;
