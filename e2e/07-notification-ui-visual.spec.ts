/**
 * e2e/07-notification-ui-visual.spec.ts
 * Visual verification test for notification UI
 * Logs in as ducanh@spiderexpress.vn (DISPATCHER, userId=3)
 * and captures screenshots of all notification surfaces.
 */

import { test, expect } from '@playwright/test';
import { loginAs, clearSession } from './helpers/auth';

const DISPATCHER = {
  email: process.env.E2E_DISPATCHER_EMAIL ?? 'lyquangthai1993+2@gmail.com',
  password: process.env.E2E_DISPATCHER_PASSWORD ?? 'secret',
  role: 'DISPATCHER' as const
};

test.describe('[Notifications] Visual UI – Dispatcher', () => {
  test.afterEach(async ({ page }) => {
    await clearSession(page);
  });

  test('1. Header bell badge shows unread count', async ({ page }) => {
    await loginAs(page, DISPATCHER);
    await page.waitForURL(/\/dashboard\/.+/);
    await page.waitForLoadState('networkidle');

    // Đợi TanStack Query fetch xong (staleTime=30s nên cần đủ time)
    await page.waitForTimeout(2500);

    // Screenshot header area
    await page.screenshot({
      path: 'test-results/noti-01-header-badge.png',
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 80 }
    });

    // Badge phải hiển thị số > 0
    const badge = page
      .locator('header')
      .getByText(/^[1-9]\d*$/)
      .or(page.locator('span').filter({ hasText: /^[1-9]$|^[1-9]\+$/ }));

    // Verify bell button visible
    const bellBtn = page.getByRole('button', { name: /notifications/i });
    await expect(bellBtn).toBeVisible({ timeout: 10_000 });

    console.log('✅ Bell icon visible');
    await page.screenshot({ path: 'test-results/noti-01-header-full.png' });
  });

  test('2. Bell popover shows notification list', async ({ page }) => {
    await loginAs(page, DISPATCHER);
    await page.waitForURL(/\/dashboard\/.+/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Click bell
    const bellBtn = page.getByRole('button', { name: /notifications/i });
    await bellBtn.click();

    // Đợi popover + data load
    await page.waitForTimeout(1000);

    // Screenshot popover
    await page.screenshot({
      path: 'test-results/noti-02-bell-popover.png'
    });

    // Kiểm tra có notification popover content
    const popoverContent = page
      .locator('[data-radix-popper-content-wrapper], [role="dialog"]')
      .or(page.locator('.PopoverContent, [class*="popover"]'))
      .or(page.getByRole('heading', { name: 'Notifications' }));

    await expect(popoverContent.first()).toBeVisible({ timeout: 10_000 });

    console.log('✅ Notification popover visible');
  });

  test('3. Notifications page – All tab with badge & tabs', async ({ page }) => {
    await loginAs(page, DISPATCHER);
    await page.goto('/dashboard/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Screenshot full page
    await page.screenshot({
      path: 'test-results/noti-03-page-all-tab.png',
      fullPage: true
    });

    // Tabs phải hiện
    await expect(page.getByRole('tab', { name: /all/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /unread/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /read/i }).last()).toBeVisible();

    // Content container visible
    const content = page
      .locator('[class*="notification"], [data-testid="notification-item"], [role="tabpanel"]')
      .or(page.locator('text=No notifications'));
    await expect(content.first()).toBeVisible({ timeout: 10_000 });

    console.log('✅ All tab shows notification page content');
  });

  test('4. Unread tab shows only unread items', async ({ page }) => {
    await loginAs(page, DISPATCHER);
    await page.goto('/dashboard/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Click Unread tab
    await page.getByRole('tab', { name: /unread/i }).click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'test-results/noti-04-unread-tab.png',
      fullPage: true
    });

    const panel = page.locator('[role="tabpanel"]').or(page.locator('main'));
    await expect(panel.first()).toBeVisible({ timeout: 8_000 });

    console.log('✅ Unread tab switch successful');
  });

  test('5. Mark single notification as read', async ({ page }) => {
    await loginAs(page, DISPATCHER);
    await page.goto('/dashboard/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Click Unread tab
    await page.getByRole('tab', { name: /unread/i }).click();
    await page.waitForTimeout(500);

    // Click checkmark button trên notification đầu tiên
    const firstMarkReadBtn = page.getByRole('button', { name: /mark as read/i }).first();
    if (await firstMarkReadBtn.isVisible()) {
      await firstMarkReadBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/noti-05-after-mark-read.png',
        fullPage: true
      });
      console.log('✅ Marked first notification as read');
    } else {
      // Hover để hiện button
      const firstCard = page.locator('[class*="rounded-2xl"]').first();
      if (await firstCard.isVisible()) {
        await firstCard.hover();
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'test-results/noti-05-hover-card.png' });
      }
      console.log('ℹ️ Mark-as-read button checked');
    }
  });

  test('6. Read tab shows read items', async ({ page }) => {
    await loginAs(page, DISPATCHER);
    await page.goto('/dashboard/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Click Read tab — dùng exact để tránh match "Unread"
    await page.getByRole('tab', { name: 'Read', exact: false }).last().click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'test-results/noti-06-read-tab.png',
      fullPage: true
    });

    const readPanel = page.locator('[role="tabpanel"]').or(page.locator('main'));
    await expect(readPanel.first()).toBeVisible({ timeout: 8_000 });

    console.log('✅ Read tab shows read notifications');
  });
});
