import { defineConfig, devices } from '@playwright/test';

const isRemote = Boolean(
  (process.env.PLAYWRIGHT_BASE_URL &&
    !process.env.PLAYWRIGHT_BASE_URL.includes('localhost') &&
    !process.env.PLAYWRIGHT_BASE_URL.includes('127.0.0.1')) ||
  (process.env.BASE_URL &&
    !process.env.BASE_URL.includes('localhost') &&
    !process.env.BASE_URL.includes('127.0.0.1'))
);

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
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:4000',
    headless: process.env.HEADLESS === 'true',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    ...(process.env.WINDOW_POSITION
      ? {
          launchOptions: {
            args: [`--window-position=${process.env.WINDOW_POSITION}`]
          }
        }
      : {})
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
          command: 'npm run start:dev',
          cwd: '../backend',
          url: 'http://localhost:4001/health',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000
        },
        {
          command: 'npm run dev',
          cwd: '.',
          url: 'http://localhost:4000',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000
        }
      ]
    : undefined
});
