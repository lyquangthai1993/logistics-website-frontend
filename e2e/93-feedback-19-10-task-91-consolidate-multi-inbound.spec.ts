/**
 * frontend/e2e/93-feedback-19-10-task-91-consolidate-multi-inbound.spec.ts
 *
 * Automated Step-by-Step Playwright E2E Verification Suite for:
 * Feedback 19/10 (Task #91) — Gom 1 Dòng Duy Nhất Cho Đơn Hàng Nhập Nhiều Lần,
 * Cộng Dồn Số Lượng/Kg/Khối & Khóa Cứng Thông Tin Gốc Khi Nhập Mới Trùng Mã Vận Đơn
 *
 * Captures step-by-step visual evidence across the complete operational lifecycle:
 * - step_01_inbound_batch_1_form.png: Tạo nhập kho Lần 1 (Xe 1: 10 kiện, 100 kg, 1.5 m³)
 * - step_02_inbound_batch_1_receipt.png: Phiếu nhập kho A4 sau khi xác nhận Lần 1
 * - step_03_inbound_batch_2_locked_fields.png: Tạo nhập kho Lần 2 (Xe 2: 15 kiện, 150 kg, 2.5 m³) cùng mã vận đơn -> Khóa cứng Tên hàng, Địa chỉ giao, Tỉnh/TP, Chứng từ theo Lần 1; mở Điểm lấy, SL, Kg, Khối
 * - step_04_inbound_batch_2_receipt.png: Phiếu nhập kho A4 sau khi xác nhận Lần 2
 * - step_05_warehouse_orders_consolidated_single_row.png: Màn hình Đơn hàng kho (/dashboard/warehouse/orders) gom đúng 1 dòng duy nhất (25/25 kiện, 250 kg, 4 CBM)
 * - step_06_waybill_detail_ledger_2_batches.png: Modal chi tiết vận đơn ghi nhận đủ 2 lần xe nhập kho và tổng tồn 25 kiện
 * - step_07_outbound_single_row_lookup.png: Màn hình Xuất kho (/dashboard/warehouse/outbound) tra cứu mã đơn ra 1 dòng duy nhất với tổng tồn 25 kiện, 250 kg, 4 m³
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
const STEP_01_PATH = path.join(EVIDENCE_DIR, 'step_01_inbound_batch_1_form.png');
const STEP_02_PATH = path.join(EVIDENCE_DIR, 'step_02_inbound_batch_1_receipt.png');
const STEP_03_PATH = path.join(EVIDENCE_DIR, 'step_03_inbound_batch_2_locked_fields.png');
const STEP_04_PATH = path.join(EVIDENCE_DIR, 'step_04_inbound_batch_2_receipt.png');
const STEP_05_PATH = path.join(
  EVIDENCE_DIR,
  'step_05_warehouse_orders_consolidated_single_row.png'
);
const STEP_06_PATH = path.join(EVIDENCE_DIR, 'step_06_waybill_detail_ledger_2_batches.png');
const STEP_07_PATH = path.join(EVIDENCE_DIR, 'step_07_outbound_single_row_lookup.png');
const VERIFIED_MAIN_PATH = path.join(
  EVIDENCE_DIR,
  'screenshot_feedback_19_10_task_91_verified.png'
);

let TEST_ORDER_CODE = `T91M-${Date.now().toString().slice(-5)}`;

test.describe
  .serial('Feedback 19/10 (Task #91) — Quy Trình Từng Bước: Nhập 2 Lần Cùng Mã -> Khóa Trường Gốc -> Gom 1 Dòng Kho -> Xuất Kho 1 Dòng', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('STEP 1 & STEP 2: Nhập kho Lần 1 (Xe 1: 10 kiện, 100kg, 1.5m³) và Nhập kho Lần 2 (Xe 2: 15 kiện, 150kg, 2.5m³) kiểm chứng khóa cứng Tên hàng, Địa chỉ giao, Tỉnh/TP, Chứng từ', async ({
    page
  }) => {
    test.setTimeout(120000);
    TEST_ORDER_CODE = `T91M-${Date.now().toString().slice(-5)}`;
    await page.setViewportSize({ width: 1440, height: 900 });

    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`, {
      waitUntil: 'domcontentloaded'
    });

    const header = page.locator('h1', { hasText: 'Nhập kho' });
    await expect(header.first()).toBeVisible({ timeout: 25000 });

    // Chờ bảng danh sách chuyến xe hydrate xong
    const tripRows = page.locator('table tbody button', {
      hasText: /Tiếp tục|In phiếu nhập/i
    });
    await expect(tripRows.first()).toBeVisible({ timeout: 25000 });

    // =========================================================================
    // BƯỚC 1: TẠO NHẬP KHO LẦN 1 (XE 1: 51C-91001, 10 kiện, 100 kg, 1.5 m³)
    // =========================================================================
    const btnCreate1 = page.getByRole('button', { name: /Tạo đơn nhập mới/i }).first();
    await expect(btnCreate1).toBeVisible({ timeout: 15000 });
    await btnCreate1.click();

    await expect(page.getByRole('button', { name: /Quay lại danh sách/i }).first()).toBeVisible({
      timeout: 15000
    });

    // Điền biển số xe 1 & tài xế 1
    const plateInput1 = page.locator('input[placeholder*="29C-123.45"]').first();
    const driverInput1 = page.locator('input[placeholder*="Nguyễn Văn A"]').first();
    await plateInput1.fill('51C-91001');
    await driverInput1.fill('Tài Xế Ca Sáng');

    const row0 = page.locator('table tbody tr').first();
    const row0Inputs = row0.locator('input');
    const row0Textareas = row0.locator('textarea');

    await row0Inputs.nth(0).fill(TEST_ORDER_CODE);
    await row0Textareas.nth(0).fill('Kho Quận 1, TP.HCM');
    await row0Inputs.nth(1).fill('Thùng linh kiện điện tử Samsung');
    await row0Inputs.nth(2).fill('10');
    await row0Inputs.nth(3).fill('100');
    await row0Inputs.nth(4).fill('1.5');
    await row0Textareas.nth(1).fill('KCN VSIP 1, Thuận An, Bình Dương');
    await row0Textareas.nth(2).fill('Bình Dương');
    await row0Inputs.nth(5).fill('HD-9101');
    await row0Textareas.nth(3).fill('Xe 1 giao sáng');

    // Chụp hình Bước 1: Form Nhập kho Lần 1
    await page.screenshot({ path: STEP_01_PATH, fullPage: false });
    expect(fs.existsSync(STEP_01_PATH)).toBe(true);

    // Bấm "Xác nhận nhập kho" cho Lần 1
    const btnSubmit1 = page.getByRole('button', { name: /Xác nhận nhập kho/i }).first();
    await expect(btnSubmit1).toBeEnabled();
    await btnSubmit1.click();

    // Chờ Modal Phiếu Nhập Kho A4 Lần 1 mở ra và chụp hình Bước 2
    const modalReceipt1 = page.locator('[role="dialog"]').first();
    await expect(modalReceipt1).toBeVisible({ timeout: 25000 });
    await expect(modalReceipt1).toContainText(TEST_ORDER_CODE);
    await page.screenshot({ path: STEP_02_PATH, fullPage: false });
    expect(fs.existsSync(STEP_02_PATH)).toBe(true);

    // Đóng Modal Phiếu Nhập Kho Lần 1
    await page.keyboard.press('Escape');
    await expect(modalReceipt1).not.toBeVisible({ timeout: 15000 });

    // =========================================================================
    // BƯỚC 2: TẠO NHẬP KHO LẦN 2 (XE 2: 51C-91002, CÙNG MÃ VẬN ĐƠN)
    // =========================================================================
    const btnCreate2 = page.getByRole('button', { name: /Tạo đơn nhập mới/i }).first();
    await expect(btnCreate2).toBeVisible({ timeout: 15000 });
    await btnCreate2.click();

    await expect(page.getByRole('button', { name: /Quay lại danh sách/i }).first()).toBeVisible({
      timeout: 15000
    });

    const plateInput2 = page.locator('input[placeholder*="29C-123.45"]').first();
    const driverInput2 = page.locator('input[placeholder*="Nguyễn Văn A"]').first();
    await plateInput2.fill('51C-91002');
    await driverInput2.fill('Tài Xế Ca Chiều');

    const batch2Row = page.locator('table tbody tr').first();
    const batch2Inputs = batch2Row.locator('input');
    const batch2Textareas = batch2Row.locator('textarea');

    // Gõ lại Mã vận đơn đã tồn tại từ Lần 1 và nhấn Enter để tra cứu từ DB
    await batch2Inputs.nth(0).fill(TEST_ORDER_CODE);
    await batch2Inputs.nth(0).press('Enter');

    const goodsInput2 = batch2Inputs.nth(1);
    const pickupTextarea2 = batch2Textareas.nth(0);
    const deliveryTextarea2 = batch2Textareas.nth(1);
    const provinceTextarea2 = batch2Textareas.nth(2);
    const qtyInput2 = batch2Inputs.nth(2);
    const weightInput2 = batch2Inputs.nth(3);
    const volumeInput2 = batch2Inputs.nth(4);
    const docsInput2 = batch2Inputs.nth(5);
    const notesTextarea2 = batch2Textareas.nth(3);

    // Khẳng định các thông tin gốc tự động điền chuẩn theo Lần 1 và bị KHÓA CỨNG (disabled)
    await expect(goodsInput2).toHaveValue('Thùng linh kiện điện tử Samsung', {
      timeout: 15000
    });
    await expect(deliveryTextarea2).toHaveValue('KCN VSIP 1, Thuận An, Bình Dương');
    await expect(provinceTextarea2).toHaveValue('Bình Dương');
    await expect(docsInput2).toHaveValue('HD-9101');

    await expect(goodsInput2).toBeDisabled();
    await expect(deliveryTextarea2).toBeDisabled();
    await expect(provinceTextarea2).toBeDisabled();
    await expect(docsInput2).toBeDisabled();

    // Khẳng định Địa chỉ nhận (Điểm lấy), Số kiện, Số kg, Số khối vẫn mở để chỉnh sửa cho Xe 2
    await expect(pickupTextarea2).toBeEnabled();
    await expect(qtyInput2).toBeEnabled();
    await expect(weightInput2).toBeEnabled();
    await expect(volumeInput2).toBeEnabled();

    // Điền Điểm lấy mới của Xe 2 và số lượng/kg/khối của đợt 2 (15 kiện, 150 kg, 2.5 m³)
    await pickupTextarea2.fill('Kho Thủ Đức, TP.HCM');
    await qtyInput2.fill('15');
    await weightInput2.fill('150');
    await volumeInput2.fill('2.5');
    await notesTextarea2.fill('Xe 2 giao chiều bổ sung');

    // Chụp hình Bước 3: Giao diện khóa cứng trường gốc khi nhập Lần 2
    await page.screenshot({ path: STEP_03_PATH, fullPage: false });
    expect(fs.existsSync(STEP_03_PATH)).toBe(true);

    // Bấm "Xác nhận nhập kho" cho Lần 2
    const btnSubmit2 = page.getByRole('button', { name: /Xác nhận nhập kho/i }).first();
    await expect(btnSubmit2).toBeEnabled();
    await btnSubmit2.click();

    // Chờ Modal Phiếu Nhập Kho A4 Lần 2 mở ra và chụp hình Bước 4
    const modalReceipt2 = page.locator('[role="dialog"]').first();
    await expect(modalReceipt2).toBeVisible({ timeout: 25000 });
    await expect(modalReceipt2).toContainText(TEST_ORDER_CODE);
    await page.screenshot({ path: STEP_04_PATH, fullPage: false });
    expect(fs.existsSync(STEP_04_PATH)).toBe(true);
  });

  test('STEP 3: Màn hình Đơn hàng kho (/dashboard/warehouse/orders) gom đúng 1 dòng duy nhất và cộng dồn tổng (25/25 kiện, 250 kg, 4 CBM)', async ({
    page
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/orders`, {
      waitUntil: 'domcontentloaded'
    });

    const header = page.locator('h1', { hasText: 'Tổng Hợp Đơn Hàng Tại Kho' });
    await expect(header.first()).toBeVisible({ timeout: 25000 });

    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 25000 });

    // Tìm kiếm đúng mã vận đơn vừa nhập 2 lần
    const searchInput = page.locator('input[placeholder*="Tìm kiếm theo mã đơn"]').first();
    await searchInput.fill(TEST_ORDER_CODE);

    // Chờ kết quả lọc chỉ còn đúng 1 dòng duy nhất của mã TEST_ORDER_CODE
    const filteredRows = page.locator('table tbody tr', { hasText: TEST_ORDER_CODE });
    await expect(filteredRows).toHaveCount(1, { timeout: 20000 });
    await expect(page.locator('table tbody tr')).toHaveCount(1, { timeout: 20000 });

    const singleRow = filteredRows.first();
    // Kiểm tra tổng số lượng = 25 / 25 (10 + 15), tổng kg = 250 (100 + 150), tổng khối = 4 (1.5 + 2.5)
    await expect(singleRow).toContainText('Thùng linh kiện điện tử Samsung');
    await expect(singleRow).toContainText('25');
    await expect(singleRow).toContainText('/ 25');
    await expect(singleRow).toContainText('250');
    await expect(singleRow).toContainText('4');
    await expect(singleRow).toContainText('KCN VSIP 1, Thuận An, Bình Dương');
    await expect(singleRow).toContainText('LƯU KHO');

    // Khẳng định không có nút Xem dòng / Thu gọn hay badge N dòng
    await expect(page.locator('table tbody button', { hasText: /Xem dòng|Thu gọn/i })).toHaveCount(
      0
    );

    // Chụp hình Bước 5: Màn hình Đơn hàng kho gom 1 dòng duy nhất & cộng dồn tổng
    await page.screenshot({ path: STEP_05_PATH, fullPage: false });
    await page.screenshot({ path: VERIFIED_MAIN_PATH, fullPage: false });
    expect(fs.existsSync(STEP_05_PATH)).toBe(true);
    expect(fs.existsSync(VERIFIED_MAIN_PATH)).toBe(true);

    // Mở Modal Chi tiết vận đơn (nút con mắt) để chụp bằng chứng sổ cái 2 lần nhập
    const btnDetail = singleRow.locator('button[title="Xem chi tiết vận đơn"]').first();
    await expect(btnDetail).toBeVisible();
    await btnDetail.click();

    const modalDetail = page.locator('[role="dialog"]').first();
    await expect(modalDetail).toBeVisible({ timeout: 15000 });
    await expect(modalDetail).toContainText(TEST_ORDER_CODE);
    await expect(modalDetail).toContainText('25');

    // Chụp hình Bước 6: Modal Chi tiết vận đơn hiển thị tổng 25 kiện từ 2 chuyến xe
    await page.screenshot({ path: STEP_06_PATH, fullPage: false });
    expect(fs.existsSync(STEP_06_PATH)).toBe(true);
  });

  test('STEP 4: Màn hình Xuất kho (/dashboard/warehouse/outbound) tra cứu mã vận đơn ra 1 dòng duy nhất với tổng tồn 25 kiện, 250 kg, 4 m³', async ({
    page,
    request
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Kiểm tra API OUTBOUND_LOOKUP trước
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

    const lookupRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/orders?flow=OUTBOUND_LOOKUP&search=${encodeURIComponent(TEST_ORDER_CODE)}&limit=20`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      }
    );
    expect(lookupRes.ok()).toBeTruthy();
    const lookupJson = await lookupRes.json();
    const matchingRows = (lookupJson?.data ?? []).filter(
      (r: any) => r.orderCode === TEST_ORDER_CODE
    );
    // Phải chỉ có đúng 1 dòng duy nhất trong OUTBOUND_LOOKUP với tổng tồn = 25, kg = 250, khối = 4
    expect(matchingRows.length).toBe(1);
    expect(Number(matchingRows[0].hubStock ?? matchingRows[0].remainingQuantity)).toBe(25);
    expect(Number(matchingRows[0].totalQuantity)).toBe(25);
    expect(Number(matchingRows[0].totalWeight)).toBe(250);
    expect(Number(matchingRows[0].totalVolume)).toBe(4);

    // Mở giao diện Xuất kho và nhập mã TEST_ORDER_CODE
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`, {
      waitUntil: 'domcontentloaded'
    });

    const header = page.locator('h1', { hasText: 'Xuất kho' });
    await expect(header.first()).toBeVisible({ timeout: 25000 });

    // Chờ bảng danh sách chuyến xuất kho hydrate xong
    const outboundActionBtn = page
      .locator('table tbody button', { hasText: /Tiếp tục|In phiếu xuất/i })
      .first();
    await expect(outboundActionBtn).toBeVisible({ timeout: 25000 });

    // Bấm nút "+ Xuất kho" trên Header
    const btnCreateOutbound = page.locator('main button', { hasText: /^\s*Xuất kho\s*$/i }).first();
    await expect(btnCreateOutbound).toBeVisible({ timeout: 15000 });
    await btnCreateOutbound.click();

    await expect(page.getByRole('button', { name: /Quay lại danh sách/i }).first()).toBeVisible({
      timeout: 15000
    });

    // Nhập mã vận đơn TEST_ORDER_CODE vào dòng 1 của bảng kê Xuất kho và nhấn Enter
    const outRow0 = page.locator('table tbody tr').first();
    const outRow0Inputs = outRow0.locator('input');
    await outRow0Inputs.nth(0).fill(TEST_ORDER_CODE);
    await outRow0Inputs.nth(0).press('Enter');

    // Khẳng định dòng xuất kho tự động nạp tổng 25 kiện, 250 kg, 4 m³ và hiển thị "Tồn: 25"
    await expect(outRow0Inputs.nth(1)).toHaveValue('Thùng linh kiện điện tử Samsung', {
      timeout: 15000
    });
    await expect(outRow0Inputs.nth(2)).toHaveValue('25');
    await expect(outRow0Inputs.nth(3)).toHaveValue('250');
    await expect(outRow0Inputs.nth(4)).toHaveValue('4');
    await expect(outRow0).toContainText('Tồn: 25');

    // Chụp hình Bước 7: Bảng kê Xuất kho nạp 1 dòng duy nhất với tổng tồn 25 kiện
    await page.screenshot({ path: STEP_07_PATH, fullPage: false });
    expect(fs.existsSync(STEP_07_PATH)).toBe(true);
  });
});
