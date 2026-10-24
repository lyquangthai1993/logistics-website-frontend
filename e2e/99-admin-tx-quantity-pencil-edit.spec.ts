import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, TEST_USERS, USER_WAREHOUSE_HCM } from './helpers/auth';

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  'https://frontend-tms-core-dev.up.railway.app';
const EVIDENCE_DIR = path.resolve(__dirname, '../../issues/issue_24_10_tx_qty_edit');

test.describe('Super Admin Inline Transaction Quantity Edit via Pencil Icon & Activity Log Audit (Task #99)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Super Admin can click pencil icon to adjust transaction package quantity with ACID balance & RBAC guard', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });

    const adminUser = TEST_USERS[0]; // Super Admin
    const warehouseHcmUser = USER_WAREHOUSE_HCM || TEST_USERS[5];

    // =========================================================================
    // STEP 1: Super Admin Login & Search NAV2610-0128 in /dashboard/warehouse/orders
    // =========================================================================
    await loginAs(page, adminUser, BASE_URL);
    await page.goto(`${BASE_URL}/dashboard/warehouse/orders`);

    const searchInput = page.locator('input[placeholder*="Tìm kiếm"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.fill('NAV2610-0128');
    await searchInput.press('Enter');

    const orderCell = page
      .locator('td')
      .filter({ hasText: 'NAV2610-0128' })
      .first();
    await expect(orderCell).toBeVisible({ timeout: 15_000 });

    const rowCount = await page
      .locator('tr')
      .filter({ hasText: 'NAV2610-0128' })
      .count();
    expect(rowCount).toBeGreaterThan(0);

    await orderCell.click();

    const detailDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: 'NAV2610-0128' })
      .first();
    await expect(detailDialog).toBeVisible({ timeout: 15_000 });
    await expect(detailDialog.locator('text=Tồn kho khả dụng')).toBeVisible({
      timeout: 10_000,
    });

    // =========================================================================
    // STEP 2: Verify Pencil Icon is Visible on Active Transaction Line
    // =========================================================================
    const pencilBtn = detailDialog
      .locator('[data-testid^="btn-edit-tx-qty-"]')
      .first();
    await expect(pencilBtn).toBeVisible({ timeout: 10_000 });

    const testIdAttr = await pencilBtn.getAttribute('data-testid');
    const txId = testIdAttr?.replace('btn-edit-tx-qty-', '') || '';
    expect(txId.length).toBeGreaterThan(0);

    const qtyDisplay = detailDialog.locator(
      `[data-testid="tx-qty-display-${txId}"]`,
    );
    await expect(qtyDisplay).toBeVisible();
    const initialQtyText = (await qtyDisplay.innerText()).trim();
    const initialQtyMatch = initialQtyText.match(/(\d+)/);
    const originalQty = initialQtyMatch ? parseInt(initialQtyMatch[1], 10) : 27;
    const adjustedQty = originalQty + 3;

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'screenshot_01_superadmin_pencil_icon_visible.png'),
      fullPage: false,
    });

    // =========================================================================
    // STEP 3: Click Pencil Icon -> Inline Editor Opens -> Adjust Quantity & Save
    // =========================================================================
    await pencilBtn.click();

    const qtyInput = detailDialog.locator(
      `[data-testid="input-edit-tx-qty-${txId}"]`,
    );
    const reasonInput = detailDialog.locator(
      `[data-testid="input-edit-tx-reason-${txId}"]`,
    );
    const saveBtn = detailDialog.locator(
      `[data-testid="btn-save-tx-qty-${txId}"]`,
    );

    await expect(qtyInput).toBeVisible({ timeout: 5_000 });
    await expect(reasonInput).toBeVisible({ timeout: 5_000 });
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });

    const inlineReasonTag = await reasonInput.evaluate((el) => el.tagName);
    expect(inlineReasonTag).toBe('TEXTAREA');

    await qtyInput.fill(String(adjustedQty));
    await reasonInput.fill(
      `[E2E-TEST] Điều chỉnh số lượng kiện từ ${originalQty} lên ${adjustedQty} kiện`,
    );

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'screenshot_02_inline_quantity_editor_open.png'),
      fullPage: false,
    });

    await saveBtn.click();

    // Expect inline input to close and updated quantity badge to reflect adjustedQty
    await expect(qtyInput).toBeHidden({ timeout: 15_000 });
    await expect(qtyDisplay).toContainText(`${adjustedQty} kiện`, {
      timeout: 10_000,
    });

    // Expect Activity Log section to show TRANSACTION_UPDATED entry
    const auditSection = detailDialog.locator(
      'text=Nhật ký thao tác & Thay đổi dữ liệu',
    );
    await expect(auditSection).toBeVisible({ timeout: 10_000 });
    await expect(
      detailDialog.locator('text=TRANSACTION_UPDATED').first(),
    ).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'screenshot_03_quantity_updated_and_audit_logged.png'),
      fullPage: false,
    });

    // =========================================================================
    // STEP 4: Restore Original Quantity to Keep Production/Dev Parity Clean
    // =========================================================================
    await pencilBtn.click();
    await expect(qtyInput).toBeVisible({ timeout: 5_000 });
    await qtyInput.fill(String(originalQty));
    await reasonInput.fill(
      `[E2E-TEST] Hoàn trả số lượng gốc ${originalQty} kiện sau kiểm thử`,
    );
    await saveBtn.click();

    await expect(qtyInput).toBeHidden({ timeout: 15_000 });
    await expect(qtyDisplay).toContainText(`${originalQty} kiện`, {
      timeout: 10_000,
    });

    // =========================================================================
    // STEP 4.5: Verify "Lý do điều chỉnh" in Delete Confirmation Modal is a Textarea
    // =========================================================================
    const deleteBtn = detailDialog.locator('button', { hasText: 'Xóa bớt dòng' }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.click();

    const deleteConfirmModal = page.locator('[role="dialog"]').filter({ hasText: 'Xác nhận xóa dòng giao dịch kho' }).first();
    await expect(deleteConfirmModal).toBeVisible({ timeout: 5_000 });

    const modalReasonTextarea = deleteConfirmModal.locator('textarea[placeholder*="Nhập lý do điều chỉnh"]').first();
    await expect(modalReasonTextarea).toBeVisible({ timeout: 5_000 });

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'screenshot_05_delete_modal_reason_textarea_verified.png'),
      fullPage: false,
    });

    const cancelDeleteBtn = deleteConfirmModal.locator('button', { hasText: 'Hủy bỏ' }).first();
    await cancelDeleteBtn.click();
    await expect(deleteConfirmModal).toBeHidden({ timeout: 5_000 });

    // =========================================================================
    // STEP 5: RBAC Verification - Warehouse Manager Must NOT See Pencil Icon
    // =========================================================================
    const browser = page.context().browser()!;
    const wmContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const wmPage = await wmContext.newPage();
    try {
      await loginAs(wmPage, warehouseHcmUser, BASE_URL);
      await wmPage.goto(`${BASE_URL}/dashboard/warehouse/orders`);

      const wmSearch = wmPage
        .locator('input[placeholder*="Tìm kiếm"]')
        .first();
      await expect(wmSearch).toBeVisible({ timeout: 15_000 });
      await wmSearch.fill('NAV2610-0128');
      await wmSearch.press('Enter');

      const wmCell = wmPage
        .locator('td')
        .filter({ hasText: 'NAV2610-0128' })
        .first();
      await expect(wmCell).toBeVisible({ timeout: 15_000 });
      await wmCell.click();

      const wmDialog = wmPage
        .locator('[role="dialog"]')
        .filter({ hasText: 'NAV2610-0128' })
        .first();
      await expect(wmDialog).toBeVisible({ timeout: 10_000 });

      await expect(
        wmDialog.locator('[data-testid^="btn-edit-tx-qty-"]'),
      ).toHaveCount(0);
      await expect(
        wmDialog.locator('button', { hasText: 'Xóa bớt dòng' }),
      ).toHaveCount(0);

      await wmPage.screenshot({
        path: path.join(EVIDENCE_DIR, 'screenshot_04_rbac_warehouse_manager_no_pencil_verified.png'),
        fullPage: false,
      });
    } finally {
      await wmContext.close();
    }
  });
});
