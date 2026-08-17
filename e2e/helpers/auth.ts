/**
 * e2e/helpers/auth.ts
 * Reusable helpers for login/logout in Playwright tests
 */
import type { Page } from '@playwright/test';

export interface LoginCredentials {
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'DISPATCHER' | 'FLEET_MANAGER' | 'WAREHOUSE_MANAGER';
  expectedLandingPath?: string;
}

/**
 * Seed credentials – update when real users are seeded in DB
 * Keep aligned with backend/src/database/seeds/users.seed.ts
 */
export const TEST_USERS: LoginCredentials[] = [
  {
    email: process.env.E2E_SUPER_ADMIN_EMAIL ?? 'lyquangthai1993+1@gmail.com',
    password: process.env.E2E_SUPER_ADMIN_PASSWORD ?? 'secret',
    role: 'SUPER_ADMIN',
    expectedLandingPath: '/dashboard/overview'
  },
  {
    email: process.env.E2E_DISPATCHER_EMAIL ?? 'lyquangthai1993+2@gmail.com',
    password: process.env.E2E_DISPATCHER_PASSWORD ?? 'secret',
    role: 'DISPATCHER',
    expectedLandingPath: '/dashboard/overview'
  },
  {
    email: process.env.E2E_FLEET_MANAGER_EMAIL ?? 'lyquangthai1993+3@gmail.com',
    password: process.env.E2E_FLEET_MANAGER_PASSWORD ?? 'secret',
    role: 'FLEET_MANAGER',
    expectedLandingPath: '/dashboard/overview'
  },
  {
    email: process.env.E2E_WAREHOUSE_MANAGER_EMAIL ?? 'lyquangthai1993+4@gmail.com',
    password: process.env.E2E_WAREHOUSE_MANAGER_PASSWORD ?? 'secret',
    role: 'WAREHOUSE_MANAGER',
    expectedLandingPath: '/dashboard/overview'
  }
];

/**
 * Collect browser console errors/warnings during a page session.
 * Returns a cleanup function that, when called, returns collected messages.
 */
export function collectConsoleLogs(page: Page) {
  const logs: Array<{ type: string; text: string }> = [];

  const handler = (msg: import('@playwright/test').ConsoleMessage) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      logs.push({ type, text: msg.text() });
    }
  };
  page.on('console', handler);

  return {
    getLogs: () => logs,
    stop: () => page.off('console', handler)
  };
}

/**
 * Perform login via UI and wait for redirect.
 */
export async function loginAs(page: Page, creds: LoginCredentials): Promise<void> {
  await page.goto('/auth/sign-in');
  await page.locator('input[name="email"]').waitFor({ state: 'visible', timeout: 15_000 });

  await page.fill('input[name="email"]', creds.email);
  await page.fill('input[name="password"]', creds.password);
  await page.click('button[type="submit"]');

  // Wait for redirect after successful login
  await page.waitForURL(/\/dashboard\/.*/, { timeout: 15_000 });
}

/**
 * Clear auth cookies and local storage to simulate logout.
 */
export async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {
      // Ignore SecurityError when page is at about:blank origin
    }
  });
}
