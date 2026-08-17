import { test, expect } from '@playwright/test';

test.describe('Check Localhost Sign-in Demo Accounts UI', () => {
  test('Capture localhost sign-in demo accounts popover', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/sign-in', {
      waitUntil: 'networkidle'
    });

    const demoBtn = page.getByRole('button', { name: /Xem tài khoản Demo/i });
    await expect(demoBtn).toBeVisible({ timeout: 15000 });
    await demoBtn.click();
    await page.waitForTimeout(1000);

    // Capture screenshot
    await page.screenshot({ path: 'e2e/screenshots/localhost_demo_popover.png', fullPage: true });

    console.log('✅ Localhost Popover captured!');
  });
});
