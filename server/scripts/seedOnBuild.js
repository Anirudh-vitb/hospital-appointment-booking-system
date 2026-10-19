// Runs during a hosting build (`npm run vercel-build`). Seeds the database only
// when SEED_ON_BUILD=true and MONGODB_URI is set, so normal deploys and builds
// without database access are unaffected. Useful when the database cannot be
// reached from a developer machine but can be reached from the build servers.
import { seed } from './seed.js';
import { disconnectDB } from '../src/config/db.js';

if (process.env.SEED_ON_BUILD !== 'true' || !process.env.MONGODB_URI) {
  console.log('[seed-on-build] skipped (set SEED_ON_BUILD=true and MONGODB_URI to enable)');
} else {
  try {
    await seed();
    console.log('[seed-on-build] done');
  } catch (error) {
    // A failed seed should not block the deploy; the API reports DB status at /api/health.
    console.error('[seed-on-build] failed:', error.message);
  } finally {
    await disconnectDB();
  }
}
