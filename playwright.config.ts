import { defineConfig, devices } from '@playwright/test';

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
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000',
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
  ]
});
