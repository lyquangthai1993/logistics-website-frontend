import { defineConfig, devices } from '@playwright/test';

const isRemote = Boolean(
  (process.env.PLAYWRIGHT_BASE_URL &&
    !process.env.PLAYWRIGHT_BASE_URL.includes('localhost') &&
    !process.env.PLAYWRIGHT_BASE_URL.includes('127.0.0.1')) ||
  (process.env.BASE_URL &&
    !process.env.BASE_URL.includes('localhost') &&
    !process.env.BASE_URL.includes('127.0.0.1'))
);

const configuredBaseUrl = (
  process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:4000'
).replace(/\/$/, '');
const configuredApiUrl = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4001/api/v1'
).replace(/\/$/, '');

// Keep legacy specs on the same target as Playwright instead of silently falling back
// to obsolete ports when the suite runs against Railway Dev.
process.env.PLAYWRIGHT_BASE_URL = configuredBaseUrl;
process.env.BASE_URL = configuredBaseUrl;
process.env.NEXT_PUBLIC_BASE_URL = configuredBaseUrl;
process.env.API_URL = configuredApiUrl;
process.env.NEXT_PUBLIC_API_URL = configuredApiUrl;

/**
 * Playwright E2E Config – Logistics TMS
 * Scope: Login flow, RBAC routing, browser console health checks
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }]
  ],
  use: {
    baseURL: configuredBaseUrl,
    // Keep a real Chromium window available without taking the operator's focus.
    // Set HEADLESS=true for fully headless CI runs.
    headless: process.env.HEADLESS === 'true',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    launchOptions: {
      args: [
        '--start-minimized',
        ...(process.env.WINDOW_POSITION
          ? [`--window-position=${process.env.WINDOW_POSITION}`]
          : [])
      ]
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  /* Tự động start backend & frontend khi test local nếu server chưa chạy */
  webServer: !isRemote
    ? [
        {
          command: 'npm run start:prod',
          cwd: '../backend',
          url: 'http://localhost:4001/api/v1/health',
          reuseExistingServer: true,
          timeout: 120_000
        },
        {
          command: 'npm run start',
          cwd: '.',
          url: 'http://localhost:4000',
          reuseExistingServer: true,
          timeout: 120_000
        }
      ]
    : undefined
});
