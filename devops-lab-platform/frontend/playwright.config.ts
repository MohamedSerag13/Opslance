import { defineConfig, devices } from '@playwright/test';

/**
 * E2E suite. Requires a live backend on :8123 — start it first:
 *   python ../scripts/live_backend_runner_p4.py &
 *   npm run build
 * The preview server (vite preview, same /api proxy as dev) is started
 * automatically by Playwright against the freshly built dist/.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:4178',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npx vite preview --port 4178 --host 127.0.0.1 --strictPort',
    port: 4178,
    reuseExistingServer: true,
    timeout: 30_000,
    env: { VITE_API_TARGET: process.env.VITE_API_TARGET || 'http://127.0.0.1:8123' },
  },
});
