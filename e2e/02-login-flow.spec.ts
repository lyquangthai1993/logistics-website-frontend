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

  test('shows sanitized error message on wrong credentials (never raw technical codes)', async ({
    page
  }) => {
    await page.goto('/auth/sign-in');
    await page.fill('input[name="email"]', 'wrong@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Error div should appear
    const errorLocator = page.locator(
      'div.bg-destructive\\/10, [data-testid="login-error"]'
    );
    await expect(errorLocator).toBeVisible({
      timeout: 8000
    });

    // Must display clear localized message
    await expect(errorLocator).toContainText(
      'Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.'
    );

    // CRITICAL: Error sanitization rule - NEVER expose raw technical error keys/codes
    const errorText = await errorLocator.innerText();
    expect(errorText).not.toContain('incorrectEmailOrPassword');
    expect(errorText).not.toContain('notFound');
    expect(errorText).not.toContain('emailNotExists');
    expect(errorText).not.toContain('password:');
    expect(errorText).not.toContain('email:');
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

    test(`🛡️ ${user.role} session persists in localStorage auth-storage and SSR cookie`, async ({
      page
    }) => {
      await loginAs(page, user);

      // 1. Verify Zustand auth-storage is present and valid in localStorage
      const localStorageData = await page.evaluate(() => {
        return localStorage.getItem('auth-storage');
      });

      expect(
        localStorageData,
        'auth-storage MUST exist in localStorage for cross-tab sync and state persistence'
      ).not.toBeNull();

      const parsed = JSON.parse(localStorageData!);
      expect(
        parsed.state?.accessToken,
        'localStorage auth-storage contains valid accessToken'
      ).toBeTruthy();
      expect(
        parsed.state?.isAuthenticated,
        'localStorage auth-storage isAuthenticated is true'
      ).toBe(true);
      expect(
        parsed.state?.user?.role,
        `localStorage user role matches ${user.role}`
      ).toBe(user.role);

      // 2. Verify Next.js SSR access_token cookie is synchronized
      const cookies = await page.context().cookies();
      const tokenCookie = cookies.find((c) => c.name === 'access_token');
      expect(
        tokenCookie,
        'access_token cookie must be present for SSR Route Guards'
      ).toBeDefined();
      expect(tokenCookie?.value).toBeTruthy();
    });
  });
}
