import app from './app.js';
import env from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

const server = app.listen(env.port, () => {
  console.log(`[server] CarePoint API listening on port ${env.port} (${env.nodeEnv})`);
});

// Connect eagerly so the first visitor does not pay the connection cost. If
// it fails the server still starts; dbReady retries on the next request.
connectDB()
  .then(() => console.log('[db] connected'))
  .catch((error) => console.error('[db] initial connection failed:', error.message));

function shutdown(signal) {
  console.log(`[server] ${signal} received, closing`);
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
