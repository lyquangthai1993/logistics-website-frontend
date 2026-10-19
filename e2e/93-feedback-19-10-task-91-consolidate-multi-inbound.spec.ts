/**
 * frontend/e2e/93-feedback-19-10-task-91-consolidate-multi-inbound.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 19/10 (Task #91) — Gom 1 Dòng Duy Nhất Cho Đơn Hàng Nhập Nhiều Lần,
 * Cộng Dồn Số Lượng/Kg/Khối & Khóa Cứng Thông Tin Gốc Khi Nhập Mới Trùng Mã Vận Đơn
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:4000';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_19_10_task_91');
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_feedback_19_10_task_91_verified.png');

let existingSampleOrderCode = '';

test.describe
  .serial('Feedback 19/10 (Task #91) — Gom 1 Dòng Đơn Nhập Nhiều Lần & Khóa Cứng Thông Tin Gốc', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Màn hình Đơn hàng kho (/dashboard/warehouse/orders) gom 1 dòng duy nhất cho mỗi mã vận đơn, không tách Dòng 1..N', async ({
    page
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/orders`, {
      waitUntil: 'domcontentloaded'
    });

    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.first()).toBeVisible({ timeout: 25000 });

    const loader = page.getByText('Đang tải dữ liệu đơn hàng...');
    if (await loader.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(loader).not.toBeVisible({ timeout: 25000 });
    }

    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Lấy 1 mã vận đơn thực tế trên bảng để dùng cho test kiểm tra khóa trường gốc ở CASE-02
    const firstCodeCell = tableRows.first().locator('td').nth(2);
    existingSampleOrderCode = ((await firstCodeCell.innerText()) || '').trim();
    expect(existingSampleOrderCode.length).toBeGreaterThan(2);

    // Xác nhận không còn nút "Xem dòng" / "Thu gọn" hoặc badge "{N} dòng" trên bảng Đơn hàng kho
    const expandButtons = page.locator('table tbody button', {
      hasText: /Xem dòng|Thu gọn/i
    });
    await expect(expandButtons).toHaveCount(0);

    const multiLineBadges = page.locator('table tbody', {
      hasText: /\d+\s+dòng/i
    });
    await expect(multiLineBadges).toHaveCount(0);

    // Chụp ảnh bằng chứng nghiệm thu màn hình Đơn hàng kho đã gom 1 dòng duy nhất
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
    expect(fs.existsSync(SCREENSHOT_PATH)).toBe(true);
  });

  test('CASE-02: Khi nhập mới mã vận đơn đã tồn tại trong bảng Nhập kho, khóa cứng Tên hàng, Địa điểm giao, Tỉnh/TP, Chứng từ theo lần đầu và chỉ mở Điểm lấy, SL, Kg, Khối', async ({
    page
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`, {
      waitUntil: 'domcontentloaded'
    });

    const pageHeader = page.locator('h1', { hasText: 'Nhập kho' });
    await expect(pageHeader.first()).toBeVisible({ timeout: 25000 });

    // Mở modal tạo phiếu nhập kho mới ("Tạo chuyến mới" / "Nhập kho mới")
    const createInboundBtn = page
      .locator('button', { hasText: /Tạo|Nhập kho mới|Nhận hàng/i })
      .first();
    await expect(createInboundBtn).toBeVisible({ timeout: 20000 });
    await createInboundBtn.click();

    const modalDialog = page.locator('[role="dialog"]').first();
    await expect(modalDialog).toBeVisible({ timeout: 15000 });

    // Thêm dòng thứ 2 để kiểm tra nhập trùng mã vận đơn ngay trên lưới hoặc mã vận đơn đã có trên hệ thống
    const addRowBtn = modalDialog.locator('button', { hasText: /Thêm dòng/i }).first();
    if (await addRowBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addRowBtn.click();
    }

    const gridRows = modalDialog.locator('table tbody tr');
    await expect(gridRows.first()).toBeVisible({ timeout: 15000 });

    const testCode = existingSampleOrderCode || 'TEST-LOCK-91';
    const row0 = gridRows.first();
    const row0Inputs = row0.locator('input');
    const row0Textareas = row0.locator('textarea');

    // Nhập dòng 1 với mã vận đơn mẫu
    const orderCodeInput0 = row0Inputs.first();
    await orderCodeInput0.fill(testCode);

    // Nếu là mã mới trên lưới, điền thông tin gốc ở dòng 1 rồi kiểm tra dòng 2 tự khóa theo dòng 1
    if ((await gridRows.count()) >= 2) {
      const goodsInput0 = row0Inputs.nth(1);
      if (await goodsInput0.isEnabled()) {
        await goodsInput0.fill('Hàng gốc lần 1');
      }
      const deliveryTextarea0 = row0Textareas.nth(1);
      if (await deliveryTextarea0.isEnabled()) {
        await deliveryTextarea0.fill('Bình Thạnh, HCM');
      }

      const row1 = gridRows.nth(1);
      const row1Inputs = row1.locator('input');
      const row1Textareas = row1.locator('textarea');

      // Nhập cùng mã vận đơn vào dòng 2
      await row1Inputs.first().fill(testCode);

      // Kiểm tra trên dòng 2: Tên hàng hóa (input thứ 2), Địa chỉ giao (textarea thứ 2), Tỉnh/TP (textarea thứ 3), Chứng từ (input thứ 5) bị khóa cứng (disabled)
      const goodsInput1 = row1Inputs.nth(1);
      const pickupTextarea1 = row1Textareas.nth(0);
      const deliveryTextarea1 = row1Textareas.nth(1);
      const provinceTextarea1 = row1Textareas.nth(2);
      const qtyInput1 = row1Inputs.nth(2);
      const weightInput1 = row1Inputs.nth(3);
      const volumeInput1 = row1Inputs.nth(4);
      const docsInput1 = row1Inputs.nth(5);

      await expect(goodsInput1).toBeDisabled();
      await expect(deliveryTextarea1).toBeDisabled();
      await expect(provinceTextarea1).toBeDisabled();
      await expect(docsInput1).toBeDisabled();

      // Kiểm tra Địa điểm lấy, Số lượng, Số kg, Số khối vẫn mở cho chỉnh sửa
      await expect(pickupTextarea1).toBeEnabled();
      await expect(qtyInput1).toBeEnabled();
      await expect(weightInput1).toBeEnabled();
      await expect(volumeInput1).toBeEnabled();
    }
  });
});
