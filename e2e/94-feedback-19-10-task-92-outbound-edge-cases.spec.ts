/**
 * frontend/e2e/94-feedback-19-10-task-92-outbound-edge-cases.spec.ts
 *
 * Automated Step-by-Step Playwright E2E Verification Suite for:
 * Feedback 19/10 (Task #92) — Xử Lý Toàn Diện 6 Edge Cases Khi Lấy & Xuất Kho Đơn Hàng Nhập Nhiều Lần
 * (Multi-Inbound Consolidation & Outbound Dispatch Edge Cases)
 *
 * Captures step-by-step visual evidence across all 6 operational edge cases:
 * - step_01_partial_outbound_10_of_25_form.png: Xuất từng phần 10/25 kiện của đơn gộp 2 lần nhập
 * - step_02_partial_outbound_receipt_quantity_allocated.png: Phiếu xuất kho A4 & xác nhận TripEntity lưu đúng quantityAllocated = 10
 * - step_03_duplicate_order_row_blocked.png: Chặn gõ trùng cùng 1 mã vận đơn ở Dòng 2 trên cùng Bảng kê Xuất kho
 * - step_04_refresh_metrics_updated_stock_20.png: Bấm "Cập nhật lại thông số" sau khi Xe 3 nhập thêm 5 kiện -> cập nhật Tồn từ 15 lên 20 kiện
 * - step_05_full_outbound_20_packages_receipt.png: Xuất kho hết 20/20 kiện tồn còn lại (đơn chuyển sang Đã xuất hết)
 * - step_06_reinbound_after_full_outbound_restored_stock.png: Xe 4 nhập bổ sung 8 kiện sau khi đơn đã xuất hết -> Khôi phục currentHubId & LƯU KHO (8 / 38 kiện)
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

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_19_10_task_92');
const STEP_01_PATH = path.join(EVIDENCE_DIR, 'step_01_partial_outbound_10_of_25_form.png');
const STEP_02_PATH = path.join(
  EVIDENCE_DIR,
  'step_02_partial_outbound_receipt_quantity_allocated.png'
);
const STEP_03_PATH = path.join(EVIDENCE_DIR, 'step_03_duplicate_order_row_blocked.png');
const STEP_04_PATH = path.join(EVIDENCE_DIR, 'step_04_refresh_metrics_updated_stock_20.png');
const STEP_05_PATH = path.join(EVIDENCE_DIR, 'step_05_full_outbound_20_packages_receipt.png');
const STEP_06_PATH = path.join(
  EVIDENCE_DIR,
  'step_06_reinbound_after_full_outbound_restored_stock.png'
);
const VERIFIED_MAIN_PATH = path.join(
  EVIDENCE_DIR,
  'screenshot_feedback_19_10_task_92_verified.png'
);

let TEST_ORDER_CODE = `T92E-${Date.now().toString().slice(-5)}`;

test.use({ baseURL: DEV_FRONTEND_URL, headless: true });

test.describe
  .serial('Feedback 19/10 (Task #92) — Kiểm Thử 6 Edge Cases Khi Lấy & Xuất Kho Đơn Hàng Nhập Nhiều Lần', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('STEP 1 & STEP 2 (Edge Cases #1 & #4): Tạo đơn gộp 2 lần nhập (25 kiện) -> Xuất từng phần 10 kiện -> Kiểm chứng TripEntity.quantityAllocated = 10 & tồn còn 15 kiện', async ({
    page,
    request
  }) => {
    test.setTimeout(120000);
    TEST_ORDER_CODE = `T92E-${Date.now().toString().slice(-5)}`;
    await page.setViewportSize({ width: 1440, height: 900 });

    // Đăng nhập API với tài khoản warehouse_hcm để tạo nhanh 2 đợt nhập kho cho TEST_ORDER_CODE
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
    expect(Boolean(token)).toBe(true);

    // Đợt nhập 1: Xe 51C-92001 chở 10 kiện, 100 kg, 1.0 m³
    const batch1Res = await request.post(`${DEV_BACKEND_URL}/warehouse/inbound/batch-create`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        licensePlate: '51C-92001',
        driverName: 'Tài Xế Nhập Đợt 1',
        items: [
          {
            orderCode: TEST_ORDER_CODE,
            pickupAddress: 'Kho Quận 7, TP.HCM',
            goodsDescription: 'Máy nén khí công nghiệp Hitachi',
            totalQuantity: 10,
            totalWeight: 100,
            totalVolume: 1.0,
            deliveryAddress: 'KCN Biên Hòa 2, Đồng Nai',
            province: 'Đồng Nai',
            accompanyingDocs: 'HD-9201',
            notes: 'Nhập đợt 1 (10 kiện)'
          }
        ]
      },
      timeout: 15000
    });
    expect(batch1Res.ok()).toBeTruthy();

    // Đợt nhập 2: Xe 51C-92002 chở thêm 15 kiện, 150 kg, 1.5 m³ cùng mã TEST_ORDER_CODE (Tổng = 25 kiện)
    const batch2Res = await request.post(`${DEV_BACKEND_URL}/warehouse/inbound/batch-create`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        licensePlate: '51C-92002',
        driverName: 'Tài Xế Nhập Đợt 2',
        items: [
          {
            orderCode: TEST_ORDER_CODE,
            pickupAddress: 'Kho Bình Tân, TP.HCM',
            goodsDescription: 'Máy nén khí công nghiệp Hitachi',
            totalQuantity: 15,
            totalWeight: 150,
            totalVolume: 1.5,
            deliveryAddress: 'KCN Biên Hòa 2, Đồng Nai',
            province: 'Đồng Nai',
            accompanyingDocs: 'HD-9201',
            notes: 'Nhập đợt 2 (15 kiện)'
          }
        ]
      },
      timeout: 15000
    });
    expect(batch2Res.ok()).toBeTruthy();

    // Mở màn hình Xuất kho và thực hiện xuất từng phần 10 / 25 kiện
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`, {
      waitUntil: 'domcontentloaded'
    });

    const header = page.locator('h1', { hasText: 'Xuất kho' });
    await expect(header.first()).toBeVisible({ timeout: 25000 });

    const outboundActionBtn = page
      .locator('table tbody button', { hasText: /Tiếp tục|In phiếu xuất/i })
      .first();
    await expect(outboundActionBtn).toBeVisible({ timeout: 25000 });

    const btnCreateOutbound = page.locator('main button', { hasText: /^\s*Xuất kho\s*$/i }).first();
    await expect(btnCreateOutbound).toBeVisible({ timeout: 15000 });
    await btnCreateOutbound.click();

    await expect(page.getByRole('button', { name: /Quay lại danh sách/i }).first()).toBeVisible({
      timeout: 15000
    });

    // Điền Biển số xe xuất đợt 1 & Tài xế
    const plateInput = page.locator('input[placeholder*="29C-123.45"]').first();
    const driverInput = page.locator('input[placeholder*="Nguyễn Văn A"]').first();
    await plateInput.fill('51C-92101');
    await driverInput.fill('Tài Xế Xuất Đợt 1');

    // Gõ mã vận đơn TEST_ORDER_CODE vào Dòng 1 và nhấn Enter
    const row0 = page.locator('table tbody tr').first();
    const row0Inputs = row0.locator('input');
    await row0Inputs.nth(0).fill(TEST_ORDER_CODE);
    await row0Inputs.nth(0).press('Enter');

    // Kiểm tra tự động nạp tổng 25 kiện, 250 kg, 2.5 m³ và hiển thị Tồn: 25
    await expect(row0Inputs.nth(1)).toHaveValue('Máy nén khí công nghiệp Hitachi', {
      timeout: 15000
    });
    await expect(row0Inputs.nth(2)).toHaveValue('25');
    await expect(row0).toContainText('Tồn: 25');

    // Chỉnh số lượng xuất đợt 1 thành 10 kiện (xuất từng phần 10/25 kiện)
    await row0Inputs.nth(2).fill('10');
    await row0Inputs.nth(2).press('Tab');

    // Chụp hình Bước 1: Form xuất từng phần 10 / 25 kiện
    await page.screenshot({ path: STEP_01_PATH, fullPage: false });
    expect(fs.existsSync(STEP_01_PATH)).toBe(true);

    // Bấm "Xác nhận xuất kho"
    const btnConfirmOutbound = page.getByRole('button', { name: /Xác nhận xuất kho/i }).first();
    await expect(btnConfirmOutbound).toBeEnabled();
    await btnConfirmOutbound.click();

    // Chờ Modal Phiếu Xuất Kho A4 mở ra và chụp hình Bước 2
    const receiptModal = page.locator('[role="dialog"]').first();
    await expect(receiptModal).toBeVisible({ timeout: 25000 });
    await expect(receiptModal).toContainText(TEST_ORDER_CODE);
    await page.screenshot({ path: STEP_02_PATH, fullPage: false });
    expect(fs.existsSync(STEP_02_PATH)).toBe(true);

    // Kiểm chứng Edge Case #1 qua API: TripEntity vừa tạo phải có quantityAllocated === 10 (không bị NULL)
    const orderDetailRes = await request.get(
      `${DEV_BACKEND_URL}/orders/${encodeURIComponent(TEST_ORDER_CODE)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      }
    );
    expect(orderDetailRes.ok()).toBeTruthy();
    const orderDetailJson = await orderDetailRes.json();
    const orderData = orderDetailJson?.data ?? orderDetailJson;
    expect(Number(orderData.remainingQuantity)).toBe(15);
    expect(Number(orderData.outboundQuantity)).toBe(10);

    const outboundTrips = (orderData.trips ?? []).filter((t: any) => t.type === 'OUTBOUND');
    expect(outboundTrips.length).toBeGreaterThan(0);
    expect(Number(outboundTrips[0].quantityAllocated)).toBe(10);
  });

  test('STEP 3 & STEP 4 (Edge Cases #2, #3, #5): Chặn chọn trùng mã vận đơn ở 2 dòng trên phiếu xuất & Bấm "Cập nhật lại thông số" cập nhật tồn kho thực tế sau khi Xe 3 nhập bổ sung', async ({
    page,
    request
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });

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

    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`, {
      waitUntil: 'domcontentloaded'
    });

    await expect(page.locator('h1', { hasText: 'Xuất kho' }).first()).toBeVisible({
      timeout: 25000
    });
    await expect(
      page.locator('table tbody button', { hasText: /Tiếp tục|In phiếu xuất/i }).first()
    ).toBeVisible({ timeout: 25000 });

    const btnCreateOutbound = page.locator('main button', { hasText: /^\s*Xuất kho\s*$/i }).first();
    await btnCreateOutbound.click();

    await expect(page.getByRole('button', { name: /Quay lại danh sách/i }).first()).toBeVisible({
      timeout: 15000
    });

    const plateInput = page.locator('input[placeholder*="29C-123.45"]').first();
    const driverInput = page.locator('input[placeholder*="Nguyễn Văn A"]').first();
    await plateInput.fill('51C-92102');
    await driverInput.fill('Tài Xế Xuất Đợt 2');

    // Dòng 1: Gõ TEST_ORDER_CODE -> Tồn hiện tại = 15 kiện
    const row0 = page.locator('table tbody tr').first();
    const row0Inputs = row0.locator('input');
    await row0Inputs.nth(0).fill(TEST_ORDER_CODE);
    await row0Inputs.nth(0).press('Enter');

    await expect(row0Inputs.nth(1)).toHaveValue('Máy nén khí công nghiệp Hitachi', {
      timeout: 15000
    });
    await expect(row0).toContainText('Tồn: 15');

    // EDGE CASE #5: Thêm Dòng 2 và gõ lại cùng mã TEST_ORDER_CODE -> Phải bị chặn và reset Dòng 2
    const btnAddRow = page.getByRole('button', { name: /Thêm 1 dòng đơn mới|Thêm dòng/i }).first();
    await btnAddRow.click();
    await expect(page.locator('table tbody tr')).toHaveCount(2);

    const row1 = page.locator('table tbody tr').nth(1);
    const row1Inputs = row1.locator('input');
    await row1Inputs.nth(0).fill(TEST_ORDER_CODE);
    await row1Inputs.nth(0).press('Enter');

    // Khẳng định Dòng 2 bị reset về rỗng và không được nạp trùng tên hàng / số kiện
    await expect(row1Inputs.nth(0)).toHaveValue('', { timeout: 15000 });
    await expect(row1Inputs.nth(1)).toHaveValue('');

    // Chụp hình Bước 3: Bằng chứng chặn chọn trùng mã vận đơn thành 2 dòng trên phiếu xuất
    await page.screenshot({ path: STEP_03_PATH, fullPage: false });
    expect(fs.existsSync(STEP_03_PATH)).toBe(true);

    // Xóa Dòng 2 trống để chỉ giữ lại Dòng 1
    const btnDeleteRow1 = row1.locator('button[title*="Xóa"], button:has(svg.lucide-trash-2)').first();
    if (await btnDeleteRow1.isVisible()) {
      await btnDeleteRow1.click();
    }

    // EDGE CASE #3: Trong lúc thủ kho đang mở phiếu xuất (Dòng 1 đang hiển thị Tồn: 15),
    // Xe 3 chở thêm 5 kiện của TEST_ORDER_CODE về nhập kho (tồn thực tế tăng lên 20 kiện)
    const batch3Res = await request.post(`${DEV_BACKEND_URL}/warehouse/inbound/batch-create`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        licensePlate: '51C-92003',
        driverName: 'Tài Xế Nhập Đợt 3',
        items: [
          {
            orderCode: TEST_ORDER_CODE,
            pickupAddress: 'Kho Tân Bình, TP.HCM',
            goodsDescription: 'Máy nén khí công nghiệp Hitachi',
            totalQuantity: 5,
            totalWeight: 50,
            totalVolume: 0.5,
            deliveryAddress: 'KCN Biên Hòa 2, Đồng Nai',
            province: 'Đồng Nai',
            accompanyingDocs: 'HD-9201',
            notes: 'Nhập đợt 3 bổ sung (5 kiện)'
          }
        ]
      },
      timeout: 15000
    });
    expect(batch3Res.ok()).toBeTruthy();

    // Thủ kho bấm nút "Cập nhật lại thông số" trên thanh công cụ Xuất kho
    const btnRefresh = page.getByRole('button', { name: /Cập nhật lại thông số/i }).first();
    await expect(btnRefresh).toBeVisible();
    await btnRefresh.click();

    // Khẳng định Dòng 1 được giải nén đúng JSON + flow=OUTBOUND_LOOKUP và cập nhật Tồn từ 15 lên 20!
    await expect(row0).toContainText('Tồn: 20', { timeout: 15000 });

    // Chụp hình Bước 4: Nút "Cập nhật lại thông số" cập nhật tồn khả dụng lên Tồn: 20
    await page.screenshot({ path: STEP_04_PATH, fullPage: false });
    expect(fs.existsSync(STEP_04_PATH)).toBe(true);

    // Xuất hết toàn bộ 20 kiện tồn kho còn lại (để đưa đơn về trạng thái Đã xuất hết - COMPLETED_INBOUND)
    await row0Inputs.nth(2).fill('20');
    await row0Inputs.nth(2).press('Tab');

    const btnConfirmOutbound2 = page.getByRole('button', { name: /Xác nhận xuất kho/i }).first();
    await expect(btnConfirmOutbound2).toBeEnabled();
    await btnConfirmOutbound2.click();

    const receiptModal2 = page.locator('[role="dialog"]').first();
    await expect(receiptModal2).toBeVisible({ timeout: 25000 });
    await expect(receiptModal2).toContainText(TEST_ORDER_CODE);

    // Chụp hình Bước 5: Phiếu xuất kho 20 kiện còn lại (hoàn tất xuất 30/30 kiện)
    await page.screenshot({ path: STEP_05_PATH, fullPage: false });
    expect(fs.existsSync(STEP_05_PATH)).toBe(true);
  });

  test('STEP 5 (Edge Case #6): Đơn hàng đã xuất hết 100% (30/30 kiện) được Xe 4 chở về nhập bổ sung 8 kiện -> Tự động khôi phục currentHubId, trạng thái LƯU KHO và hiển thị 1 dòng (8 / 38 kiện)', async ({
    page,
    request
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

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

    // Xe 4 chở thêm 8 kiện của TEST_ORDER_CODE về nhập kho sau khi 30 kiện trước đó đã xuất hết
    const batch4Res = await request.post(`${DEV_BACKEND_URL}/warehouse/inbound/batch-create`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        licensePlate: '51C-92004',
        driverName: 'Tài Xế Nhập Đợt 4',
        items: [
          {
            orderCode: TEST_ORDER_CODE,
            pickupAddress: 'Kho Cát Lái, TP.HCM',
            goodsDescription: 'Máy nén khí công nghiệp Hitachi',
            totalQuantity: 8,
            totalWeight: 80,
            totalVolume: 0.8,
            deliveryAddress: 'KCN Biên Hòa 2, Đồng Nai',
            province: 'Đồng Nai',
            accompanyingDocs: 'HD-9201',
            notes: 'Nhập đợt 4 sau khi đã xuất hết (8 kiện)'
          }
        ]
      },
      timeout: 15000
    });
    expect(batch4Res.ok()).toBeTruthy();

    // Kiểm tra trên màn hình Đơn hàng kho (/dashboard/warehouse/orders)
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/orders`, {
      waitUntil: 'domcontentloaded'
    });

    await expect(
      page.locator('h1', { hasText: 'Tổng Hợp Đơn Hàng Tại Kho' }).first()
    ).toBeVisible({ timeout: 25000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 25000 });

    const searchInput = page.locator('input[placeholder*="Tìm kiếm theo mã đơn"]').first();
    await searchInput.fill(TEST_ORDER_CODE);

    // Non-Empty Visual Evidence Gate: bắt buộc có đúng 1 dòng duy nhất
    const filteredRows = page.locator('table tbody tr', { hasText: TEST_ORDER_CODE });
    await expect(filteredRows).toHaveCount(1, { timeout: 20000 });

    const singleRow = filteredRows.first();
    // Tổng nhập 4 đợt = 10 + 15 + 5 + 8 = 38 kiện; Đã xuất 2 đợt = 10 + 20 = 30 kiện; Tồn khả dụng = 8 / 38 kiện; Trạng thái = LƯU KHO
    await expect(singleRow).toContainText('Máy nén khí công nghiệp Hitachi');
    await expect(singleRow).toContainText('8');
    await expect(singleRow).toContainText('/ 38');
    await expect(singleRow).toContainText('LƯU KHO');

    // Chụp hình Bước 6 & Ảnh nghiệm thu chính thức
    await page.screenshot({ path: STEP_06_PATH, fullPage: false });
    await page.screenshot({ path: VERIFIED_MAIN_PATH, fullPage: false });
    expect(fs.existsSync(STEP_06_PATH)).toBe(true);
    expect(fs.existsSync(VERIFIED_MAIN_PATH)).toBe(true);
  });
});
