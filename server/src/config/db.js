import mongoose from 'mongoose';
import env from './env.js';

mongoose.set('strictQuery', true);

let connectionPromise = null;

// Reuses one connection per process. On serverless platforms the module stays
// warm between invocations, so caching the promise avoids reconnecting on
// every request.
export function connectDB(uri = env.mongoUri) {
  if (!uri) return Promise.reject(new Error('MONGODB_URI is not set'));
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 10 })
      .catch((error) => {
        connectionPromise = null;
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
