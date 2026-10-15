/**
 * frontend/e2e/86-feedback-15-10-task-86-hide-outbound-lookup-icon.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 15/10 (Task #86) — Tạm Thời Ẩn Nút Kính Lúp Tra Cứu Đơn Hàng Trong Bảng Kê Xuất Kho
 *
 * Business Requirements:
 * 1. Màn hình Xuất Kho (WarehouseOutboundPage -> MODE1_CUSTOMER):
 *    - Trong bảng kê soạn hàng xuất kho (WarehouseEditableGrid):
 *      Nút kính lúp tra cứu (IconSearch button title "Tra cứu kho để gán mã đơn")
 *      BẮT BUỘC BỊ ẨN HOÀN TOÀN khỏi cột MÃ VẬN ĐƠN.
 *    - Ô nhập Input mã vận đơn mở rộng tối đa không gian, không bị co kéo,
 *      vẫn giữ nguyên cơ chế tự động tìm kiếm khi nhập liệu (debounce 1.2s & phím Enter).
 * 2. Tuân thủ Quy chuẩn UI:
 *    - Compact Density Mandate: không sinh khoảng trống thừa, font text-[10px], h-7.
 *    - Zero Redundant Icons: không lặp icon/emoji.
 * 3. Bằng chứng nghiệm thu thực tế:
 *    - Lưu ảnh chụp xác minh tại: feedbacks/feedback_15_10_task_86/screenshot_01_verified.png
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_15_10_task_86');
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_01_verified.png');

test.describe.serial('Feedback 15/10 (Task #86) — Ẩn Nút Kính Lúp Tra Cứu Đơn Hàng Xuất Kho', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Static Code Audit — Kiểm tra OrderCodeCell không còn render nút kính lúp trong chế độ xuất kho', () => {
    const gridComponentPath = path.resolve(
      __dirname,
      '../src/features/warehouse/components/warehouse-editable-grid.tsx'
    );
    expect(fs.existsSync(gridComponentPath)).toBeTruthy();
    const content = fs.readFileSync(gridComponentPath, 'utf-8');

    const normalized = content.replace(/\r\n/g, '\n');
    // 1. Kiểm tra khối if (isOutbound) { return ... } không còn chứa nút bấm title='Tra cứu kho để gán mã đơn'
    const returnIdx = normalized.indexOf('if (isOutbound) {\n    return (');
    const isOutboundSection = normalized.substring(returnIdx, returnIdx + 800);

    expect(isOutboundSection).not.toContain("title='Tra cứu kho để gán mã đơn'");
    expect(isOutboundSection).not.toContain('meta?.openLookup?.(idx)');

    // 2. Ô input mã vận đơn trong chế độ outbound vẫn tồn tại và đầy đủ handler
    expect(isOutboundSection).toContain('handleOutboundChange');
    expect(isOutboundSection).toContain('isSearching');

    // 3. Quy chuẩn Compact Density: input h-7 px-1.5 text-[10px]
    expect(isOutboundSection).toContain('h-7 px-1.5 text-[10px]');
  });

  test('CASE-02: Live UI Verification & Real Evidence Capture — Mở Tạo Phiếu Xuất Kho và xác nhận ẩn hoàn toàn icon kính lúp trên bảng kê', async ({
    page
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Đăng nhập tài khoản thủ kho Andromeda Hub - HCM
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    // 2. Điều hướng tới Quản lý Xuất kho (/dashboard/warehouse/outbound)
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`, {
      waitUntil: 'domcontentloaded'
    });

    // 3. Chờ trang tải và bấm nút "Tạo phiếu xuất" hoặc "Tạo Phiếu Xuất Kho"
    const createOutboundBtn = page
      .getByRole('button', { name: /Tạo phiếu xuất/i })
      .or(page.locator('button:has-text("Tạo phiếu xuất")'))
      .first();

    await expect(createOutboundBtn).toBeVisible({ timeout: 25000 });
    await createOutboundBtn.click();

    // 4. Chờ giao diện MODE1_CUSTOMER "Tạo Phiếu Xuất Kho" xuất hiện
    await expect(
      page.getByText('Tạo Phiếu Xuất Kho').or(page.locator('h3:has-text("Tạo Phiếu Xuất Kho")')).first()
    ).toBeVisible({ timeout: 15000 });

    // 5. Chờ bảng kê Editable Grid xuất hiện các dòng
    const tableBody = page.locator('table tbody');
    await expect(tableBody).toBeVisible({ timeout: 15000 });
    const rows = tableBody.locator('tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // 6. Kiểm tra các dòng trong bảng kê: BẮT BUỘC KHÔNG có bất kỳ nút kính lúp tra cứu nào
    const lookupButtons = tableBody.locator('button[title*="Tra cứu kho"]');
    const lookupCount = await lookupButtons.count();
    expect(lookupCount).toBe(0);

    // 7. Kiểm tra ô input mã vận đơn hiển thị rõ ràng và có thể focus/tương tác
    const firstOrderInput = tableBody.locator('input').first();
    await expect(firstOrderInput).toBeVisible();

    // 8. Chụp ảnh màn hình nghiệm thu thực tế trực tiếp từ ứng dụng Web đang chạy (Ảnh thật 100%)
    await page.waitForTimeout(1000);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
    expect(fs.existsSync(SCREENSHOT_PATH)).toBeTruthy();
    console.log(`[VERIFIED EVIDENCE SAVED REAL UI] ${SCREENSHOT_PATH}`);
  });
});
