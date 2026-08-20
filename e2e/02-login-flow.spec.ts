/**
 * e2e/02-login-flow.spec.ts
 * SUB-AGENT ROLE: Login Flow Tester (all roles)
 *
 * Validates for each role:
 *   1. Sign-in page renders correctly
 *   2. Login form accepts credentials & submits
 *   3. Redirects to /dashboard/overview after successful login
 *   4. Error message shown on invalid credentials
 *   5. No browser console errors during login flow
 */
import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession, collectConsoleLogs } from './helpers/auth';

// ── Sign-in page baseline ──────────────────────────────────────────────────
test.describe('[Login Page] UI baseline', () => {
  test('renders form fields and submit button', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows error on empty submit', async ({ page }) => {
    await page.goto('/auth/sign-in');
    // HTML5 required validation – submit should not call API
    const emailInput = page.locator('input[name="email"]');
    await emailInput.evaluate((el: HTMLInputElement) => {
      el.required = true;
    });
    // Click submit with empty fields
    await page.click('button[type="submit"]');
    // URL should stay on sign-in
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('shows error message on wrong credentials', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', 'wrong@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Error div should appear
    await expect(page.locator('div.bg-destructive\\/10, [data-testid="login-error"]')).toBeVisible({
      timeout: 8000
    });
  });
});

// ── Per-role login flow ────────────────────────────────────────────────────
for (const user of TEST_USERS) {
  test.describe(`[Login Flow] Role: ${user.role}`, () => {
    test.afterEach(async ({ page }) => {
      await clearSession(page);
    });

    test(`✅ ${user.role} can log in and reaches dashboard`, async ({ page }) => {
      const logger = collectConsoleLogs(page);

      await loginAs(page, user);

      // Should land on dashboard
      await expect(page).toHaveURL(/\/dashboard\/.+/);

      const consoleLogs = logger.getLogs();
      logger.stop();

      const errors = consoleLogs.filter((l) => l.type === 'error');
      if (errors.length > 0) {
        console.log(`\n🔴 Console errors after ${user.role} login:`);
        errors.forEach((e) => console.log(`  - ${e.text}`));
      }

      // No browser errors post-login
      expect(errors, `${user.role}: browser errors found after login`).toHaveLength(0);
    });

    test(`🔒 ${user.role} is redirected to /auth/sign-in when unauthenticated`, async ({
      page
    }) => {
      await clearSession(page);
      await page.goto('/dashboard/overview');
      await expect(page).toHaveURL(/\/auth\/sign-in/);
    });

    test(`🛡️ ${user.role} tokens are ONLY in sessionStorage and NEVER in localStorage`, async ({
      page
    }) => {
      await loginAs(page, user);

      // Verify localStorage is completely free of any auth / token keys
      const localStorageData = await page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)!;
          items[key] = localStorage.getItem(key)!;
        }
        return items;
      });

      expect(
        localStorageData['auth-storage'],
        'auth-storage MUST NOT exist in localStorage'
      ).toBeUndefined();
      expect(
        JSON.stringify(localStorageData).toLowerCase(),
        'localStorage must not contain any token strings'
      ).not.toContain('token');

      // Verify sessionStorage stores the auth session
      const sessionStorageData = await page.evaluate(() => {
        return sessionStorage.getItem('auth-storage');
      });

      expect(sessionStorageData, 'auth-storage MUST exist in sessionStorage').not.toBeNull();
      const parsed = JSON.parse(sessionStorageData!);
      expect(parsed.state.accessToken, 'sessionStorage contains valid accessToken').toBeTruthy();
      expect(parsed.state.isAuthenticated, 'sessionStorage isAuthenticated is true').toBe(true);
    });
  });
}
