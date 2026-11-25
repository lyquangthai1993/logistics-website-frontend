import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, TEST_USERS, USER_WAREHOUSE_HCM } from './helpers/auth';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://frontend-tms-core-dev.up.railway.app';
const EVIDENCE_DIR =
  process.env.E2E_EVIDENCE_DIR ||
  path.resolve(__dirname, '../../feedbacks/feedback_11_25_task_127');

test.describe('Super Admin Inline Transaction Quantity Edit via Pencil Icon & Activity Log Audit (Task #99)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Super Admin keeps an outbound line unchanged when original kg and m³ are invalid', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, TEST_USERS[0], BASE_URL);
    await page.goto(`${BASE_URL}/dashboard/warehouse/orders`);

    const searchInput = page.locator('input[placeholder*="Tìm kiếm"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.fill('NAV2610-0128');
    await searchInput.press('Enter');
    const orderCell = page.locator('td').filter({ hasText: 'NAV2610-0128' }).first();
    await expect(orderCell).toBeVisible({ timeout: 15_000 });
    expect(await page.locator('tr').filter({ hasText: 'NAV2610-0128' }).count()).toBeGreaterThan(0);
    await orderCell.click();

    const detailDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: 'NAV2610-0128' })
      .first();
    await expect(detailDialog).toBeVisible({ timeout: 15_000 });
    const outboundTx = await page.evaluate(async (orderCode) => {
      const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.accessToken;
      const response = await fetch(
        `/api/v1/warehouse/orders/${encodeURIComponent(orderCode)}/transactions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error(`Could not load transactions (${response.status})`);
      const payload = await response.json();
      const data = payload?.data ?? payload;
      const tx = data.transactions?.find(
        (item: any) => item.type === 'OUTBOUND' && !item.isDeleted
      );
      return tx
        ? {
            id: Number(tx.id),
            quantity: Number(tx.quantity),
            weight: Number(tx.weight) || 0,
            volume: Number(tx.volume) || 0
          }
        : null;
    }, 'NAV2610-0128');
    expect(outboundTx).not.toBeNull();
    if (!outboundTx) throw new Error('Expected an active outbound transaction');
    expect(outboundTx.quantity).toBeGreaterThan(1);
    expect(outboundTx.weight <= 0 || outboundTx.volume <= 0).toBeTruthy();

    const txId = String(outboundTx.id);
    const pencilBtn = detailDialog.locator(`[data-testid="btn-edit-tx-qty-${txId}"]`);
    await expect(pencilBtn).toBeVisible({ timeout: 5_000 });
    const qtyDisplay = detailDialog.locator(`[data-testid="tx-qty-display-${txId}"]`);
    await pencilBtn.click();

    const qtyInput = detailDialog.locator(`[data-testid="input-edit-tx-qty-${txId}"]`);
    const volumeInput = detailDialog.locator(`[data-testid="input-edit-tx-volume-${txId}"]`);
    const weightInput = detailDialog.locator(`[data-testid="input-edit-tx-weight-${txId}"]`);
    const saveBtn = detailDialog.locator(`[data-testid="btn-save-tx-qty-${txId}"]`);
    const cancelBtn = detailDialog.locator(`[data-testid="btn-cancel-tx-qty-${txId}"]`);
    const status = detailDialog.locator(`[data-testid="tx-proportional-status-${txId}"]`);
    await expect(qtyInput).toHaveValue(String(outboundTx.quantity));
    await expect(volumeInput).toHaveValue(String(outboundTx.volume));
    await expect(weightInput).toHaveValue(String(outboundTx.weight));

    await qtyInput.fill(String(outboundTx.quantity - 1));
    await expect(status).toContainText('Không thể tính tam suất', { timeout: 5_000 });
    await expect(status).toContainText('Vui lòng nhập đủ kg và m³');
    await expect(volumeInput).toHaveValue(String(outboundTx.volume));
    await expect(weightInput).toHaveValue(String(outboundTx.weight));
    await expect(saveBtn).toBeDisabled();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'screenshot_06_outbound_invalid_base_blocks_save.png'),
      fullPage: false
    });

    await cancelBtn.click();
    await expect(qtyInput).toBeHidden({ timeout: 5_000 });
    await expect(qtyDisplay).toContainText(`${outboundTx.quantity} kiện`);
  });

  test('Super Admin can click pencil icon to adjust transaction package quantity with ACID balance & RBAC guard', async ({
    page
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

    const orderCell = page.locator('td').filter({ hasText: 'NAV2610-0128' }).first();
    await expect(orderCell).toBeVisible({ timeout: 15_000 });

    const rowCount = await page.locator('tr').filter({ hasText: 'NAV2610-0128' }).count();
    expect(rowCount).toBeGreaterThan(0);

    await orderCell.click();

    const detailDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: 'NAV2610-0128' })
      .first();
    await expect(detailDialog).toBeVisible({ timeout: 15_000 });
    await expect(detailDialog.locator('text=Tồn kho khả dụng')).toBeVisible({
      timeout: 10_000
    });

    // =========================================================================
    // STEP 2: Verify Pencil Icon is Visible on Active Transaction Line
    // =========================================================================
    const pencilBtn = detailDialog.locator('[data-testid^="btn-edit-tx-qty-"]').first();
    await expect(pencilBtn).toBeVisible({ timeout: 10_000 });

    const testIdAttr = await pencilBtn.getAttribute('data-testid');
    const txId = testIdAttr?.replace('btn-edit-tx-qty-', '') || '';
    expect(txId.length).toBeGreaterThan(0);

    const qtyDisplay = detailDialog.locator(`[data-testid="tx-qty-display-${txId}"]`);
    await expect(qtyDisplay).toBeVisible();
    const initialQtyText = (await qtyDisplay.innerText()).trim();
    const initialQtyMatch = initialQtyText.match(/(\d+)/);
    const originalQty = initialQtyMatch ? parseInt(initialQtyMatch[1], 10) : 27;
    const adjustedQty = originalQty + 3;

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'screenshot_01_superadmin_pencil_icon_visible.png'),
      fullPage: false
    });

    // =========================================================================
    // STEP 3: Click Pencil Icon -> Inline Editor Opens -> Adjust Quantity & Save
    // =========================================================================
    await pencilBtn.click();

    const qtyInput = detailDialog.locator(`[data-testid="input-edit-tx-qty-${txId}"]`);
    const volumeInput = detailDialog.locator(`[data-testid="input-edit-tx-volume-${txId}"]`);
    const weightInput = detailDialog.locator(`[data-testid="input-edit-tx-weight-${txId}"]`);
    const reasonInput = detailDialog.locator(`[data-testid="input-edit-tx-reason-${txId}"]`);
    const saveBtn = detailDialog.locator(`[data-testid="btn-save-tx-qty-${txId}"]`);

    await expect(qtyInput).toBeVisible({ timeout: 5_000 });
    await expect(volumeInput).toBeVisible({ timeout: 5_000 });
    await expect(weightInput).toBeVisible({ timeout: 5_000 });
    await expect(reasonInput).toBeVisible({ timeout: 5_000 });
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });

    const inlineReasonTag = await reasonInput.evaluate((el) => el.tagName);
    expect(inlineReasonTag).toBe('TEXTAREA');

    const originalVolume = Number(await volumeInput.inputValue());
    const originalWeight = Number(await weightInput.inputValue());
    expect(originalVolume).toBeGreaterThan(0);
    expect(originalWeight).toBeGreaterThan(0);
    let adjustmentNeedsRestore = false;

    try {
      await qtyInput.fill(String(adjustedQty));
      const quantityChangedAt = Date.now();
      await reasonInput.fill(
        `[E2E-TEST] Điều chỉnh số lượng kiện từ ${originalQty} lên ${adjustedQty} kiện`
      );

      // Quantity edits recalculate both metrics from the original transaction after 3 seconds.
      await expect(saveBtn).toBeDisabled();
      await weightInput.fill('999');
      await volumeInput.fill('999');
      const waitBeforeDebounce = Math.max(0, 2_500 - (Date.now() - quantityChangedAt));
      if (waitBeforeDebounce > 0) await page.waitForTimeout(waitBeforeDebounce);
      await expect(weightInput).toHaveValue('999');
      await expect(volumeInput).toHaveValue('999');
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'screenshot_02_inline_quantity_editor_open.png'),
        fullPage: false
      });
      const expectedWeight =
        Math.round(((originalWeight * adjustedQty) / originalQty) * 1000) / 1000;
      const expectedVolume =
        Math.round(((originalVolume * adjustedQty) / originalQty) * 1000) / 1000;
      await expect(weightInput).toHaveValue(String(expectedWeight), { timeout: 5_000 });
      await expect(volumeInput).toHaveValue(String(expectedVolume), { timeout: 5_000 });
      await expect(saveBtn).toBeEnabled();
      await reasonInput.fill(
        `[E2E-TEST] Điều chỉnh kiện và tam suất từ ${originalQty} lên ${adjustedQty}`
      );
      await page.waitForTimeout(350);
      const savedWeight = await weightInput.inputValue();
      const savedVolume = await volumeInput.inputValue();

      adjustmentNeedsRestore = true;
      await saveBtn.click();

      // Expect inline input to close and updated quantity badge to reflect adjustedQty
      await expect(qtyInput).toBeHidden({ timeout: 15_000 });
      await expect(qtyDisplay).toContainText(`${adjustedQty} kiện`, {
        timeout: 10_000
      });

      await pencilBtn.click();
      await expect(weightInput).toHaveValue(savedWeight, { timeout: 5_000 });
      await expect(volumeInput).toHaveValue(savedVolume, { timeout: 5_000 });
      await detailDialog.locator(`[data-testid="btn-cancel-tx-qty-${txId}"]`).click();
      await expect(qtyInput).toBeHidden({ timeout: 5_000 });

      // Expect Activity Log section to show TRANSACTION_UPDATED entry
      const auditSection = detailDialog.locator('text=Nhật ký thao tác & Thay đổi dữ liệu');
      await expect(auditSection).toBeVisible({ timeout: 10_000 });
      await expect(
        detailDialog.getByText('Điều chỉnh số lượng', { exact: false }).first()
      ).toBeVisible({ timeout: 10_000 });

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'screenshot_03_quantity_updated_and_audit_logged.png'),
        fullPage: false
      });

      // =========================================================================
      // STEP 4: Restore Original Quantity to Keep Production/Dev Parity Clean
      // =========================================================================
      await pencilBtn.click();
      await expect(qtyInput).toBeVisible({ timeout: 5_000 });
      await qtyInput.fill(String(originalQty));
      await expect(weightInput).toHaveValue(String(originalWeight), { timeout: 5_000 });
      await expect(volumeInput).toHaveValue(String(originalVolume), { timeout: 5_000 });
      await weightInput.fill(String(originalWeight));
      await volumeInput.fill(String(originalVolume));
      await reasonInput.fill(`[E2E-TEST] Hoàn trả số lượng gốc ${originalQty} kiện sau kiểm thử`);
      await saveBtn.click();

      await expect(qtyInput).toBeHidden({ timeout: 15_000 });
      await expect(qtyDisplay).toContainText(`${originalQty} kiện`, {
        timeout: 10_000
      });
      adjustmentNeedsRestore = false;

      // =========================================================================
      // STEP 4.5: Verify "Lý do điều chỉnh" in Delete Confirmation Modal is a Textarea
      // =========================================================================
      const deleteBtn = detailDialog.locator('button', { hasText: 'Xóa bớt dòng' }).first();
      await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
      await deleteBtn.click();

      const deleteConfirmModal = page
        .locator('[role="dialog"]')
        .filter({ hasText: 'Xác nhận xóa dòng giao dịch kho' })
        .first();
      await expect(deleteConfirmModal).toBeVisible({ timeout: 5_000 });

      const modalReasonTextarea = deleteConfirmModal
        .locator('textarea[placeholder*="Nhập lý do điều chỉnh"]')
        .first();
      await expect(modalReasonTextarea).toBeVisible({ timeout: 5_000 });

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'screenshot_05_delete_modal_reason_textarea_verified.png'),
        fullPage: false
      });

      const cancelDeleteBtn = deleteConfirmModal.locator('button', { hasText: 'Hủy bỏ' }).first();
      await cancelDeleteBtn.click();
      await expect(deleteConfirmModal).toBeHidden({ timeout: 5_000 });

      // =========================================================================
      // STEP 5: RBAC Verification - Warehouse Manager Must NOT See Pencil Icon
      // =========================================================================
      const browser = page.context().browser()!;
      const wmContext = await browser.newContext({
        viewport: { width: 1440, height: 900 }
      });
      const wmPage = await wmContext.newPage();
      try {
        await loginAs(wmPage, warehouseHcmUser, BASE_URL);
        await wmPage.goto(`${BASE_URL}/dashboard/warehouse/orders`);

        const wmSearch = wmPage.locator('input[placeholder*="Tìm kiếm"]').first();
        await expect(wmSearch).toBeVisible({ timeout: 15_000 });
        await wmSearch.fill('NAV2610-0128');
        await wmSearch.press('Enter');

        const wmCell = wmPage.locator('td').filter({ hasText: 'NAV2610-0128' }).first();
        await expect(wmCell).toBeVisible({ timeout: 15_000 });
        await wmCell.click();

        const wmDialog = wmPage
          .locator('[role="dialog"]')
          .filter({ hasText: 'NAV2610-0128' })
          .first();
        await expect(wmDialog).toBeVisible({ timeout: 10_000 });

        await expect(wmDialog.locator('[data-testid^="btn-edit-tx-qty-"]')).toHaveCount(0);
        await expect(wmDialog.locator('button', { hasText: 'Xóa bớt dòng' })).toHaveCount(0);

        await wmPage.screenshot({
          path: path.join(
            EVIDENCE_DIR,
            'screenshot_04_rbac_warehouse_manager_no_pencil_verified.png'
          ),
          fullPage: false
        });
      } finally {
        await wmContext.close();
      }
    } finally {
      if (adjustmentNeedsRestore) {
        if (!(await qtyInput.isVisible().catch(() => false))) {
          await pencilBtn.click();
        }
        await expect(qtyInput).toBeVisible({ timeout: 10_000 });
        await expect(qtyInput).toBeEnabled({ timeout: 10_000 });
        await qtyInput.fill(String(originalQty));
        await expect(saveBtn).toBeEnabled({ timeout: 10_000 });
        await weightInput.fill(String(originalWeight));
        await volumeInput.fill(String(originalVolume));
        await reasonInput.fill(`[E2E-TEST] Dọn dữ liệu kiểm thử, khôi phục ${originalQty} kiện`);
        await saveBtn.click();
        await expect(qtyInput).toBeHidden({ timeout: 15_000 });
        await expect(qtyDisplay).toContainText(`${originalQty} kiện`, {
          timeout: 10_000
        });
        adjustmentNeedsRestore = false;
      }
    }
  });
});
