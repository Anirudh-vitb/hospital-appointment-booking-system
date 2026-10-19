import mongoose from 'mongoose';
import { afterAll, beforeAll } from 'vitest';
import env from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

// Safety guard: tests drop their database, so refuse to run against anything
// that is not clearly a test database.
beforeAll(async () => {
  if (!env.isTest) throw new Error('Tests must run with NODE_ENV=test');
  await connectDB();
  const name = mongoose.connection.name;
  if (!/test/i.test(name)) throw new Error(`Refusing to run tests against database "${name}"`);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

afterAll(async () => {
  await disconnectDB();
});
