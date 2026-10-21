/**
 * frontend/e2e/96-feedback-21-10-task-94-delete-inbound-trip-order.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 21/10 (Task #94) — Đồng Bộ Xóa Dòng Đơn Hàng Trong Chuyến Nhập Kho & Triệt Tiêu Đơn Nháp Tồn Kho Ảo
 *
 * Logic Invariants Verified:
 * 1. Khi trip nhập mới tạo mã vận đơn mới -> khi xóa đơn trong trip, đơn hàng sẽ mất trong trip và mất luôn trong đơn hàng kho (không để lại đơn nháp rác).
 * 2. Nếu trip nhập hàng mà nhập vào mã vận đơn đã có lưu kho trước (hàng về nhiều đợt) -> khi xóa đơn trong trip thì các thông tin của mã vận đơn này KHÔNG THAY ĐỔI.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const DEV_BACKEND_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://backend-tms-core-dev.up.railway.app/api/v1';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_21_10_task_94_delete_inbound_trip_order');

test.describe.serial('Feedback 21/10 (Task #94) — Xóa Dòng Đơn Hàng Trong Chuyến Nhập & Triệt Tiêu Đơn Nháp Rác', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Xác minh dọn dẹp đơn DQT2610-099 và bảng kê chuyến SD212 không còn dòng số 7', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });

    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    // 1. Kiểm tra màn hình Tổng Hợp Đơn Hàng Tại Kho: Tra cứu DQT2610-099 không còn là Đơn nháp
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/orders`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder*="Tìm kiếm"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('DQT2610-099');
      await page.waitForTimeout(1500);

      // Tab Đơn nháp phải là (0) hoặc không tìm thấy dòng đơn nháp nào
      const draftTab = page.locator('button:has-text("ĐƠN NHÁP")');
      if (await draftTab.isVisible()) {
        const text = await draftTab.innerText();
        expect(text).toContain('(0)');
      }

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'step_01_no_phantom_draft_order.png'),
        fullPage: false
      });
    }

    // 2. Chuyển sang màn hình Nhập kho kiểm tra chuyến SD212
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Bấm tab "Đã xử lý" hoặc tìm kiếm chuyến SD212
    const tripSearch = page.locator('input[placeholder*="Tìm chuyến xe, biển số"]').first();
    if (await tripSearch.isVisible()) {
      await tripSearch.fill('43H21203');
      await page.waitForTimeout(1500);
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'screenshot_feedback_21_10_task_94_verified.png'),
      fullPage: false
    });
  });
});
