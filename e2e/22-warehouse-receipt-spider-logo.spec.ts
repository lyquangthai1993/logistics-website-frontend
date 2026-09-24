import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/16ad9eb0-4445-46f5-9e82-eb2afbb34420';

// Ensure artifact directory exists
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const TARGET_BASE_URL =
  process.env.TARGET_URL ||
  'https://logistics-website-frontend-git-dev-thai-lys-projects.vercel.app';

const USER = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
};

test.describe('Kiểm tra Phiếu Nhập & Xuất Kho với Logo Spider Express (Vercel Dev)', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Xác nhận Logo Spider Express và giao diện mới của Phiếu Nhập Kho & Phiếu Xuất Kho', async ({ page }) => {
    // ── 1. Đăng nhập ──────────────────────────────────────────────────────────
    console.log(`Navigating to ${TARGET_BASE_URL}/auth/sign-in...`);
    await page.goto(`${TARGET_BASE_URL}/auth/sign-in`);
    await page.locator('input[name="email"]').waitFor({ state: 'visible', timeout: 20_000 });

    await page.fill('input[name="email"]', USER.email);
    await page.fill('input[name="password"]', USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard\/.*/, { timeout: 25_000 });
    console.log('Logged in successfully!');

    // ── 2. Điều hướng đến trang Nhập Kho ─────────────────────────────────────
    console.log(`Navigating to ${TARGET_BASE_URL}/dashboard/warehouse/inbound...`);
    await page.goto(`${TARGET_BASE_URL}/dashboard/warehouse/inbound`);

    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(3000);

    // Tìm nút "In phiếu nhập"
    const inboundPrintBtn = page.locator('button:has-text("In phiếu nhập")').first();
    await expect(inboundPrintBtn).toBeVisible({ timeout: 15_000 });

    // ── 3. Bấm mở Modal Phiếu Nhập Kho ───────────────────────────────────────
    await inboundPrintBtn.click();

    const inboundDialog = page.locator('div[role="dialog"]').first();
    await expect(inboundDialog).toBeVisible({ timeout: 10_000 });
    await expect(inboundDialog.locator('text=Phiếu Nhập Kho').first()).toBeVisible();

    // Xác nhận có logo Spider Express
    const spiderLogo = inboundDialog.locator('img[alt="Spider Express"]').first();
    await expect(spiderLogo).toBeVisible({ timeout: 10_000 });

    // Xác nhận tiêu đề PHIẾU NHẬP KHO
    await expect(inboundDialog.locator('text=PHIẾU NHẬP KHO').first()).toBeVisible();

    // Xác nhận các cột chuẩn
    await expect(inboundDialog.locator('th:has-text("STT")').first()).toBeVisible();
    await expect(inboundDialog.locator('th:has-text("Mã Đơn Hàng")').first()).toBeVisible();
    await expect(inboundDialog.locator('th:has-text("Tên mặt hàng")').first()).toBeVisible();
    await expect(inboundDialog.locator('th:has-text("Số lượng")').first()).toBeVisible();
    await expect(inboundDialog.locator('th:has-text("Đơn vị")').first()).toBeVisible();
    await expect(inboundDialog.locator('th:has-text("Địa chỉ giao hàng")').first()).toBeVisible();
    await expect(inboundDialog.locator('th:has-text("Chứng từ đi kèm")').first()).toBeVisible();
    await expect(inboundDialog.locator('th:has-text("Ghi chú")').first()).toBeVisible();

    // Xác nhận 3 chữ ký
    await expect(inboundDialog.locator('text=Người Lập Phiếu').first()).toBeVisible();
    await expect(inboundDialog.locator('text=Lái Xe').first()).toBeVisible();
    await expect(inboundDialog.locator('text=Thủ Kho').first()).toBeVisible();

    // Chụp hình Bằng chứng 1: Modal Phiếu Nhập Kho với logo Spider Express
    const screenshot1 = path.join(ARTIFACT_DIR, '01_INBOUND_RECEIPT_SPIDER_LOGO.png');
    await page.screenshot({ path: screenshot1 });
    console.log('Saved screenshot 1:', screenshot1);

    // Đóng Modal Phiếu Nhập Kho
    await inboundDialog.locator('button:has-text("Đóng")').click();
    await page.waitForTimeout(1000);

    // ── 4. Điều hướng đến trang Xuất Kho ─────────────────────────────────────
    console.log(`Navigating to ${TARGET_BASE_URL}/dashboard/warehouse/outbound...`);
    await page.goto(`${TARGET_BASE_URL}/dashboard/warehouse/outbound`);

    await expect(page.getByRole('heading', { name: /Xuất kho/ })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(3000);

    const outboundPrintBtn = page.locator('button:has-text("In phiếu xuất")').first();
    const hasOutboundBtn = await outboundPrintBtn.isVisible().catch(() => false);

    if (hasOutboundBtn) {
      await outboundPrintBtn.click();
      const outboundDialog = page.locator('div[role="dialog"]').first();
      await expect(outboundDialog).toBeVisible({ timeout: 10_000 });

      // Xác nhận có logo Spider Express
      const spiderLogoOut = outboundDialog.locator('img[alt="Spider Express"]').first();
      await expect(spiderLogoOut).toBeVisible({ timeout: 10_000 });

      // Chụp hình Bằng chứng 2: Modal Phiếu Xuất Kho với logo Spider Express
      const screenshot2 = path.join(ARTIFACT_DIR, '02_OUTBOUND_RECEIPT_SPIDER_LOGO.png');
      await page.screenshot({ path: screenshot2 });
      console.log('Saved screenshot 2:', screenshot2);

      await outboundDialog.locator('button:has-text("Đóng")').click();
    } else {
      console.log('Creating quick customer outbound to test outbound receipt modal...');
      const newOutboundBtn = page.getByRole('button', { name: /Xuất cho khách hàng/ });
      await newOutboundBtn.click();
      await page.waitForTimeout(1000);

      await page.locator('input[placeholder*="29C-123.45"]').fill('29C-888.99');
      await page.locator('input[placeholder="Tên khách nhận..."]').fill('Khách Hàng Vercel Test');
      await page.locator('input[placeholder="Số điện thoại..."]').fill('0912345678');
      await page.locator('input[placeholder="Địa chỉ giao hàng..."]').fill('Hà Nội');

      await page.locator('input[placeholder="Tên loại hàng..."]').first().fill('Hàng kiểm tra in phiếu xuất Spider Express');
      await page.locator('table tbody tr:first-child td:nth-child(5) input').first().fill('10');

      const confirmExportBtn = page.getByRole('button', { name: /Xác nhận xuất kho/ });
      await confirmExportBtn.click();

      const outboundDialog = page.locator('div[role="dialog"]').first();
      await expect(outboundDialog).toBeVisible({ timeout: 20_000 });

      const spiderLogoOut = outboundDialog.locator('img[alt="Spider Express"]').first();
      await expect(spiderLogoOut).toBeVisible({ timeout: 10_000 });

      const screenshot2 = path.join(ARTIFACT_DIR, '02_OUTBOUND_RECEIPT_SPIDER_LOGO.png');
      await page.screenshot({ path: screenshot2 });
      console.log('Saved screenshot 2:', screenshot2);

      await outboundDialog.locator('button:has-text("Đóng")').click();
    }
  });
});
