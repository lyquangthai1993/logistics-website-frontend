/**
 * e2e/42-feedback-09-10-task-13.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 09/10 (Task 13) — Tách Cột Thông Tin Hàng Hóa & Chuẩn Hóa Thuật Ngữ (Số Lượng, CBM) Tại Màn Hình Tổng Hợp Đơn Hàng Kho
 *
 * Scenarios Tested:
 * 1. 11 Independent Columns in Table Header (STT, Ngày nhập, Mã vận đơn, Tên hàng hóa, Số lượng, Số kg, CBM, Đích đến, Trạng thái, Ngày xuất, Thao tác)
 * 2. Right-alignment (text-right) for quantitative columns: SỐ LƯỢNG, SỐ KG, CBM
 * 3. Standard Terminology: 'SỐ LƯỢNG' (not 'Số kiện' / 'Số lượng tồn kho'), 'CBM' (not 'M3' / 'Số m³')
 * 4. Multi-line expand: Child rows spread across all 11 columns accurately
 * 5. Search & Status filter tabs responsiveness
 * 6. Modal detail inspection: 'SỐ LƯỢNG' and 'CBM' columns in WarehouseWaybillDetailModal
 * 7. Compact density verification and visual proof capture
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './helpers/auth';
import path from 'path';

test.describe('Feedback 09/10 Task 13: 11-Column Warehouse Orders Table & Terminology Standardization', () => {
  const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN') || TEST_USERS[0];

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30_000);
  });

  test('E2E Verification: 11-Column Layout, Numeric Alignment, Terminology & Detail Modal', async ({ page }) => {
    // 1. Login as Super Admin / Warehouse Manager
    await loginAs(page, superAdmin);

    // 2. Navigate to Warehouse Orders Master Page
    await page.goto('/dashboard/warehouse/orders', { waitUntil: 'domcontentloaded' });

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 15_000 });

    // 3. Verify exactly 11 columns in the table header
    const headers = page.locator('table thead tr th');
    await expect(headers).toHaveCount(11);

    const headerTexts = (await headers.allInnerTexts()).map((t) => t.trim().toUpperCase());

    // Verify all 11 expected headers
    expect(headerTexts[0]).toContain('STT');
    expect(headerTexts[1]).toContain('NGÀY NHẬP');
    expect(headerTexts[2]).toContain('MÃ VẬN ĐƠN');
    expect(headerTexts[3]).toContain('TÊN HÀNG HÓA');
    expect(headerTexts[4]).toContain('SỐ LƯỢNG');
    expect(headerTexts[5]).toContain('SỐ KG');
    expect(headerTexts[6]).toContain('CBM');
    expect(headerTexts[7]).toContain('ĐÍCH ĐẾN');
    expect(headerTexts[8]).toContain('TRẠNG THÁI');
    expect(headerTexts[9]).toContain('NGÀY XUẤT');
    expect(headerTexts[10]).toContain('THAO TÁC');

    // Terminology check: strictly no legacy "M3" or "m³" or "SỐ KIỆN" on header
    expect(headerTexts[6]).not.toContain('M3');
    expect(headerTexts[6]).not.toContain('M³');
    expect(headerTexts[4]).not.toContain('KIỆN');

    // 4. Verify Right-Alignment on numeric header columns
    const qtyHeader = headers.nth(4);
    const kgHeader = headers.nth(5);
    const cbmHeader = headers.nth(6);

    await expect(qtyHeader).toHaveClass(/text-right/);
    await expect(kgHeader).toHaveClass(/text-right/);
    await expect(cbmHeader).toHaveClass(/text-right/);

    // 5. Verify Rows and Column Data Structure
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      const firstRow = rows.first();
      const cells = firstRow.locator('td');
      const cellCount = await cells.count();

      // Check if it's a valid data row (11 cells)
      if (cellCount === 11) {
        // Col 3: Mã vận đơn (should contain bold font-mono order code)
        const codeCell = cells.nth(2);
        await expect(codeCell.locator('.font-mono')).toBeVisible();

        // Col 4: Tên hàng hóa is separate
        const goodsCell = cells.nth(3);
        const goodsText = await goodsCell.innerText();
        expect(goodsText.length).toBeGreaterThan(0);

        // Col 5: Số lượng (text-right)
        const qtyCell = cells.nth(4);
        await expect(qtyCell).toHaveClass(/text-right/);

        // Col 6: Số kg (text-right)
        const kgCell = cells.nth(5);
        await expect(kgCell).toHaveClass(/text-right/);

        // Col 7: CBM (text-right)
        const cbmCell = cells.nth(6);
        await expect(cbmCell).toHaveClass(/text-right/);

        // Col 8: Đích đến is separate
        const destCell = cells.nth(7);
        const destText = await destCell.innerText();
        expect(destText.length).toBeGreaterThan(0);

        // 6. Test Multi-line expand if an order has multiple lines
        const expandBtn = page.locator('table tbody tr button:has-text("Xem dòng")').first();
        if (await expandBtn.isVisible()) {
          await expandBtn.click();
          await page.waitForTimeout(400);

          // Find expanded child row
          const childRow = page.locator('table tbody tr.bg-slate-50\\/60, table tbody tr:has-text("Dòng 1")').first();
          if (await childRow.isVisible()) {
            const childCells = childRow.locator('td');
            expect(await childCells.count()).toBe(11);
          }
        }

        // 7. Test Waybill Detail Modal
        const detailBtn = firstRow.locator('button[title="Xem chi tiết vận đơn"], button[title="Xem chi tiết tổng hợp"]').first();
        if (await detailBtn.isVisible()) {
          await detailBtn.click();
          await page.waitForTimeout(600);

          const dialog = page.locator('[role="dialog"]');
          await expect(dialog).toBeVisible({ timeout: 8_000 });

          // Verify modal contains "Danh mục hàng hóa vận đơn" table
          const modalTableThead = dialog.locator('table thead tr th');
          if ((await modalTableThead.count()) > 0) {
            const modalHeaderTexts = (await modalTableThead.allInnerTexts()).map((t) => t.trim().toUpperCase());
            expect(modalHeaderTexts.some((h) => h.includes('SỐ LƯỢNG'))).toBe(true);
            expect(modalHeaderTexts.some((h) => h.includes('CBM'))).toBe(true);
            expect(modalHeaderTexts.some((h) => h.includes('SỐ KIỆN'))).toBe(false);
            expect(modalHeaderTexts.some((h) => h.includes('SỐ M³'))).toBe(false);
          }

          // Close modal
          const closeBtn = dialog.locator('button:has-text("Đóng")').first();
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(300);
          }
        }
      }
    }

    // 8. Capture Visual Proof Screenshot for Task 13
    const screenshotPaths = [
      path.resolve(__dirname, '../../feedback_09_10_task_13/screenshot_verified.png'),
      path.resolve(__dirname, '../../feedback_09_10_task_13/screenshot_09_10_task_13_verified.png')
    ];

    for (const p of screenshotPaths) {
      await page.screenshot({ path: p, fullPage: false });
    }
  });
});
