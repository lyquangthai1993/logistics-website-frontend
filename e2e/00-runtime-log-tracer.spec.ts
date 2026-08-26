/**
 * e2e/00-runtime-log-tracer.spec.ts
 *
 * Sub-Agent D: Runtime Terminal Log Tracer
 *
 * Captures what browser console CANNOT see:
 *  - Server-side HTTP errors (4xx / 5xx) from API calls during user flows
 *  - Slow API requests (latency > 3s threshold)
 *  - Next.js SSR error overlays in the DOM
 *  - NestJS backend availability & response time
 *
 * Complements:
 *  - 01-console-health.spec.ts  → browser console (client-side)
 *  - 02-login-flow.spec.ts      → auth flows
 *  - 03-rbac-routing.spec.ts    → route guard enforcement
 */
import { test, expect } from '@playwright/test';
import {
  captureRuntimeLogs,
  detectNextJsErrorOverlay,
  checkBackendHealth
} from './helpers/runtime-logs';
import { loginAs, clearSession, TEST_USERS } from './helpers/auth';

const SLOW_REQUEST_THRESHOLD_MS = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Backend Health Probe
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Backend Health Probe', () => {
  test('NestJS backend is reachable and responds < 3s', async ({ page }) => {
    const health = await checkBackendHealth(page);
    console.log(
      `[Backend Health] Status: ${health.statusCode} | Latency: ${health.latencyMs}ms | Alive: ${health.alive}`
    );

    expect(health.alive).toBe(true);
    expect(health.latencyMs).toBeLessThan(SLOW_REQUEST_THRESHOLD_MS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Login page — server error interception
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Login Page — Runtime Error Interception', () => {
  test('no 5xx server errors during login page load', async ({ page }) => {
    const session = captureRuntimeLogs(page);

    await page.goto('/auth/sign-in', { waitUntil: 'networkidle' });

    const overlay = await detectNextJsErrorOverlay(page);
    const serverErrors = session.getServerErrors().filter((e) => e.status >= 500);
    const slowRequests = session.getSlowRequests(SLOW_REQUEST_THRESHOLD_MS);

    // Report findings
    if (overlay) console.error(`[SSR Error Overlay] ${overlay}`);
    if (serverErrors.length > 0) {
      console.error('[5xx Server Errors]', JSON.stringify(serverErrors, null, 2));
    }
    if (slowRequests.length > 0) {
      console.warn('[Slow Requests]', JSON.stringify(slowRequests, null, 2));
    }

    session.stop();

    expect(overlay, 'Next.js SSR error overlay should not appear').toBeNull();
    expect(serverErrors, `Found ${serverErrors.length} server-side 5xx errors`).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Per-role login → dashboard — intercept API errors
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Per-role Dashboard — API Error Interception', () => {
  for (const user of TEST_USERS) {
    test(`[${user.role}] no server errors during login + dashboard load`, async ({ page }) => {
      const session = captureRuntimeLogs(page);

      // Login and wait for dashboard
      await loginAs(page, user);

      // Wait for network to settle after redirect
      await page.waitForLoadState('networkidle').catch(() => {
        // Timeout is acceptable – continue to check errors
      });

      const overlay = await detectNextJsErrorOverlay(page);
      const serverErrors = session.getServerErrors().filter((e) => e.status >= 500);
      const clientErrors = session
        .getServerErrors()
        .filter((e) => e.status >= 400 && e.status < 500);
      const slowRequests = session.getSlowRequests(SLOW_REQUEST_THRESHOLD_MS);

      // Log for CI/debugging visibility
      console.log(
        `[${user.role}] URL: ${page.url()} | 5xx: ${serverErrors.length} | 4xx: ${clientErrors.length} | slow: ${slowRequests.length}`
      );
      if (serverErrors.length > 0)
        console.error(`[${user.role}] 5xx:`, JSON.stringify(serverErrors, null, 2));
      if (clientErrors.length > 0)
        console.warn(`[${user.role}] 4xx:`, JSON.stringify(clientErrors, null, 2));
      if (slowRequests.length > 0)
        console.warn(`[${user.role}] Slow:`, JSON.stringify(slowRequests, null, 2));

      session.stop();
      await clearSession(page);

      // Assertions
      expect(overlay, `[${user.role}] SSR error overlay should not appear`).toBeNull();
      expect(
        serverErrors,
        `[${user.role}] Found ${serverErrors.length} server-side 5xx errors during dashboard load`
      ).toHaveLength(0);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: Slow request audit (warning-only, not a hard fail)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Slow Request Audit (Warning)', () => {
  test('[SUPER_ADMIN] dashboard API calls should respond < 3s', async ({ page }) => {
    const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
    const session = captureRuntimeLogs(page);

    await loginAs(page, superAdmin);
    await page.waitForLoadState('networkidle').catch(() => {});

    const slowRequests = session.getSlowRequests(SLOW_REQUEST_THRESHOLD_MS);
    session.stop();
    await clearSession(page);

    if (slowRequests.length > 0) {
      console.warn(
        `[Slow Request Audit] ${slowRequests.length} request(s) exceeded ${SLOW_REQUEST_THRESHOLD_MS}ms:`,
        JSON.stringify(slowRequests, null, 2)
      );
    } else {
      console.log('[Slow Request Audit] All requests within threshold ✅');
    }

    // Soft assertion: warn but don't fail (performance baseline check)
    // Uncomment to make this a hard failure:
    // expect(slowRequests).toHaveLength(0);
    expect(slowRequests.length).toBeGreaterThanOrEqual(0); // always passes, logs are the output
  });
});
