import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_ADMIN, waitForTableLoaded } from './helpers/auth';

test.describe('Task #111: Super Admin "Login As" (Impersonation) & 1-Click Admin Session Restore', () => {
  test('Super Admin can impersonate a user via Users Table or Header Switcher, see active banner, block non-admin API escalation, and exit impersonation in 1 click', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 860 });

    // 1. Login as Super Admin
    await loginAs(page, USER_ADMIN);

    // 2. Navigate to Users Management (/dashboard/users)
    await page.goto('/dashboard/users');
    await waitForTableLoaded(page);

    const userRows = page.locator('table tbody tr');
    await expect(userRows.first()).toBeVisible({ timeout: 20000 });
    const rowCount = await userRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify "Đóng vai" action button exists on user rows
    const rowLoginAsButtons = page.locator('[data-testid^="btn-login-as-user-"]');
    await expect(rowLoginAsButtons.first()).toBeVisible({ timeout: 15000 });
    const btnCount = await rowLoginAsButtons.count();
    expect(btnCount).toBeGreaterThan(0);

    // Verify Header "Đóng vai (Login as)" quick switcher button is visible
    const headerTrigger = page.getByTestId('header-login-as-trigger');
    await expect(headerTrigger).toBeVisible();
    await expect(headerTrigger).toContainText('Đóng vai');

    // 3. Open Header "Đóng vai (Login as)" Popover and search for warehouse_hcm
    await headerTrigger.click();
    const searchInput = page.getByTestId('header-login-as-search');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('warehouse_hcm');

    const targetItem = page.getByTestId('header-login-as-item-warehouse_hcm');
    await expect(targetItem).toBeVisible({ timeout: 15000 });
    await expect(targetItem).toContainText('Quản lý kho');

    // 4. Click to impersonate warehouse_hcm and verify API response + redirect
    const loginAsResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/auth/login-as/') && res.request().method() === 'POST',
      { timeout: 25000 }
    );
    await targetItem.click();
    const loginAsRes = await loginAsResponsePromise;
    expect(loginAsRes.status()).toBe(200);
    const apiOrigin = new URL(loginAsRes.url()).origin;

    // Wait for redirect to Warehouse Manager's default landing page (/dashboard/warehouse/orders)
    await page.waitForURL(/\/dashboard\/warehouse\/orders/, { timeout: 25000 });
    await waitForTableLoaded(page);

    // Ensure non-empty table rows on Andromeda Hub - HCM orders screen before screenshot
    const orderRows = page.locator('table tbody tr').filter({
      hasNotText: /Đang tải|Không tìm thấy/i
    });
    await expect(orderRows.first()).toBeVisible({ timeout: 20000 });
    const orderRowCount = await orderRows.count();
    expect(orderRowCount).toBeGreaterThan(0);

    const impersonatedToken = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(Boolean(impersonatedToken)).toBe(true);

    // 5. Verify Impersonation Active Banner & "Thoát đóng vai" button in Header
    const activeBanner = page.getByTestId('impersonation-active-banner');
    await expect(activeBanner).toBeVisible({ timeout: 15000 });
    await expect(activeBanner).toContainText('Đang đóng vai');

    const exitBtn = page.getByTestId('btn-exit-impersonation');
    await expect(exitBtn).toBeVisible();
    await expect(exitBtn).toContainText('Thoát đóng vai');

    // Open Header Switcher while impersonating and verify user list loads via Super Admin impersonator token
    const switcherTriggerWhileImpersonating = page.getByTestId('header-login-as-trigger');
    await expect(switcherTriggerWhileImpersonating).toBeVisible();
    await switcherTriggerWhileImpersonating.click();
    await expect(page.getByTestId('header-login-as-search')).toBeVisible();
    const switcherItems = page.locator('[data-testid^="header-login-as-item-"]');
    await expect(switcherItems.first()).toBeVisible({ timeout: 15000 });
    const switcherItemCount = await switcherItems.count();
    expect(switcherItemCount).toBeGreaterThan(0);

    const rootDir =
      path.basename(process.cwd()) === 'frontend'
        ? path.resolve(process.cwd(), '..')
        : process.cwd();
    const evidenceDir = path.join(
      rootDir,
      'feedbacks',
      'feedback_01_11_task_111_super_admin_login_as'
    );
    fs.mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({
      path: path.join(evidenceDir, 'screenshot_01_verified.png'),
      fullPage: false
    });

    // Close popover before clicking exit
    await page.keyboard.press('Escape');

    // 6. RBAC Security Verification: Non-Super-Admin token MUST be blocked (403 Forbidden) from calling login-as
    const forbiddenRes = await page.request.post(`${apiOrigin}/api/v1/auth/login-as/1`, {
      headers: {
        Authorization: `Bearer ${impersonatedToken}`
      },
      timeout: 15000
    });
    expect(forbiddenRes.status()).toBe(403);

    // 7. Click "Thoát đóng vai" to restore Super Admin session in 1 click without password
    await exitBtn.click();
    await page.waitForURL(/\/dashboard\/users/, { timeout: 25000 });
    await waitForTableLoaded(page);

    await expect(page.getByTestId('impersonation-active-banner')).toBeHidden();
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20000 });

    // 8. Also test direct "Đóng vai" button on a user row inside /dashboard/users table
    const firstRowLoginAsBtn = page
      .locator('[data-testid^="btn-login-as-user-"]:not([disabled])')
      .first();
    await expect(firstRowLoginAsBtn).toBeVisible({ timeout: 15000 });
    const rowImpersonatePromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/auth/login-as/') && res.request().method() === 'POST',
      { timeout: 25000 }
    );
    await firstRowLoginAsBtn.click();
    const rowImpersonateRes = await rowImpersonatePromise;
    expect(rowImpersonateRes.status()).toBe(200);

    await expect(page.getByTestId('impersonation-active-banner')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('btn-exit-impersonation').click();
    await page.waitForURL(/\/dashboard\/users/, { timeout: 25000 });
    await expect(page.getByTestId('impersonation-active-banner')).toBeHidden();
  });
});
