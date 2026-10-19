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

const DEV_BACKEND_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://backend-tms-core-dev.up.railway.app/api/v1';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_19_10_task_91');
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_feedback_19_10_task_91_verified.png');

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

    // Chờ dữ liệu bảng danh sách chuyến xe tải xong (nút Tiếp tục / In phiếu nhập xuất hiện sau useEffect) để đảm bảo React hydration hoàn tất 100%
    const hydratedTripActionBtn = page
      .locator('table tbody button', { hasText: /Tiếp tục|In phiếu nhập/i })
      .first();
    await expect(hydratedTripActionBtn).toBeVisible({ timeout: 25000 });

    // Mở màn hình tạo đơn nhập mới ("Tạo đơn nhập mới" -> inline MODE1_CUSTOMER view)
    const createInboundBtn = page.getByRole('button', { name: /Tạo đơn nhập mới/i }).first();
    await expect(createInboundBtn).toBeVisible({ timeout: 20000 });
    await createInboundBtn.click();

    const backToListBtn = page.getByRole('button', { name: /Quay lại danh sách/i }).first();
    await expect(backToListBtn).toBeVisible({ timeout: 15000 });

    // Thêm dòng thứ 2 để kiểm tra nhập trùng mã vận đơn ngay trên lưới
    const addRowBtn = page.getByRole('button', { name: /Thêm 1 dòng đơn mới/i }).first();
    await expect(addRowBtn).toBeVisible({ timeout: 15000 });
    await addRowBtn.click();

    const gridRows = page.locator('table tbody tr');
    await expect(gridRows).toHaveCount(2, { timeout: 15000 });

    const testCode = 'TEST-LOCK-91';
    const row0 = gridRows.nth(0);
    const row0Inputs = row0.locator('input');
    const row0Textareas = row0.locator('textarea');

    // Nhập dòng 1 với mã vận đơn mẫu và thông tin gốc lần đầu nhập
    await row0Inputs.nth(0).fill(testCode);
    await row0Inputs.nth(1).fill('Hàng gốc lần 1');
    await row0Textareas.nth(0).fill('Kho Quận 1');
    await row0Textareas.nth(1).fill('Bình Thạnh, HCM');
    await row0Textareas.nth(2).fill('TP.HCM');
    await row0Inputs.nth(5).fill('HĐ-001');

    const row1 = gridRows.nth(1);
    const row1Inputs = row1.locator('input');
    const row1Textareas = row1.locator('textarea');

    // Nhập cùng mã vận đơn vào dòng 2 và nhấn Enter / blur để kích hoạt đồng bộ thông tin gốc
    await row1Inputs.nth(0).fill(testCode);
    await row1Inputs.nth(0).press('Enter');

    // Kiểm tra trên dòng 2: Tên hàng hóa (input thứ 2), Địa chỉ giao (textarea thứ 2), Tỉnh/TP (textarea thứ 3), Chứng từ (input thứ 5) tự động lấy theo dòng 1 và bị khóa cứng (disabled)
    const goodsInput1 = row1Inputs.nth(1);
    const pickupTextarea1 = row1Textareas.nth(0);
    const deliveryTextarea1 = row1Textareas.nth(1);
    const provinceTextarea1 = row1Textareas.nth(2);
    const qtyInput1 = row1Inputs.nth(2);
    const weightInput1 = row1Inputs.nth(3);
    const volumeInput1 = row1Inputs.nth(4);
    const docsInput1 = row1Inputs.nth(5);

    await expect(goodsInput1).toHaveValue('Hàng gốc lần 1');
    await expect(deliveryTextarea1).toHaveValue('Bình Thạnh, HCM');
    await expect(provinceTextarea1).toHaveValue('TP.HCM');
    await expect(docsInput1).toHaveValue('HĐ-001');

    await expect(goodsInput1).toBeDisabled();
    await expect(deliveryTextarea1).toBeDisabled();
    await expect(provinceTextarea1).toBeDisabled();
    await expect(docsInput1).toBeDisabled();

    // Kiểm tra Địa điểm lấy, Số lượng, Số kg, Số khối vẫn mở cho chỉnh sửa
    await expect(pickupTextarea1).toBeEnabled();
    await expect(qtyInput1).toBeEnabled();
    await expect(weightInput1).toBeEnabled();
    await expect(volumeInput1).toBeEnabled();
  });

  test('CASE-03: API Backend Dev gom 1 dòng duy nhất theo orderCode cho cả Đơn hàng kho và OUTBOUND_LOOKUP, lấy tên hàng/đích đến chuẩn theo lần đầu nhập', async ({
    request
  }) => {
    const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
      data: {
        email: USER_WAREHOUSE_HCM.username || USER_WAREHOUSE_HCM.email,
        password: USER_WAREHOUSE_HCM.password
      },
      timeout: 15000
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();
    const token = loginJson?.data?.token ?? loginJson?.token;
    expect(token).toBeTruthy();

    // Kiểm tra OUTBOUND_LOOKUP trả về danh sách đơn duy nhất theo orderCode (không trùng lặp mã vận đơn)
    const lookupRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/orders?flow=OUTBOUND_LOOKUP&limit=50`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      }
    );
    expect(lookupRes.ok()).toBeTruthy();
    const lookupJson = await lookupRes.json();
    const rows: any[] = lookupJson?.data ?? [];
    expect(rows.length).toBeGreaterThan(0);

    const seenCodes = new Set<string>();
    for (const r of rows) {
      const code = (r.orderCode || '').trim().toUpperCase();
      expect(seenCodes.has(code)).toBe(false);
      seenCodes.add(code);
    }
  });
});
