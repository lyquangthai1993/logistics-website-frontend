/**
 * frontend/e2e/70-feedback-14-10-task-70-remove-accordion-chevron.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 14/10 (Task #70) — Loại bỏ nút chevron mở rộng dòng (>) trên bảng chuyến xe
 * và loại bỏ badge phân loại chuyến xe [Khách gửi trực tiếp / Luân chuyển nội bộ] trên header Modal.
 *
 * Requirements:
 * 1. Màn hình Xuất kho (/dashboard/warehouse/outbound):
 *    - Cột CHUYẾN XE / TRIP không còn nút mũi tên > mở rộng dòng accordion inline.
 *    - Toolbar không còn nút "Mở rộng tất cả / Thu gọn tất cả".
 *    - Click vào mã chuyến xe vẫn mở WarehouseTripDetailModal.
 * 2. Màn hình Nhập kho (/dashboard/warehouse/inbound):
 *    - Đồng bộ: Cột CHUYẾN XE / TRIP không còn nút > mở rộng dòng.
 *    - Toolbar không còn nút "Mở rộng tất cả / Thu gọn".
 * 3. Modal Chi tiết Chuyến xe (WarehouseTripDetailModal):
 *    - Header Bar không còn badge [Khách gửi trực tiếp] hoặc [Luân chuyển nội bộ].
 *    - Header Bar hiển thị gọn gàng: CHUYẾN XE {tripCode} và badge trạng thái.
 * 4. Bằng chứng kiểm thử:
 *    - screenshot_01_verified.png: Bảng Xuất kho sạch sẽ, không còn nút chevron >.
 *    - screenshot_02_verified.png: Header Modal sạch sẽ, không còn badge khoanh đỏ.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_14_10_task_70');

function saveEvidenceScreenshot(filename: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
    const target = path.join(EVIDENCE_DIR, filename);
    fs.writeFileSync(target, buffer);
    console.log(`[EVIDENCE SAVED] ${target}`);
  } catch (err) {
    console.warn('Could not save evidence screenshot:', err);
  }
}

test.describe.serial('Feedback 14/10 (Task #70) — Loại bỏ nút > mở rộng dòng & badge modal', () => {
  test('Outbound & Inbound: Không còn nút > mở rộng dòng, không còn nút toolbar và modal header không còn badge thừa', async ({
    page
  }) => {
    test.setTimeout(90000);

    // 1. Navigate to Sign In
    await page.goto(`${DEV_FRONTEND_URL}/auth/signin`);
    await page.waitForLoadState('domcontentloaded');

    // 2. Login as Warehouse Manager HCM (username: warehouse_hcm -> Andromeda Hub - HCM)
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    // 3. Navigate to Outbound Board
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`);
    await page.waitForLoadState('domcontentloaded');

    // 4. Assert: Toolbar không còn nút "Mở rộng tất cả" hoặc "Thu gọn tất cả"
    const expandAllBtnOutbound = page.locator('button:has-text("Mở rộng tất cả"), button:has-text("Thu gọn tất cả")');
    await expect(expandAllBtnOutbound).toHaveCount(0);

    // 5. Wait for table rows to render
    const outboundTripRows = page.locator('table tbody tr');
    await expect(outboundTripRows.first()).toBeVisible({ timeout: 15000 });
    const rowCount = await outboundTripRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // 6. Assert: Cột 1 không chứa nút bấm chevron (IconChevronRight / IconChevronDown)
    const chevronBtns = page.locator('table tbody td:first-child button[title*="đơn trên xe"], table tbody td:first-child button svg.tabler-icon-chevron-right, table tbody td:first-child button svg.tabler-icon-chevron-down');
    await expect(chevronBtns).toHaveCount(0);

    // 7. Save evidence screenshot 01: Outbound table without chevron >
    const tableScreenshot = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('screenshot_01_verified.png', tableScreenshot);

    // 8. Click on first trip code to open WarehouseTripDetailModal
    const firstTripBtn = page.locator('table tbody td:first-child button').first();
    await expect(firstTripBtn).toBeVisible();
    await firstTripBtn.click();

    // 9. Modal opens: verify header does NOT contain trip type badge [Khách gửi trực tiếp] / [Luân chuyển nội bộ]
    const modalDialog = page.locator('div[role="dialog"]');
    await expect(modalDialog).toBeVisible({ timeout: 10000 });

    const tripTypeBadge = modalDialog.locator('span:has-text("Khách gửi trực tiếp"), span:has-text("Luân chuyển nội bộ")');
    await expect(tripTypeBadge).toHaveCount(0);

    // Assert: Modal still has trip code header and status badge
    const modalTripHeader = modalDialog.locator('span.font-mono:has-text("CHUYẾN XE")');
    await expect(modalTripHeader).toBeVisible();

    // 10. Save evidence screenshot 02: Modal header without redundant badge
    const modalScreenshot = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('screenshot_02_verified.png', modalScreenshot);

    // Close modal
    const closeBtn = modalDialog.locator('button:has(svg.tabler-icon-x), button:has-text("Đóng")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }

    // 11. Navigate to Inbound Board to verify parity
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('domcontentloaded');

    // 12. Assert: Inbound toolbar does NOT have expand/collapse all button
    const expandAllBtnInbound = page.locator('button:has-text("Mở rộng"), button:has-text("Thu gọn")').filter({ hasText: /tất cả|xe/i });
    await expect(expandAllBtnInbound).toHaveCount(0);

    // 13. Assert: Inbound table does NOT contain chevron > buttons
    const inboundChevrons = page.locator('table tbody td:first-child button svg.tabler-icon-chevron-right, table tbody td:first-child button svg.tabler-icon-chevron-down');
    await expect(inboundChevrons).toHaveCount(0);
  });
});
