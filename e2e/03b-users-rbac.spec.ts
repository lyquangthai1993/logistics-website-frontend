import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

test.describe('[RBAC] Users Management (/dashboard/users) Access Control', () => {
  test('🚫 BLOCKED: Unauthenticated user is redirected to /auth/sign-in', async ({ page }) => {
    await clearSession(page);
    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  for (const user of TEST_USERS) {
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    test(`${isSuperAdmin ? '✅ ALLOW' : '🚫 BLOCK'} ${user.role} → /dashboard/users`, async ({
      page
    }) => {
      await loginAs(page, user);
      await page.goto('/dashboard/users');
      await page.waitForLoadState('networkidle');

      if (isSuperAdmin) {
        await expect(page).toHaveURL(/\/dashboard\/users/, { timeout: 8000 });
        // Verify Users page container or heading exists
        await expect(page.locator('text=Users').first()).toBeVisible({ timeout: 8000 });
      } else {
        await expect(page).not.toHaveURL(/\/dashboard\/users/, { timeout: 8000 });
        await expect(page).toHaveURL(/\/dashboard\/overview/, { timeout: 8000 });
      }

      await clearSession(page);
    });
  }
});
