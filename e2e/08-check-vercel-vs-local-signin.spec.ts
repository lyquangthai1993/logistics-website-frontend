import { test, expect } from '@playwright/test';

test.describe('Check Vercel Sign-in Demo Accounts UI', () => {
  test('Capture and check latest Vercel deployment popover', async ({ page }) => {
    await page.goto('https://logistics-website-frontend-kappa.vercel.app/auth/sign-in', {
      waitUntil: 'networkidle'
    });

    const demoBtn = page.getByRole('button', { name: /Xem tài khoản Demo/i });
    await expect(demoBtn).toBeVisible({ timeout: 15000 });
    await demoBtn.click();
    await page.waitForTimeout(1000);

    // Capture screenshot
    await page.screenshot({
      path: 'e2e/screenshots/vercel_latest_demo_popover.png',
      fullPage: true
    });

    // Check popover content
    const popoverContent = page.locator('[data-slot="popover-content"], [role="dialog"]');
    await expect(popoverContent).toBeVisible();

    console.log('✅ Popover captured!');
  });
});
