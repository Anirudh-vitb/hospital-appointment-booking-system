import mongoose from 'mongoose';
import env from './env.js';

mongoose.set('strictQuery', true);

let connectionPromise = null;
let lastError = null;

// A short, secret-free description of why the last connection attempt failed,
// shown by /api/health so a misconfigured deployment can be diagnosed.
function describe(error) {
  const text = `${error?.name} ${error?.message}`;
  if (/auth/i.test(text)) return 'authentication failed (check the database user and password in MONGODB_URI)';
  if (/Invalid scheme|URI|parse|malformed|Password contains unescaped/i.test(text)) return 'invalid connection string';
  if (/ENOTFOUND|querySrv|ENODATA/i.test(text)) return 'cluster host not found';
  if (/tls|SSL|ECONNRESET|timed out|Server selection/i.test(text)) return 'network blocked or timed out (check Atlas Network Access)';
  return 'connection failed';
}

export function lastConnectionError() {
  return lastError;
}

// Reuses one connection per process. On serverless platforms the module stays
// warm between invocations, so caching the promise avoids reconnecting on
// every request.
export function connectDB(uri = env.mongoUri) {
  if (!uri) return Promise.reject(new Error('MONGODB_URI is not set'));
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 10 })
      .then((connection) => {
        lastError = null;
        return connection;
      })
      .catch((error) => {
        connectionPromise = null;
        lastError = describe(error);
        throw error;
      });
  }
  return connectionPromise;
}

export async function disconnectDB() {
  connectionPromise = null;
  await mongoose.disconnect();
}

export function dbState() {
  if (!env.mongoUri) return 'not configured';
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}
