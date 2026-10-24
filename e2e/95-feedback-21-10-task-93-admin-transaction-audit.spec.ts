import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, TEST_USERS } from './helpers/auth';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';
const EVIDENCE_DIR = path.resolve(__dirname, '../../issues/issue_21_10');

test.describe('Admin Inventory Transaction Audit & ACID Management (Task #93)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Complete E2E workflow: Happy cases, Edge cases (Negative stock check & RBAC), Step-by-step visual evidence', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });

    const adminUser = TEST_USERS[0]; // Super Admin (admin / lyquangthai1993+1@gmail.com)
    const warehouseHcmUser = TEST_USERS.find(u => u.username === 'warehouse_hcm') || TEST_USERS[5];

    // =========================================================================
    // STEP 1: Super Admin Login & Order Navigation
    // =========================================================================
    console.log('--- STEP 1: Logging in as Super Admin ---');
    await loginAs(page, adminUser, BASE_URL);

    await page.goto(`${BASE_URL}/dashboard/warehouse/orders`);
    await page.waitForLoadState('networkidle').catch(() => {});

    console.log('--- STEP 1.1: Searching for order NDA2610-0213 ---');
    const searchInput = page.locator('input[placeholder*="Tìm kiếm"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 15_000 });
    await searchInput.fill('NDA2610-0213');
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    const orderRow = page.locator('tr').filter({ hasText: 'NDA2610-0213' }).first();
    await orderRow.waitFor({ state: 'visible', timeout: 15_000 });

    const sc1 = path.join(EVIDENCE_DIR, 'step_01_orders_table_superadmin.png');
    await page.screenshot({ path: sc1, fullPage: false });
    console.log(`[Evidence] Saved: ${sc1}`);

    // =========================================================================
    // STEP 2: Open Waybill Detail Modal & Inspect Transaction Ledger
    // =========================================================================
    console.log('--- STEP 2: Opening Waybill Detail Modal ---');
    await orderRow.click();

    const detailDialog = page.locator('[role="dialog"]').filter({ hasText: 'NDA2610-0213' }).first();
    await detailDialog.waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(1500);

    // Expect Chronological Transaction Ledger with KPI cards
    await expect(detailDialog.locator('text=Tồn kho khả dụng')).toBeVisible({ timeout: 10_000 });

    const sc2 = path.join(EVIDENCE_DIR, 'step_02_waybill_detail_modal_transactions.png');
    await page.screenshot({ path: sc2, fullPage: false });
    console.log(`[Evidence] Saved: ${sc2}`);

    // =========================================================================
    // STEP 3: EDGE CASE 1 - Negative Stock Prevention Guard
    // Attempting to delete a large transaction (55 kiện) when remaining is only <= 20
    // =========================================================================
    console.log('--- STEP 3: Testing Edge Case - Negative Stock Invariant (213 kiện > tồn khả dụng) ---');
    const largeRow = detailDialog.locator('.relative.flex.items-stretch').filter({ hasText: '+213 kiện' }).first();
    const largeTxDeleteBtn = largeRow.locator('button', { hasText: 'Xóa bớt dòng' }).first();
    await largeTxDeleteBtn.scrollIntoViewIfNeeded();
    await largeTxDeleteBtn.click();

    const deleteConfirmModal = page.locator('[role="dialog"]').filter({ hasText: 'Xác nhận xóa dòng giao dịch' }).first();
    await deleteConfirmModal.waitFor({ state: 'visible', timeout: 8_000 });

    const reasonInput = deleteConfirmModal.locator('textarea[placeholder*="Nhập lý do điều chỉnh"], input[placeholder*="Nhập lý do điều chỉnh"]').first();
    await reasonInput.waitFor({ state: 'visible', timeout: 5_000 });
    await reasonInput.fill('[E2E-EDGE-CASE] Thử xóa giao dịch lớn vượt quá tồn khả dụng');

    const sc3 = path.join(EVIDENCE_DIR, 'step_03_edge_case_negative_stock_dialog.png');
    await page.screenshot({ path: sc3, fullPage: false });
    console.log(`[Evidence] Saved: ${sc3}`);

    const confirmDeleteBtn = deleteConfirmModal.locator('button', { hasText: 'Xác nhận xóa dòng' });
    await confirmDeleteBtn.click();

    // Expect toast error with Vietnamese message
    const toastError = page.locator('[data-sonner-toast]').filter({ hasText: /âm kho/i }).first();
    await expect(toastError).toBeVisible({ timeout: 8_000 });

    const sc3_toast = path.join(EVIDENCE_DIR, 'step_03_edge_case_negative_stock_blocked.png');
    await page.screenshot({ path: sc3_toast, fullPage: false });
    console.log(`[Evidence] Saved: ${sc3_toast}`);

    // Close the confirmation dialog
    const cancelBtn = deleteConfirmModal.locator('button', { hasText: 'Hủy bỏ' });
    await cancelBtn.click();
    await deleteConfirmModal.waitFor({ state: 'hidden', timeout: 5_000 });
    await page.waitForTimeout(1000);

    // =========================================================================
    // STEP 4: PRE-CHECK & RESTORE IF ALREADY SOFT-DELETED
    // =========================================================================
    const existingRestoreBtns = detailDialog.locator('button', { hasText: 'Hoàn tác dòng xóa' });
    if ((await existingRestoreBtns.count()) > 0) {
      console.log('--- Restoring existing soft-deleted line to bring inventory to fresh baseline ---');
      const firstRestoreBtn = existingRestoreBtns.first();
      await firstRestoreBtn.scrollIntoViewIfNeeded();
      await firstRestoreBtn.click();

      const rModal = page.locator('[role="dialog"]').filter({ hasText: 'Xác nhận hoàn tác dòng giao dịch' }).first();
      await rModal.waitFor({ state: 'visible', timeout: 8_000 });

      const rReason = rModal.locator('textarea[placeholder*="Nhập lý do điều chỉnh"], input[placeholder*="Nhập lý do điều chỉnh"]').first();
      await rReason.waitFor({ state: 'visible', timeout: 5_000 });
      await rReason.fill('[E2E-SETUP] Khôi phục dòng giao dịch về trạng thái ban đầu');

      const rConfirm = rModal.locator('button', { hasText: 'Xác nhận hoàn tác dòng' });
      await rConfirm.click();
      await rModal.waitFor({ state: 'hidden', timeout: 15_000 });
      await page.waitForTimeout(2000);
    }

    // =========================================================================
    // STEP 5: HAPPY CASE 1 - Super Admin Soft-Deletes a Valid Small Transaction (5 kiện)
    // =========================================================================
    console.log('--- STEP 5: Executing Valid Soft-Delete on Transaction Line (5 kiện) ---');
    const row5Kien = detailDialog.locator('.relative.flex.items-stretch').filter({ hasText: '+5 kiện' }).first();
    const btnDeleteSmall = row5Kien.locator('button', { hasText: 'Xóa bớt dòng' }).first();
    await btnDeleteSmall.scrollIntoViewIfNeeded();
    await btnDeleteSmall.click();

    const deleteModal = page.locator('[role="dialog"]').filter({ hasText: 'Xác nhận xóa dòng giao dịch' }).first();
    await deleteModal.waitFor({ state: 'visible', timeout: 8_000 });

    const validReasonInput = deleteModal.locator('textarea[placeholder*="Nhập lý do điều chỉnh"], input[placeholder*="Nhập lý do điều chỉnh"]').first();
    await validReasonInput.waitFor({ state: 'visible', timeout: 5_000 });
    await validReasonInput.fill('[E2E-TEST] Điều chỉnh số lượng nhập kiểm toán kho hợp lệ ngày 21/10');

    const sc4_dialog = path.join(EVIDENCE_DIR, 'step_04_delete_confirmation_modal.png');
    await page.screenshot({ path: sc4_dialog, fullPage: false });
    console.log(`[Evidence] Saved: ${sc4_dialog}`);

    const confirmBtn = deleteModal.locator('button', { hasText: 'Xác nhận xóa dòng' });
    await confirmBtn.click();

    await deleteModal.waitFor({ state: 'hidden', timeout: 15_000 });
    await page.waitForTimeout(2000);

    // Verify row now shows [ĐÃ XÓA / ĐÃ HỦY DÒNG] badge and "Hoàn tác dòng xóa" button
    const restoreBtn = row5Kien.locator('button', { hasText: 'Hoàn tác dòng xóa' }).first();
    await expect(restoreBtn).toBeVisible({ timeout: 10_000 });

    const sc5 = path.join(EVIDENCE_DIR, 'step_05_soft_deleted_transaction_active.png');
    await page.screenshot({ path: sc5, fullPage: false });
    console.log(`[Evidence] Saved: ${sc5}`);

    // =======================================================================
    // STEP 6: HAPPY CASE 2 - Super Admin Restores the Soft-Deleted Transaction
    // =======================================================================
    console.log('--- STEP 6: Executing Restore on Soft-Deleted Transaction ---');
    await restoreBtn.scrollIntoViewIfNeeded();
    await restoreBtn.click();

    const restoreConfirmModal = page.locator('[role="dialog"]').filter({ hasText: 'Xác nhận hoàn tác dòng giao dịch' }).first();
    await restoreConfirmModal.waitFor({ state: 'visible', timeout: 8_000 });

    const restoreReasonInput = restoreConfirmModal.locator('textarea[placeholder*="Nhập lý do điều chỉnh"], input[placeholder*="Nhập lý do điều chỉnh"]').first();
    await restoreReasonInput.waitFor({ state: 'visible', timeout: 5_000 });
    await restoreReasonInput.fill('[E2E-TEST] Khôi phục lại dòng giao dịch sau khi đối soát thành công');

    const sc6_dialog = path.join(EVIDENCE_DIR, 'step_06_restore_confirmation_modal.png');
    await page.screenshot({ path: sc6_dialog, fullPage: false });
    console.log(`[Evidence] Saved: ${sc6_dialog}`);

    // Confirm restore
    const confirmRestoreBtn = restoreConfirmModal.locator('button', { hasText: 'Xác nhận hoàn tác dòng' });
    await confirmRestoreBtn.click();

    await restoreConfirmModal.waitFor({ state: 'hidden', timeout: 15_000 });
    await page.waitForTimeout(2000);

    // Verify row no longer shows deleted badge and restore button is gone
    await expect(row5Kien.locator('button', { hasText: 'Hoàn tác dòng xóa' })).toHaveCount(0, { timeout: 10_000 });

    const sc7 = path.join(EVIDENCE_DIR, 'step_07_transaction_restored_success.png');
    await page.screenshot({ path: sc7, fullPage: false });
    console.log(`[Evidence] Saved: ${sc7}`);

    // Close detail modal
    const closeBtn = detailDialog.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(1000);

    // =========================================================================
    // STEP 7: EDGE CASE 2 - RBAC Authorization Guard (Warehouse Manager)
    // =========================================================================
    console.log('--- STEP 7: Testing RBAC Guard with Warehouse Manager account ---');
    const browser = page.context().browser()!;
    const wmContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const wmPage = await wmContext.newPage();
    try {
      await loginAs(wmPage, warehouseHcmUser, BASE_URL);
      await wmPage.goto(`${BASE_URL}/dashboard/warehouse/orders`);
      await wmPage.waitForLoadState('networkidle').catch(() => {});

      const wmSearch = wmPage.locator('input[placeholder*="Tìm kiếm"]').first();
      await wmSearch.waitFor({ state: 'visible', timeout: 15_000 });
      await wmSearch.fill('NDA2610-0213');
      await wmPage.waitForTimeout(2000);

      const wmOrderRow = wmPage.locator('tr').filter({ hasText: 'NDA2610-0213' }).first();
      if (await wmOrderRow.isVisible()) {
        await wmOrderRow.click();
        const wmModal = wmPage.locator('[role="dialog"]').filter({ hasText: 'NDA2610-0213' }).first();
        await wmModal.waitFor({ state: 'visible', timeout: 10_000 });

        // Assert that NEITHER "Xóa bớt dòng" NOR "Hoàn tác dòng xóa" is visible for Warehouse Manager
        await expect(wmModal.locator('button', { hasText: 'Xóa bớt dòng' })).toHaveCount(0);
        await expect(wmModal.locator('button', { hasText: 'Hoàn tác dòng xóa' })).toHaveCount(0);

        const sc8 = path.join(EVIDENCE_DIR, 'step_08_rbac_warehouse_manager_no_delete_buttons.png');
        await wmPage.screenshot({ path: sc8, fullPage: false });
        console.log(`[Evidence] Saved: ${sc8}`);
      } else {
        const sc8 = path.join(EVIDENCE_DIR, 'step_08_rbac_warehouse_manager_no_delete_buttons.png');
        await wmPage.screenshot({ path: sc8, fullPage: false });
        console.log(`[Evidence] Saved (Hub isolated): ${sc8}`);
      }
    } finally {
      await wmContext.close();
    }

    console.log('🎉 ALL E2E HAPPY CASES & EDGE CASES PASSED WITH 100% VISUAL EVIDENCE RECORDED!');
  });
});
