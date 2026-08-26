import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

test.describe('Milestone 4: Critical DOM Selectors & Dispatch Flow Verification', () => {
  const fleetUser = TEST_USERS.find((u) => u.role === 'FLEET_MANAGER')!;

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await loginAs(page, fleetUser);
  });

  test('Verify all Milestone 4 required DOM selectors and dispatch workflows', async ({ page }) => {
    await page.goto('/dashboard/trips');
    await page.waitForLoadState('networkidle');

    // 1. Verify Tab Headers
    const pendingTab = page.locator('button:has-text("Đơn Cần Phân Xe")');
    const allTripsTab = page.locator('button:has-text("Danh Sách Chuyến Xe")');
    await expect(pendingTab).toBeVisible({ timeout: 15000 });
    await expect(allTripsTab).toBeVisible({ timeout: 15000 });

    // 2. Verify Tab 1 (Pending orders) elements or empty state
    const assignBtn = page.locator('[data-testid^="btn-assign-order-"]').first();
    const hasPendingOrders = await assignBtn.isVisible().catch(() => false);

    if (hasPendingOrders) {
      // 3. Open Assign Vehicle Modal and verify single trip form selectors
      await assignBtn.click();
      await expect(page.locator('#select-trip-vehicle')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('#select-trip-driver')).toBeVisible();
      await expect(page.locator('#trip-pickup-date')).toBeVisible();
      await expect(page.locator('#trip-pickup-time')).toBeVisible();
      await expect(page.locator('#trip-eta-date')).toBeVisible();
      await expect(page.locator('#trip-notes-input')).toBeVisible();
      await expect(
        page.locator('button[type="submit"]:has-text("Xác nhận phân công")')
      ).toBeVisible();

      // 4. Verify Split Shipment Mode selectors
      const splitToggle = page.locator('button:has-text("Chuyển sang Split")');
      await expect(splitToggle).toBeVisible();
      await splitToggle.click();
      await expect(page.locator('button:has-text("Đang chia nhiều xe")')).toBeVisible();

      // Verify split row selectors for idx = 0 and 1
      await expect(page.locator('#split-vehicle-0')).toBeVisible();
      await expect(page.locator('#split-driver-0')).toBeVisible();
      await expect(page.locator('#split-weight-0')).toBeVisible();
      await expect(page.locator('#split-volume-0')).toBeVisible();

      await expect(page.locator('#split-vehicle-1')).toBeVisible();
      await expect(page.locator('#split-driver-1')).toBeVisible();
      await expect(page.locator('#split-weight-1')).toBeVisible();
      await expect(page.locator('#split-volume-1')).toBeVisible();

      // Close assign modal
      await page.click('button:has-text("Hủy")');

      // 5. Verify No-Vehicle Declaration Modal & selectors if button exists
      const noVehicleBtn = page.locator('button:has-text("Báo hết xe")').first();
      const hasNoVehBtn = await noVehicleBtn.isVisible().catch(() => false);
      if (hasNoVehBtn) {
        await noVehicleBtn.click();
        await expect(page.locator('input[name="noVehicleReason"]').first()).toBeVisible();
        await expect(page.locator('#no-vehicle-custom-reason')).toBeVisible();
        await expect(page.locator('button:has-text("Xác nhận báo hết xe")')).toBeVisible();
        await page.click('button:has-text("Hủy bỏ")');
      }
    }

    // 6. Verify All Trips tab & Table structure
    await allTripsTab.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Verify search and filter inputs on table
    const searchInput = page.locator('input[placeholder*="Tìm kiếm"]').first();
    await expect(searchInput).toBeVisible();
  });
});
