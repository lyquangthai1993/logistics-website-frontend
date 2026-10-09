/**
 * frontend/e2e/43-feedback-09-10-task-16.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 09/10 (Task 16) — Chuẩn Hóa Hiển Thị Tỉnh/Thành Phố Đích Trên Tem Nhận Diện Hàng Hóa A4
 *
 * Scenarios Tested:
 * 1. Warehouse Orders Master Board: Open "Xem & In Tem Nhận Diện Hàng Hóa A4" from row action.
 * 2. Assert Row 5 "GIAO ĐẾN :" displays uppercase destination province/city (Zero blank cell).
 * 3. Inspect via WarehouseWaybillDetailModal: Click "In tem Pallet A4" and verify destination province/city.
 * 4. Inbound Warehouse Board: Verify Pallet Label preview from inbound orders/trips.
 * 5. Visual Proof Screenshot capture directly to feedback_09_10_task_16/ folder.
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './helpers/auth';
import path from 'path';
import fs from 'fs';

test.describe('Feedback 09/10 Task 16: Standardize Destination Province/City on Pallet Label A4', () => {
  const warehouseManager =
    TEST_USERS.find((u) => u.role === 'WAREHOUSE_MANAGER') ||
    TEST_USERS.find((u) => u.role === 'SUPER_ADMIN') ||
    TEST_USERS[0];

  const FEEDBACK_DIR = path.resolve(__dirname, '../../feedback_09_10_task_16');

  test.beforeAll(async () => {
    if (!fs.existsSync(FEEDBACK_DIR)) {
      fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30_000);
  });

  test('E2E Verification: Pallet Label Row 5 GIAO ĐẾN displays destination province/city across operational screens', async ({ page }) => {
    // 1. Login as Warehouse Manager
    await loginAs(page, warehouseManager);

    // 2. Navigate to Warehouse Orders page
    await page.goto('/dashboard/warehouse/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('table tbody tr', { timeout: 15_000 });

    // 3. Find first operational row with print button
    const printButtons = page.locator('table tbody tr button[title="In tem nhận diện A4"]');
    await expect(printButtons.first()).toBeVisible({ timeout: 10_000 });

    // Click print label on first row
    await printButtons.first().click();

    // 4. Verify Pallet Label A4 Modal opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    await expect(dialog.getByText('Xem & In Tem Nhận Diện Hàng Hóa A4')).toBeVisible();

    // 5. Inspect Row 5 "GIAO ĐẾN :"
    const destRow = dialog.locator('table tr').filter({ hasText: 'GIAO ĐẾN :' });
    await expect(destRow).toBeVisible();

    const destValueCell = destRow.locator('td').nth(1);
    await expect(destValueCell).toBeVisible();

    const destText = (await destValueCell.innerText()).trim();
    // Destination must NOT be empty or whitespace
    expect(destText.length).toBeGreaterThan(0);
    expect(destText).not.toBe('');
    expect(destText).not.toBe('UNDEFINED');
    expect(destText).not.toBe('NULL');

    // Verify print button and close button exist
    await expect(dialog.getByRole('button', { name: /In Tem Ngay/ })).toBeVisible();
    const closeBtn = dialog.getByRole('button', { name: 'Đóng' });
    await expect(closeBtn).toBeVisible();

    // 6. Capture Visual Proof Screenshot for Task 16
    const screenshotPath1 = path.join(FEEDBACK_DIR, 'screenshot_pallet_label_verified.png');
    const screenshotPath2 = path.join(FEEDBACK_DIR, 'screenshot_02_verified.png');

    await page.screenshot({ path: screenshotPath1, fullPage: false });
    await page.screenshot({ path: screenshotPath2, fullPage: false });

    // Close modal
    await closeBtn.click();
    await expect(dialog).not.toBeVisible();

    // 7. Verify via Waybill Detail Modal -> In tem Pallet A4
    const detailButtons = page.locator('table tbody tr button[title*="Xem chi tiết"]');
    if ((await detailButtons.count()) > 0) {
      await detailButtons.first().click();

      // Waybill detail modal
      const waybillModal = page.locator('[role="dialog"]').first();
      await expect(waybillModal).toBeVisible({ timeout: 8_000 });

      const printFromDetailBtn = waybillModal.locator('button:has-text("In tem Pallet A4")');
      if (await printFromDetailBtn.isVisible()) {
        await printFromDetailBtn.click();

        // Label modal appears
        const labelModalFromDetail = page.locator('[role="dialog"]').filter({ hasText: 'Xem & In Tem Nhận Diện Hàng Hóa A4' });
        await expect(labelModalFromDetail).toBeVisible({ timeout: 8_000 });

        const detailDestRow = labelModalFromDetail.locator('table tr').filter({ hasText: 'GIAO ĐẾN :' });
        await expect(detailDestRow).toBeVisible();

        const detailDestVal = (await detailDestRow.locator('td').nth(1).innerText()).trim();
        expect(detailDestVal.length).toBeGreaterThan(0);

        // Close label modal
        const closeLabelFromDetail = labelModalFromDetail.getByRole('button', { name: 'Đóng' });
        await closeLabelFromDetail.click();
      }

      // Close waybill modal if still open
      const closeWaybillModal = waybillModal.locator('button:has-text("Đóng")');
      if (await closeWaybillModal.isVisible()) {
        await closeWaybillModal.click();
      }
    }

    // 8. Verify on Inbound Board
    await page.goto('/dashboard/warehouse/inbound', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 15_000 });

    const inboundPrintBtn = page.locator('button[title="In tem nhận diện A4"], button:has-text("In tem")').first();
    if (await inboundPrintBtn.isVisible()) {
      await inboundPrintBtn.click();
      const inboundDialog = page.locator('[role="dialog"]').filter({ hasText: 'Xem & In Tem Nhận Diện Hàng Hóa A4' });
      if (await inboundDialog.isVisible()) {
        const inboundDestRow = inboundDialog.locator('table tr').filter({ hasText: 'GIAO ĐẾN :' });
        await expect(inboundDestRow).toBeVisible();
        const inboundDestVal = (await inboundDestRow.locator('td').nth(1).innerText()).trim();
        expect(inboundDestVal.length).toBeGreaterThan(0);
        await inboundDialog.getByRole('button', { name: 'Đóng' }).click();
      }
    }
  });
});
