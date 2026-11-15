import { test, expect } from '@playwright/test';

test.describe('Check Sign-in UI — Demo Accounts Removed', () => {
  test('Verify demo button and banner are absent on sign-in page', async ({ page }) => {
    await page.goto('/auth/sign-in');

    const demoBtn = page.getByRole('button', { name: /Xem tài khoản Demo/i });
    await expect(demoBtn).toHaveCount(0);

    const demoBanner = page.getByText(/Thử nghiệm phiên bản Demo/i);
    await expect(demoBanner).toHaveCount(0);

    const popoverContent = page.locator('[data-slot="popover-content"], [role="dialog"]');
    await expect(popoverContent).toHaveCount(0);
  });
});
