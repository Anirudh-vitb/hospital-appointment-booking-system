import { defineConfig } from '@playwright/test';

// End-to-end tests run the real Express API (against a separate
// "carepoint_e2e" database, re-seeded before each run) and the Vite dev
// server, then drive Chromium through the main booking journey.
const API_PORT = 5055;
const WEB_PORT = 5180;
const e2eEnv = {
  NODE_ENV: 'development',
  PORT: String(API_PORT),
  MONGODB_URI: process.env.E2E_MONGODB_URI || 'mongodb://127.0.0.1:27017/carepoint_e2e',
  FRONTEND_URL: `http://localhost:${WEB_PORT}`,
  ADMIN_EMAIL: 'admin@e2e.example',
  ADMIN_PASSWORD: 'AdminE2E2026',
};

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  webServer: [
    {
      command: 'npm run seed && npm start',
      cwd: '../server',
      env: e2eEnv,
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
