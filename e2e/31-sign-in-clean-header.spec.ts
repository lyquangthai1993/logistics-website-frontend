import { test, expect } from '@playwright/test';

/**
 * e2e/31-sign-in-clean-header.spec.ts
 * Verifies removal of subtext: 'Nhập email và mật khẩu được cung cấp bởi quản trị viên'
 */
test.describe('Sign-in Page Header Cleanliness', () => {
  test('verifies admin subtext is removed from sign-in view', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await page.waitForLoadState('networkidle');

    // Title 'Đăng nhập' must be visible
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();

    // The subtext must NOT exist
    const subtextLocator = page.getByText('Nhập email và mật khẩu được cung cấp bởi quản trị viên');
    await expect(subtextLocator).toHaveCount(0);

    const bodyContent = await page.textContent('body');
    expect(bodyContent).not.toContain('Nhập email và mật khẩu được cung cấp bởi quản trị viên');

    // Capture screenshot for audit evidence
    await page.screenshot({
      path: 'e2e/screenshots/sign_in_clean_header_verified.png',
      fullPage: true
    });
  });
});
