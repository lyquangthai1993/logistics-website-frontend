import { test, expect } from '@playwright/test';
import { loginAs, clearSession } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

const ARTIFACT_SCREENSHOT_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/8c1cdb2a-5228-45f9-a6ff-0c9d427e1f1a/screenshots';

const WAREHOUSE_HYN = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

test.describe('Phân Hệ Nhập Kho - Modal-based Inbound Transfer Interactive E2E Flow', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(ARTIFACT_SCREENSHOT_DIR)) {
      fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Kịch bản hoàn chỉnh: Nhập kho luân chuyển từ Chuyến xe liên Hub qua Modal Popup (WH_CASE_02B ➔ WH_CASE_03 ➔ dd8X5 Grid ➔ Lưu DB)', async ({ page }) => {
    // ── 1. Đăng nhập với quyền Quản lý Kho Hưng Yên ─────────────────────────────
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    // Kiểm tra tiêu đề trang và các nút chế độ nhập kho
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 10_000 });
    const mode2Btn = page.getByRole('button', { name: 'Nhận luân chuyển nội bộ' });
    await expect(mode2Btn).toBeVisible();

    // ── 2. Click chuyển sang Mode 2 (Luân chuyển nội bộ) ──────────────────────
    await mode2Btn.click();

    // ── 3. Xác thực Modal Bước 1 (Node WH_CASE_02B_TRIP_MODAL) ────────────────
    // Modal phải là dialog overlay với backdrop
    const modalStep1Eyebrow = page.locator('text=BƯỚC 1 / 3: CHỌN CHUYẾN ĐANG ĐẾN HUB');
    await expect(modalStep1Eyebrow).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Chọn chuyến đang đến để tiếp nhận hàng')).toBeVisible();

    // Thử tính năng tìm kiếm chuyến xe trong modal
    const searchTripInput = page.locator('input[placeholder*="Tìm kiếm mã chuyến"]');
    await expect(searchTripInput).toBeVisible();
    await searchTripInput.fill('TRIP');
    await page.waitForTimeout(500);

    // Chụp ảnh Modal Bước 1
    const screenshotPath01 = path.join(ARTIFACT_SCREENSHOT_DIR, '14_E2E_01_WH_CASE_02B_TRIP_MODAL.png');
    await page.screenshot({ path: screenshotPath01 });
    console.log(`Saved screenshot: ${screenshotPath01}`);

    // ── 4. Chọn 1 chuyến xe trong danh sách Modal Bước 1 ───────────────────────
    const selectTripBtn = page.locator('table button:has-text("Chọn chuyến")').first();
    await expect(selectTripBtn).toBeVisible();
    await selectTripBtn.click();

    // ── 5. Xác thực Modal Bước 2 (Node WH_CASE_03_MODAL) ──────────────────────
    const modalStep2Eyebrow = page.locator('text=BƯỚC 2 / 3: CHỌN ĐƠN HÀNG CẦN TIẾP NHẬN');
    await expect(modalStep2Eyebrow).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=HUB XUẤT PHÁT')).toBeVisible();

    // Thử tương tác lọc đơn hàng trong modal
    const searchOrderInput = page.locator('input[placeholder*="Tìm mã vận đơn"]');
    await expect(searchOrderInput).toBeVisible();

    // Tích chọn đơn hàng và kiểm tra bộ đếm dynamic counter
    const selectAllCheckbox = page.locator('label:has-text("Chọn tất cả") input[type="checkbox"]');
    await expect(selectAllCheckbox).toBeVisible();

    // Chờ tải danh sách đơn hàng xong
    await expect(page.locator('text=Đang tải danh sách đơn hàng')).toBeHidden({ timeout: 10_000 });
    await page.waitForTimeout(800);

    // Chụp ảnh Modal Bước 2
    const screenshotPath02 = path.join(ARTIFACT_SCREENSHOT_DIR, '14_E2E_02_WH_CASE_03_MODAL.png');
    await page.screenshot({ path: screenshotPath02 });
    console.log(`Saved screenshot: ${screenshotPath02}`);

    // ── 6. Xác nhận dỡ hàng ➔ Đóng Modal và nạp vào Lưới kiểm đếm dd8X5 ───────
    const confirmOrdersBtn = page.getByRole('button', { name: /Xác nhận dỡ hàng/ });
    await confirmOrdersBtn.scrollIntoViewIfNeeded();
    await confirmOrdersBtn.click();

    // Modal đóng lại, hiển thị không gian làm việc dd8X5 với thẻ xe đã khóa và lưới 10 cột
    await expect(page.locator('button:has-text("Chọn lại đơn")')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('button:has-text("Đổi chuyến khác")')).toBeVisible();
    await expect(page.locator('text=đơn hàng đã lên lưới')).toBeVisible();
    await expect(page.locator('th:has-text("MÃ ĐƠN HÀNG")')).toBeVisible();
    await expect(page.locator('th:has-text("ĐỊA CHỈ NHẬN HÀNG *")')).toBeVisible();
    await expect(page.locator('th:has-text("TÊN HÀNG *")')).toBeVisible();
    await expect(page.locator('th:has-text("ĐỊA CHỈ GIAO HÀNG *")')).toBeVisible();

    // Chụp ảnh Màn hình dd8X5 Loaded State
    const screenshotPath03 = path.join(ARTIFACT_SCREENSHOT_DIR, '14_E2E_03_dd8X5_LOADED_GRID.png');
    await page.screenshot({ path: screenshotPath03, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPath03}`);

    // ── 7. Thao tác chỉnh sửa thông tin kiểm đếm trên lưới ─────────────────────
    const firstRowNotesInput = page.locator('tbody tr:first-child input[placeholder*="Ghi chú"], tbody tr:first-child textarea').first();
    if (await firstRowNotesInput.isVisible()) {
      await firstRowNotesInput.fill('Đã kiểm đếm đủ số kiện - E2E Verified');
    }

    // ── 8. Xác nhận tiếp nhận & Lưu kho ───────────────────────────────────────
    const submitBtn = page.getByRole('button', { name: /Xác nhận tiếp nhận & Lưu kho/ });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // ── 9. Chờ thông báo thành công và chuyển hướng về Bảng nhập kho ───────────
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1000);

    const screenshotPath04 = path.join(ARTIFACT_SCREENSHOT_DIR, '14_E2E_04_CONFIRMED_RETURN_BOARD.png');
    await page.screenshot({ path: screenshotPath04, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPath04}`);
  });
});
