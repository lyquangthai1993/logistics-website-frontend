import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_19_10_inbound_receipt_fix');
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_01_verified.png');

test.describe.serial('Feedback 19/10 — Bảo toàn đơn hàng trên Phiếu Nhập Kho và Bỏ nút In phiếu xe', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Static Code Audit — Kiểm tra logic bảo toàn phiếu nhập và loại bỏ nút In phiếu xe', () => {
    // 1. Audit frontend modal: warehouse-trip-detail-modal.tsx
    const modalPath = path.resolve(
      __dirname,
      '../src/features/warehouse/components/warehouse-trip-detail-modal.tsx'
    );
    expect(fs.existsSync(modalPath)).toBeTruthy();
    const modalContent = fs.readFileSync(modalPath, 'utf-8');

    // Nút in phiếu xe tại Footer BẮT BUỘC ĐÃ BỊ LOẠI BỎ HOÀN TOÀN
    expect(modalContent).not.toContain('In phiếu xe');

    // 2. Audit frontend page: inbound/page.tsx
    const inboundPagePath = path.resolve(
      __dirname,
      '../src/app/dashboard/warehouse/inbound/page.tsx'
    );
    expect(fs.existsSync(inboundPagePath)).toBeTruthy();
    const inboundContent = fs.readFileSync(inboundPagePath, 'utf-8');

    // Phải có điều kiện bảo toàn toàn bộ đơn khi chuyến xe COMPLETED
    expect(inboundContent).toContain("if (grp.status === 'COMPLETED') return true;");

    // Phải có hàm getOrderTripInboundQty để đọc số lượng thực nhận từ transaction INBOUND
    expect(inboundContent).toContain('getOrderTripInboundQty');

    // 3. Audit backend service: warehouse.service.ts
    const backendServicePath = path.resolve(
      __dirname,
      '../../backend/src/orders/warehouse.service.ts'
    );
    expect(fs.existsSync(backendServicePath)).toBeTruthy();
    const serviceContent = fs.readFileSync(backendServicePath, 'utf-8');

    // getInboundTrips phải join inventoryTransactions
    expect(serviceContent).toContain(".leftJoinAndSelect('order.inventoryTransactions', 'inventoryTransactions')");
  });

  test('CASE-02: Live Cloud Dev — Mở Phiếu Nhập Kho chuyến SD62 và xác nhận đủ 6 đơn & 232 kiện', async ({
    page
  }) => {
    test.setTimeout(90000);

    // 1. Đăng nhập bằng tài khoản Quản lý Kho HCM
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    // 2. Điều hướng tới Bảng Quản lý Nhập Kho
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Chờ bảng tải dữ liệu
    await page.waitForSelector('table', { timeout: 20000 });

    // 3. Tìm dòng chuyến xe SD62 qua ô tìm kiếm
    const searchInput = page.locator('input[placeholder*="Tìm mã chuyến"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.click();
    await searchInput.fill('sd62');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000); // Chờ debounce 300ms và API trả kết quả

    const tripRow = page.locator('tr').filter({ hasText: 'SD62' }).first();
    await expect(tripRow).toBeVisible({ timeout: 15000 });

    // 4. Click nút "In phiếu nhập" trên dòng SD62
    const printReceiptBtn = tripRow.locator('button').filter({ hasText: 'In phiếu nhập' });
    await expect(printReceiptBtn).toBeVisible({ timeout: 5000 });
    await printReceiptBtn.click();

    // 5. Chờ Modal Phiếu Nhập Kho xuất hiện
    const receiptModal = page.locator('[role="dialog"]').filter({ hasText: 'Phiếu Nhập Kho' });
    await expect(receiptModal).toBeVisible({ timeout: 10000 });

    // Chờ bảng dữ liệu bên trong modal render
    const receiptTable = receiptModal.locator('table');
    await expect(receiptTable).toBeVisible({ timeout: 10000 });

    // 6. Xác nhận Modal có đúng 6 dòng đơn hàng (thay vì 2 dòng bị thiếu)
    // Các mã đơn cần có: NQT2610-070, NQT2610-071, NMC2610-077, NQT2610-076, NQT2610-078, PML2610-219
    const dataRows = receiptTable.locator('tbody tr:not(:has-text("Tổng cộng"))');
    const rowCount = await dataRows.count();
    console.log(`[E2E] Số dòng đơn hàng thực tế trong Phiếu Nhập Kho: ${rowCount}`);
    expect(rowCount).toBe(6);

    // 7. Xác nhận Tổng cộng đạt chuẩn 232 kiện
    const totalRow = receiptTable.locator('tr').filter({ hasText: 'Tổng cộng' });
    await expect(totalRow).toContainText('232');

    // 8. Xác nhận Ngày/tháng/năm hiển thị 19/10/2026 (đồng bộ chuẩn xác với cột NGÀY của chuyến xe)
    await expect(receiptModal).toContainText('19/10/2026');

    // 9. Chụp ảnh minh chứng nghiệm thu
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    console.log(`[E2E] Đã lưu ảnh nghiệm thu thành công tại: ${SCREENSHOT_PATH}`);
  });
});
