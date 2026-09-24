import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/f8c46d05-4cbd-4861-9a69-65b90b6d5c21';

// Test against the Vercel dev branch deployment
const TARGET_BASE_URL =
  process.env.TARGET_URL ||
  'https://logistics-website-frontend-git-dev-thai-lys-projects.vercel.app';

const USER = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
};

test.describe('Đồng Bộ Nút In Phiếu Nhập & In Phiếu Xuất (Vercel Dev)', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Kiểm tra và chụp hình các nút "In phiếu nhập" và "In phiếu xuất" trên môi trường Vercel Dev', async ({ page }) => {
    // ── 1. Đăng nhập ──────────────────────────────────────────────────────────
    console.log(`Navigating to ${TARGET_BASE_URL}/auth/sign-in...`);
    await page.goto(`${TARGET_BASE_URL}/auth/sign-in`);
    await page.locator('input[name="email"]').waitFor({ state: 'visible', timeout: 20_000 });

    await page.fill('input[name="email"]', USER.email);
    await page.fill('input[name="password"]', USER.password);
    await page.click('button[type="submit"]');

    // Chờ điều hướng vào dashboard
    await page.waitForURL(/\/dashboard\/.*/, { timeout: 25_000 });
    console.log('Logged in successfully!');

    // ── 2. Điều hướng đến trang Nhập Kho ─────────────────────────────────────
    console.log(`Navigating to ${TARGET_BASE_URL}/dashboard/warehouse/inbound...`);
    await page.goto(`${TARGET_BASE_URL}/dashboard/warehouse/inbound`);

    // Chờ tiêu đề xuất hiện
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(3000);

    // Xác nhận có nút "In phiếu nhập" trong bảng danh sách đơn hàng
    const inboundPrintBtn = page.locator('button:has-text("In phiếu nhập")').first();
    await expect(inboundPrintBtn).toBeVisible({ timeout: 15_000 });

    // Chụp hình Bằng chứng 1: Bảng Nhập kho với nút "In phiếu nhập"
    const screenshot1 = path.join(ARTIFACT_DIR, '01_INBOUND_TABLE_IN_PHIEU_NHAP.png');
    await page.screenshot({ path: screenshot1 });
    console.log('Saved screenshot 1:', screenshot1);

    // ── 3. Bấm nút "In phiếu nhập" để mở Modal Phiếu Nhập Kho ────────────────
    await inboundPrintBtn.click();

    // Chờ Modal Phiếu Nhập Kho xuất hiện
    const inboundDialog = page.locator('div[role="dialog"]').first();
    await expect(inboundDialog).toBeVisible({ timeout: 10_000 });
    await expect(inboundDialog.locator('text=Phiếu Nhập Kho').first()).toBeVisible();

    // Kiểm tra nút footer trong modal: phải ghi chính xác "In phiếu nhập"
    const modalInboundPrintBtn = inboundDialog.locator('button:has-text("In phiếu nhập")');
    await expect(modalInboundPrintBtn).toBeVisible({ timeout: 10_000 });

    // Chụp hình Bằng chứng 2: Modal Phiếu Nhập Kho với nút "In phiếu nhập"
    const screenshot2 = path.join(ARTIFACT_DIR, '02_INBOUND_RECEIPT_MODAL_IN_PHIEU_NHAP.png');
    await page.screenshot({ path: screenshot2 });
    console.log('Saved screenshot 2:', screenshot2);

    // Đóng Modal Phiếu Nhập Kho
    const closeModalBtn = inboundDialog.locator('button:has-text("Đóng")');
    await closeModalBtn.click();
    await page.waitForTimeout(1000);

    // ── 4. Điều hướng đến trang Xuất Kho ─────────────────────────────────────
    console.log(`Navigating to ${TARGET_BASE_URL}/dashboard/warehouse/outbound...`);
    await page.goto(`${TARGET_BASE_URL}/dashboard/warehouse/outbound`);

    // Chờ tiêu đề xuất kho xuất hiện
    await expect(page.getByRole('heading', { name: /Xuất kho/ })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(3000);

    // Kiểm tra nút "In phiếu xuất" trên bảng Outbound Board (nếu có đơn)
    const outboundPrintBtn = page.locator('button:has-text("In phiếu xuất")').first();
    const hasOutboundBtn = await outboundPrintBtn.isVisible().catch(() => false);

    if (hasOutboundBtn) {
      // Chụp hình Bằng chứng 3: Bảng Xuất kho với nút "In phiếu xuất"
      const screenshot3 = path.join(ARTIFACT_DIR, '03_OUTBOUND_TABLE_IN_PHIEU_XUAT.png');
      await page.screenshot({ path: screenshot3 });
      console.log('Saved screenshot 3:', screenshot3);

      // Bấm mở modal Phiếu Xuất Kho
      await outboundPrintBtn.click();
      const outboundDialog = page.locator('div[role="dialog"]').first();
      await expect(outboundDialog).toBeVisible({ timeout: 10_000 });

      // Kiểm tra nút footer trong modal: phải ghi chính xác "In phiếu xuất"
      const modalOutboundPrintBtn = outboundDialog.locator('button:has-text("In phiếu xuất")');
      await expect(modalOutboundPrintBtn).toBeVisible({ timeout: 10_000 });

      // Chụp hình Bằng chứng 4: Modal Phiếu Xuất Kho với nút "In phiếu xuất"
      const screenshot4 = path.join(ARTIFACT_DIR, '04_OUTBOUND_RECEIPT_MODAL_IN_PHIEU_XUAT.png');
      await page.screenshot({ path: screenshot4 });
      console.log('Saved screenshot 4:', screenshot4);

      // Đóng modal
      await outboundDialog.locator('button:has-text("Đóng")').click();
    } else {
      console.log('No existing outbound orders with print button. Creating a quick customer outbound order...');
      // Chuyển sang Mode 1 Xuất cho khách hàng để tạo đơn và mở modal
      const newOutboundBtn = page.getByRole('button', { name: /Xuất cho khách hàng/ });
      await newOutboundBtn.click();
      await page.waitForTimeout(1000);

      // Điền thông tin xe và địa chỉ
      await page.locator('input[placeholder*="29C-123.45"]').fill('29C-888.99');
      await page.locator('input[placeholder="Tên khách nhận..."]').fill('Khách Hàng Vercel Test');
      await page.locator('input[placeholder="Số điện thoại..."]').fill('0912345678');
      await page.locator('input[placeholder="Địa chỉ giao hàng..."]').fill('Hà Nội');

      // Điền hàng hóa
      await page.locator('input[placeholder="Tên loại hàng..."]').first().fill('Hàng mẫu kiểm tra in phiếu xuất');
      await page.locator('table tbody tr:first-child td:nth-child(5) input').first().fill('10');

      // Xác nhận xuất kho
      const confirmExportBtn = page.getByRole('button', { name: /Xác nhận xuất kho/ });
      await confirmExportBtn.click();

      // Chờ modal xuất kho tự động mở
      const outboundDialog = page.locator('div[role="dialog"]').first();
      await expect(outboundDialog).toBeVisible({ timeout: 20_000 });

      // Xác nhận nút "In phiếu xuất" trong modal
      const modalOutboundPrintBtn = outboundDialog.locator('button:has-text("In phiếu xuất")');
      await expect(modalOutboundPrintBtn).toBeVisible({ timeout: 10_000 });

      // Chụp hình Bằng chứng 4: Modal Phiếu Xuất Kho với nút "In phiếu xuất"
      const screenshot4 = path.join(ARTIFACT_DIR, '04_OUTBOUND_RECEIPT_MODAL_IN_PHIEU_XUAT.png');
      await page.screenshot({ path: screenshot4 });
      console.log('Saved screenshot 4:', screenshot4);

      // Đóng modal
      await outboundDialog.locator('button:has-text("Đóng")').click();

      // Sau khi quay lại board, chụp lại Bảng Xuất Kho với nút "In phiếu xuất"
      await page.waitForTimeout(2000);
      const rowPrintBtn = page.locator('button:has-text("In phiếu xuất")').first();
      await expect(rowPrintBtn).toBeVisible({ timeout: 15_000 });

      const screenshot3 = path.join(ARTIFACT_DIR, '03_OUTBOUND_TABLE_IN_PHIEU_XUAT.png');
      await page.screenshot({ path: screenshot3 });
      console.log('Saved screenshot 3:', screenshot3);
    }
  });
});
