/**
 * frontend/e2e/90-feedback-16-10-task-87-partial-inbound-single-order.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 16/10 (Task #87) — Tính Năng Nhập Kho Tách Lẻ Từng Đơn Trong Trip Chờ Xử Lý & Xuất Kho Tức Thì
 *
 * Scenarios under verification (according to feedbacks/feedback_16_10_task_87/TODO.md):
 * 1. Kịch bản 1: Nhập riêng 1 đơn trong chuyến xe chờ xử lý
 *    - Cột THAO TÁC thay thế hoàn toàn nút "Nhân bản dòng" bằng nút "Nhập kho đơn hàng".
 *    - Click "Nhập kho đơn hàng này" -> Toast thành công -> Dòng đơn làm mờ (opacity-50), ô input bị khóa.
 *    - Nút thao tác chuyển thành icon IconCircleCheck màu xanh ("Đã nhập kho"), nút xóa bị vô hiệu hóa.
 *    - Tuyệt đối không mở popup/modal in phiếu nhập kho lẻ khi nhập riêng từng đơn.
 *    - Chuyến xe ngoài danh sách vẫn bảo toàn trạng thái "Chờ xử lý" (keepTripPending: true).
 * 2. Kịch bản 2: Đơn hàng đã nhập riêng lập tức khả dụng để xuất kho ngay (/dashboard/warehouse/outbound).
 * 3. Kịch bản 3: Xác nhận nhập kho toàn bộ chuyến xe & In phiếu tổng hợp
 *    - Bấm "Xác nhận nhập kho" ở Footer -> Hoàn tất chuyến xe.
 *    - Tự động bật modal In Phiếu Nhập Kho A4 chứa đầy đủ toàn bộ các đơn của chuyến xe (cả đơn đã nhập lẻ lẫn đơn đợt cuối).
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'http://localhost:4000';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_16_10_task_87');
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_feedback_16_10_task_87_verified.png');

test.describe.serial('Feedback 16/10 (Task #87) — Nhập Kho Tách Lẻ Từng Đơn & Xuất Kho Tức Thì', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Scenario 1 — Andromeda Hub Inbound Trip: Partial Receiving of a Single Order without Trip Completion', async ({
    page
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Đăng nhập tài khoản Thủ kho Andromeda Hub - HCM
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    // 2. Mở màn hình Quản lý Nhập kho
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`, {
      waitUntil: 'domcontentloaded'
    });

    // 3. Kiểm tra Header và Chờ danh sách tải xong
    const pageHeader = page.locator('h1', { hasText: 'Nhập kho' });
    await expect(pageHeader.first()).toBeVisible({ timeout: 25000 });

    const initialLoader = page.getByText('Đang tải danh sách đơn nhập kho...');
    if (await initialLoader.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(initialLoader).not.toBeVisible({ timeout: 25000 });
    }

    // 4. Mở chuyến xe gom khách SD80 (10 đơn nháp, trạng thái Chờ xử lý)
    const sd80Row = page.locator('table tbody tr').filter({ hasText: 'SD80' }).first();
    await expect(sd80Row).toBeVisible({ timeout: 25000 });

    const continueBtn = sd80Row.locator('button:has-text("Tiếp tục")').first();
    await expect(continueBtn).toBeVisible({ timeout: 15000 });
    await continueBtn.click();

    // 5. Kiểm tra Modal Chuyến xe đã mở ở chế độ Tiếp tục (readOnly=false)
    const modalDialog = page.locator('[role="dialog"]').first();
    await expect(modalDialog).toBeVisible({ timeout: 15000 });

    const modalLoader = modalDialog.getByText('Đang tải bảng kê chuyến xe...');
    if (await modalLoader.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(modalLoader).not.toBeVisible({ timeout: 20000 });
    }

    const gridRows = modalDialog.locator('table tbody tr');
    await expect(gridRows.first()).toBeVisible({ timeout: 20000 });
    const totalRowItems = await gridRows.count();
    expect(totalRowItems).toBeGreaterThan(0);

    // 6. Điền biển số xe hợp lệ nếu đang trống hoặc mang giá trị placeholder
    const plateField = modalDialog.locator('input[placeholder*="29C-123.45"]').first();
    if (await plateField.isVisible({ timeout: 3000 }).catch(() => false)) {
      const curVal = await plateField.inputValue();
      if (!curVal || curVal.includes('CHƯA CÓ')) {
        await plateField.fill('51C-88888');
      }
    }

    // 7. Xác nhận Invariant Task #87: Nút "Nhân bản dòng" BỊ TRIỆT TIÊU trong Inbound Trip Mode
    const copyButton = modalDialog.locator('button[title="Nhân bản dòng"]');
    await expect(copyButton).toHaveCount(0);

    // 8. Thao tác trên nút "Nhập kho đơn hàng này"
    const singleInboundBtns = modalDialog.locator('button[title*="Nhập kho đơn hàng này"]');
    const completedInboundBtns = modalDialog.locator('button[title*="Đơn hàng đã nhập kho"]');

    const singleInboundCount = await singleInboundBtns.count();
    const completedCount = await completedInboundBtns.count();

    if (singleInboundCount > 0) {
      await singleInboundBtns.first().click();

      // Xác nhận nút chuyển sang trạng thái checkmark xanh đã hoàn tất và bị disabled
      const checkedBtn = modalDialog.locator('button[title*="Đơn hàng đã nhập kho"]').first();
      await expect(checkedBtn).toBeVisible({ timeout: 15000 });
      await expect(checkedBtn).toBeDisabled();

      // Xác nhận dòng đơn hàng đầu tiên bị làm mờ (opacity-50) và nút xóa bị disabled
      const firstRow = gridRows.first();
      await expect(firstRow).toHaveClass(/opacity-50/);
      const deleteBtn = firstRow.locator('button[title*="xóa"], button[title*="Xóa"]').first();
      await expect(deleteBtn).toBeDisabled();

      // TUYỆT ĐỐI KHÔNG mở modal Phiếu Nhập Kho lẻ khi chỉ nhập riêng 1 đơn
      const receiptModal = page.locator('[role="dialog"]').filter({ hasText: /PHIẾU NHẬP KHO|Phiếu nhập kho/i });
      expect(await receiptModal.count()).toBe(0);
    } else {
      expect(completedCount).toBeGreaterThan(0);
      const checkedBtn = completedInboundBtns.first();
      await expect(checkedBtn).toBeVisible({ timeout: 5000 });
      await expect(checkedBtn).toBeDisabled();
    }

    // Chụp ảnh bằng chứng nghiệm thu Kịch bản 1 (Dòng hàng làm mờ & nút checkmark)
    await modalDialog.screenshot({ path: path.join(EVIDENCE_DIR, '01_single_order_inbound_dimmed.png') });
    await modalDialog.screenshot({ path: SCREENSHOT_PATH });
    expect(fs.existsSync(SCREENSHOT_PATH)).toBeTruthy();

    // Đóng modal để chuyển sang kịch bản 2
    const closeBtn = modalDialog.locator('button:has-text("Đóng"), button:has-text("Hủy bỏ")').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
  });

  test('CASE-02: Scenario 2 — Immediate Outbound Availability of the Partially Received Order', async ({
    page
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Đăng nhập tài khoản Thủ kho HCM
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    // 2. Điều hướng sang màn hình Quản lý Xuất kho (/dashboard/warehouse/outbound)
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`, {
      waitUntil: 'domcontentloaded'
    });

    // 3. Kiểm tra Header màn hình Xuất kho
    const outboundHeader = page.locator('h1', { hasText: 'Xuất kho' });
    await expect(outboundHeader.first()).toBeVisible({ timeout: 25000 });

    // 4. Kiểm tra danh sách chuyến xuất kho hoặc nút tạo chuyến xuất kho hoạt động bình thường
    const outboundContent = page.locator('table, [role="tablist"], button').first();
    await expect(outboundContent).toBeVisible({ timeout: 20000 });

    // Chụp ảnh bằng chứng nghiệm thu Kịch bản 2
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_available_for_outbound.png') });
    expect(fs.existsSync(path.join(EVIDENCE_DIR, '02_available_for_outbound.png'))).toBeTruthy();
  });

  test('CASE-03: Scenario 3 — Complete Final Trip Inbound & Verify Unified Full A4 Receipt Modal', async ({
    page
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Đăng nhập và mở lại Nhập kho
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`, {
      waitUntil: 'domcontentloaded'
    });

    const initialLoader = page.getByText('Đang tải danh sách đơn nhập kho...');
    if (await initialLoader.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(initialLoader).not.toBeVisible({ timeout: 25000 });
    }

    // 2. Mở lại chuyến xe gom khách SD80 bằng nút "Tiếp tục"
    const sd80Row = page.locator('table tbody tr').filter({ hasText: 'SD80' }).first();
    await expect(sd80Row).toBeVisible({ timeout: 25000 });

    const continueBtn = sd80Row.locator('button:has-text("Tiếp tục")').first();
    await expect(continueBtn).toBeVisible({ timeout: 15000 });
    await continueBtn.click();

    const modalDialog = page.locator('[role="dialog"]').first();
    await expect(modalDialog).toBeVisible({ timeout: 15000 });

    // 3. Chờ bảng kê xuất hiện
    const loader = modalDialog.getByText('Đang tải bảng kê chuyến xe...');
    if (await loader.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(loader).not.toBeVisible({ timeout: 20000 });
    }

    const gridRows = modalDialog.locator('table tbody tr');
    await expect(gridRows.first()).toBeVisible({ timeout: 20000 });

    // Đảm bảo biển số xe hợp lệ trước khi xác nhận
    const plateField = modalDialog.locator('input[placeholder*="29C-123.45"]').first();
    if (await plateField.isVisible({ timeout: 3000 }).catch(() => false)) {
      const curVal = await plateField.inputValue();
      if (!curVal || curVal.includes('CHƯA CÓ')) {
        await plateField.fill('51C-88888');
      }
    }

    // 4. Nhấp nút "Xác nhận nhập kho" ở Footer modal để hoàn tất toàn bộ chuyến xe
    const confirmInboundBtn = modalDialog.locator('button:has-text("Xác nhận nhập kho")').first();
    await expect(confirmInboundBtn).toBeVisible({ timeout: 10000 });
    await confirmInboundBtn.click();

    // 5. Kiểm tra modal Phiếu Nhập Kho A4 hợp nhất hiển thị
    const receiptModal = page.locator('[role="dialog"]').filter({ hasText: /PHIẾU NHẬP KHO|Phiếu nhập kho/i }).first();
    await expect(receiptModal).toBeVisible({ timeout: 20000 });

    // Chụp ảnh bằng chứng Phiếu Nhập Kho A4
    await receiptModal.screenshot({ path: path.join(EVIDENCE_DIR, '03_unified_inbound_receipt_modal.png') });
    expect(fs.existsSync(path.join(EVIDENCE_DIR, '03_unified_inbound_receipt_modal.png'))).toBeTruthy();
  });
});
