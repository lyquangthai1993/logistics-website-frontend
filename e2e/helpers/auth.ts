/**
 * e2e/helpers/auth.ts
 * Reusable helpers for login/logout in Playwright tests
 */
import type { Page } from '@playwright/test';

export interface LoginCredentials {
  username?: string;
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'DISPATCHER' | 'FLEET_MANAGER' | 'WAREHOUSE_MANAGER';
  expectedLandingPath?: string;
  hubName?: string;
}

/**
 * Seed credentials – aligned with backend/src/database/seeds/users.seed.ts
 * Each user has a clean, readable username matching database schema:
 * - admin: Super Admin (System-wide)
 * - dispatcher: Dispatcher (Polaris Hub - Hưng Yên)
 * - fleet: Fleet Manager (Magellan Hub - Đà Nẵng)
 * - warehouse_hyn: Warehouse Manager (Polaris Hub - Hưng Yên)
 * - warehouse_dad: Warehouse Manager (Magellan Hub - Đà Nẵng)
 * - warehouse_hcm: Warehouse Manager (Andromeda Hub - HCM)
 */
export const TEST_USERS: LoginCredentials[] = [
  {
    username: 'admin',
    email: process.env.E2E_SUPER_ADMIN_EMAIL ?? 'lyquangthai1993+1@gmail.com',
    password: process.env.E2E_SUPER_ADMIN_PASSWORD ?? 'secret',
    role: 'SUPER_ADMIN',
    expectedLandingPath: '/dashboard/overview'
  },
  {
    username: 'dispatcher',
    email: process.env.E2E_DISPATCHER_EMAIL ?? 'lyquangthai1993+2@gmail.com',
    password: process.env.E2E_DISPATCHER_PASSWORD ?? 'secret',
    role: 'DISPATCHER',
    hubName: 'Polaris Hub - Hưng Yên',
    expectedLandingPath: '/dashboard/overview'
  },
  {
    username: 'fleet',
    email: process.env.E2E_FLEET_MANAGER_EMAIL ?? 'lyquangthai1993+3@gmail.com',
    password: process.env.E2E_FLEET_MANAGER_PASSWORD ?? 'secret',
    role: 'FLEET_MANAGER',
    hubName: 'Magellan Hub - Đà Nẵng',
    expectedLandingPath: '/dashboard/overview'
  },
  {
    username: 'warehouse_hyn',
    email: process.env.E2E_WAREHOUSE_MANAGER_EMAIL ?? 'lyquangthai1993+4@gmail.com',
    password: process.env.E2E_WAREHOUSE_MANAGER_PASSWORD ?? 'secret',
    role: 'WAREHOUSE_MANAGER',
    hubName: 'Polaris Hub - Hưng Yên',
    expectedLandingPath: '/dashboard/warehouse/inbound'
  },
  {
    username: 'warehouse_hcm',
    email: process.env.E2E_WAREHOUSE_MANAGER_HCM_EMAIL ?? 'lyquangthai1993+6@gmail.com',
    password: process.env.E2E_WAREHOUSE_MANAGER_HCM_PASSWORD ?? 'secret',
    role: 'WAREHOUSE_MANAGER',
    hubName: 'Andromeda Hub - HCM',
    expectedLandingPath: '/dashboard/warehouse/inbound'
  },
  {
    username: 'warehouse_dad',
    email: process.env.E2E_WAREHOUSE_MANAGER_DAD_EMAIL ?? 'lyquangthai1993+5@gmail.com',
    password: process.env.E2E_WAREHOUSE_MANAGER_DAD_PASSWORD ?? 'secret',
    role: 'WAREHOUSE_MANAGER',
    hubName: 'Magellan Hub - Đà Nẵng',
    expectedLandingPath: '/dashboard/warehouse/inbound'
  }
];

// Re-export self-documenting named constants:
export const USER_ADMIN: LoginCredentials = TEST_USERS[0];
export const USER_DISPATCHER: LoginCredentials = TEST_USERS[1];
export const USER_FLEET: LoginCredentials = TEST_USERS[2];
export const USER_WAREHOUSE_HYN: LoginCredentials = TEST_USERS[3];
export const USER_WAREHOUSE_HCM: LoginCredentials = TEST_USERS[4];
export const USER_WAREHOUSE_DAD: LoginCredentials = TEST_USERS[5];
export const TEST_USER_HCM: LoginCredentials = USER_WAREHOUSE_HCM;

const IGNORED_LOG_PATTERNS = [
  'favicon.ico',
  'Fast Refresh',
  'webpack-internal',
  'Download the React DevTools',
  'turbopack',
  'websocket',
  'socket.io',
  '404 (Not Found)'
];

/**
 * Collect browser console errors/warnings during a page session.
 * Returns a cleanup function that, when called, returns collected messages.
 */
export function collectConsoleLogs(page: Page) {
  const logs: Array<{ type: string; text: string }> = [];

  const handler = (msg: import('@playwright/test').ConsoleMessage) => {
    const type = msg.type();
    const text = msg.text();
    const isIgnored = IGNORED_LOG_PATTERNS.some((pattern) =>
      text.toLowerCase().includes(pattern.toLowerCase())
    );

    if ((type === 'error' || type === 'warning') && !isIgnored) {
      logs.push({ type, text });
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
export async function loginAs(page: Page, creds: LoginCredentials, baseUrl?: string): Promise<void> {
  const targetBase =
    baseUrl ||
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.BASE_URL ||
    '';
  const target = targetBase ? `${targetBase.replace(/\/$/, '')}/auth/sign-in` : '/auth/sign-in';
  await page.goto(target);
  await page.locator('input[name="email"]:not([disabled])').waitFor({ state: 'visible', timeout: 15_000 });

  const loginIdentifier = creds.username || creds.email;
  await page.fill('input[name="email"]', loginIdentifier);
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
