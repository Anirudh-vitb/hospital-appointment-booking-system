import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Simulates MongoDB being unreachable (e.g. Atlas paused or network down).
vi.mock('../src/config/db.js', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, connectDB: vi.fn(() => Promise.reject(new Error('querySrv ENOTFOUND'))), dbState: () => 'disconnected' };
});

const { default: app } = await import('../src/app.js');

describe('database failure handling', () => {
  it('answers API calls with a clear 503 instead of hanging or crashing', async () => {
    const res = await request(app).get('/api/doctors');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(res.body.error.message).not.toMatch(/ENOTFOUND/);
  });

  it('keeps the health check available and reports the database state', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.database).toBe('disconnected');
  });

  it('maps malformed JSON to a 400', async () => {
    const res = await request(app).post('/api/health').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });

  it('error handler hides internal errors', async () => {
    const { errorHandler } = await import('../src/middleware/errorHandler.js');
    const tiny = express();
    tiny.get('/boom', () => {
      throw new Error('secret stack detail');
    });
    tiny.use(errorHandler);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(tiny).get('/boom');
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
