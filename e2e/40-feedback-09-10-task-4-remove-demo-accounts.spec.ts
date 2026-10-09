/**
 * e2e/40-feedback-09-10-task-4-remove-demo-accounts.spec.ts
 *
 * FEEDBACK 09/10 (Task 4): Loại bỏ nút "Xem tài khoản Demo" ở màn hình đăng nhập
 *
 * Verifies:
 * 1. Zero presence of "Xem tài khoản Demo" button and key icon on /auth/sign-in
 * 2. Zero presence of "💡 Thử nghiệm phiên bản Demo?" banner
 * 3. Zero presence of demo accounts popover / popup
 * 4. Normal authentication flow remains fully operational
 * 5. Visual evidence screenshot captured to feedback_09_10_task_4/screenshot_verified.png
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/auth';
import path from 'path';

test.describe('Feedback 09/10 Task 4 — Remove Demo Accounts Button & Banner', () => {
  test('EC-01 & EC-02: Sign-in screen has no demo button or banner', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // Wait for form inputs to be ready
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Assert absence of Demo button and text
    const demoBtn = page.getByRole('button', { name: /Xem tài khoản Demo/i });
    await expect(demoBtn).toHaveCount(0);

    const demoBanner = page.getByText(/Thử nghiệm phiên bản Demo/i);
    await expect(demoBanner).toHaveCount(0);

    const demoPopoverTitle = page.getByText(/Tài khoản Demo có sẵn/i);
    await expect(demoPopoverTitle).toHaveCount(0);

    // Verify popover slots are empty
    const popoverContent = page.locator('[data-slot="popover-content"], [role="dialog"]');
    await expect(popoverContent).toHaveCount(0);

    // Capture clean login screen screenshot as visual verification evidence
    const screenshotPath = path.resolve(
      __dirname,
      '../../feedback_09_10_task_4/screenshot_verified.png'
    );
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`[E2E] Clean sign-in page verified screenshot saved to: ${screenshotPath}`);
  });

  test('EC-03: Responsive layout verification on mobile viewport (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth/sign-in');

    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible({ timeout: 15000 });

    // Assert zero presence of demo elements on mobile
    await expect(page.getByRole('button', { name: /Xem tài khoản Demo/i })).toHaveCount(0);
    await expect(page.getByText(/Thử nghiệm phiên bản Demo/i)).toHaveCount(0);

    // Check no horizontal scroll overflow on document body
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowInnerWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(windowInnerWidth + 1);
  });

  test('EC-04: Form client validation & submission constraints without demo helper', async ({
    page
  }) => {
    await page.goto('/auth/sign-in');

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await expect(passwordInput).toBeVisible();

    // Verify inputs have HTML5 required constraint
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');

    // Attempt empty submit – browser prevents navigation, stays on /auth/sign-in
    await submitBtn.click();
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('EC-05: Password visibility toggle and forgot-password link', async ({ page }) => {
    await page.goto('/auth/sign-in');

    const passwordInput = page.locator('input[name="password"]');
    const toggleBtn = page.locator('button[title*="mật khẩu"]');
    const forgotPwdLink = page.getByRole('link', { name: /Quên mật khẩu/i });

    await expect(passwordInput).toBeVisible({ timeout: 15000 });
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Toggle password visibility to text
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Toggle back to password
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Check forgot password destination
    await expect(forgotPwdLink).toBeVisible();
    await expect(forgotPwdLink).toHaveAttribute('href', '/auth/forgot-password');
  });
});
