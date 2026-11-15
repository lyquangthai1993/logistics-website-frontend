import { test, expect } from '@playwright/test';

test.describe('Check Sign-in Error UI Consistency', () => {
  test('Capture configured sign-in error UI after invalid submit', async ({ page }) => {
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000'}/auth/sign-in`, {
      waitUntil: 'domcontentloaded'
    });

    await page.fill('input[name="email"]', 'admin@spiderexpress.vn');
    await page.fill('input[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    const errorDiv = page.locator('[data-testid="login-error"]');
    await expect(errorDiv).toBeVisible({ timeout: 8000 });

    // Capture screenshot
    await page.screenshot({ path: 'e2e/screenshots/login_error_consistent.png', fullPage: true });

    console.log('✅ Configured environment error UI captured!');
  });
});
