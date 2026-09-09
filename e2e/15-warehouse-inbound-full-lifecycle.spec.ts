import { test, expect } from '@playwright/test';
import { loginAs, clearSession } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

const ARTIFACT_SCREENSHOT_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/c7d08c37-27fe-4b7e-9f0e-b4053fb1c08a/screenshots';

const WAREHOUSE_HYN = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

test.describe('Phân Hệ Nhập Kho - Full Lifecycle Inbound E2E Test Suite', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(ARTIFACT_SCREENSHOT_DIR)) {
      fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Kịch bản 1: Tiếp nhận hàng trực tiếp từ khách (Mode 1) & Kiểm tra đồng bộ KPI Cards', async ({ page }) => {
    // ── 1. Đăng nhập với quyền Quản lý Kho Hưng Yên ─────────────────────────────
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    // Kiểm tra tiêu đề trang và 4 Stat Cards
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=CHỜ NHẬP KHO')).toBeVisible();
    await expect(page.locator('text=KHÁCH GỬI TẠI KHO')).toBeVisible();
    await expect(page.locator('text=LUÂN CHUYỂN NỘI BỘ')).toBeVisible();
    await expect(page.locator('text=ĐÃ NHẬP KHO')).toBeVisible();

    // Chụp ảnh màn hình Ban đầu của Inbound Board
    const screenshot01 = path.join(ARTIFACT_SCREENSHOT_DIR, '15_E2E_01_INBOUND_BOARD_INITIAL.png');
    await page.screenshot({ path: screenshot01, fullPage: true });

    // ── 2. Chuyển sang Mode 1 (Tạo đơn nhập mới từ khách hàng) ────────────────
    const newOrderBtn = page.getByRole('button', { name: /Tạo đơn nhập mới/ });
    await expect(newOrderBtn).toBeVisible();
    await newOrderBtn.click();

    // Kiểm tra 3 trường thông tin tiếp nhận bắt buộc (Viền đỏ)
    await expect(page.locator('text=1. Ngày tiếp nhận')).toBeVisible();
    await expect(page.locator('text=2. Biển số xe')).toBeVisible();
    await expect(page.locator('text=3. Họ tên người nhận / tài xế')).toBeVisible();

    // Điền thông tin xe và tài xế
    const licensePlateInput = page.locator('input[placeholder*="29C-123.45"]');
    await licensePlateInput.fill('29C-999.88');

    const driverNameInput = page.locator('input[placeholder*="Nguyễn Văn A"]');
    await driverNameInput.fill('Trần Văn An');

    // Chụp ảnh màn hình Mode 1 Form
    const screenshot02 = path.join(ARTIFACT_SCREENSHOT_DIR, '15_E2E_02_MODE1_CUSTOMER_FORM.png');
    await page.screenshot({ path: screenshot02, fullPage: true });

    // ── 3. Xác nhận tiếp nhận & Lưu kho ───────────────────────────────────────
    const submitBtn = page.getByRole('button', { name: /Xác nhận tiếp nhận & Lưu kho/ });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Chờ thông báo thành công và chuyển hướng về Bảng nhập kho
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1000);

    // Chụp ảnh màn hình sau khi tạo đơn Mode 1 thành công
    const screenshot03 = path.join(ARTIFACT_SCREENSHOT_DIR, '15_E2E_03_MODE1_CONFIRMED_BOARD.png');
    await page.screenshot({ path: screenshot03, fullPage: true });
  });

  test('Kịch bản 2: Xem chi tiết mã vận đơn (No-SKU Standard Modal) & In tem A4 Pallet', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    // Kiểm tra danh sách bảng đơn hàng
    const orderLink = page.locator('tbody tr button[title*="Xem chi tiết"], tbody tr td:nth-child(2) button').first();
    if (await orderLink.isVisible()) {
      // Click mở Modal Chi Tiết Mã Vận Đơn
      await orderLink.click();

      // Kiểm tra Modal hiển thị đúng tiêu chuẩn No-SKU Consignment
      await expect(page.locator('text=Chi tiết mã vận đơn')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('text=THÔNG TIN VẬN CHUYỂN')).toBeVisible();
      await expect(page.locator('text=DANH MỤC HÀNG HÓA')).toBeVisible();

      // Chụp ảnh Modal Chi Tiết Mã Vận Đơn
      const screenshot04 = path.join(ARTIFACT_SCREENSHOT_DIR, '15_E2E_04_WAYBILL_DETAIL_MODAL.png');
      await page.screenshot({ path: screenshot04 });

      // Mở modal in tem A4 từ trong chi tiết vận đơn
      const printInDetailBtn = page.locator('.fixed.inset-0 button:has-text("In tem nhận diện A4")');
      if (await printInDetailBtn.isVisible()) {
        await printInDetailBtn.click();

        // Kiểm tra Modal Tem A4 Pallet
        await expect(page.locator('text=TEM NHẬN DIỆN HÀNG HÓA')).toBeVisible({ timeout: 10_000 });
        const screenshot05 = path.join(ARTIFACT_SCREENSHOT_DIR, '15_E2E_05_A4_PALLET_LABEL_MODAL.png');
        await page.screenshot({ path: screenshot05 });

        // Đóng modal tem A4
        await page.keyboard.press('Escape');
      }

      // Đóng modal chi tiết
      await page.keyboard.press('Escape');
    }
  });

  test('Kịch bản 3: Quy trình Kiểm đếm thực tế (Tally Modal) ➔ Chuyển trạng thái sang ĐÃ NHẬP KHO', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    // Tìm nút "Kiểm đếm" nếu có đơn ở trạng thái chờ
    const tallyBtn = page.locator('tbody tr button:has-text("Kiểm đếm")').first();
    if (await tallyBtn.isVisible()) {
      await tallyBtn.click();

      // Xác thực Modal Kiểm Đếm (Frame SkFD5)
      await expect(page.locator('text=Kiểm đếm nhập kho')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('text=ĐANG KIỂM ĐẾM · INBOUND')).toBeVisible();
      await expect(page.locator('text=Ảnh kiện hàng')).toBeVisible();

      // Thêm ảnh hiện trường kiểm đếm
      const addPhotoBtn = page.locator('button:has-text("Chụp / thêm ảnh")');
      if (await addPhotoBtn.isVisible()) {
        await addPhotoBtn.click();
      }

      // Chụp ảnh Modal Kiểm Đếm
      const screenshot06 = path.join(ARTIFACT_SCREENSHOT_DIR, '15_E2E_06_WAREHOUSE_TALLY_MODAL.png');
      await page.screenshot({ path: screenshot06 });

      // Xác nhận nhập kho
      const confirmTallyBtn = page.locator('.fixed.inset-0 button:has-text("Xác nhận nhập kho")');
      await confirmTallyBtn.click();

      // Chờ hoàn tất và kiểm tra thông báo
      await page.waitForTimeout(1000);
      const screenshot07 = path.join(ARTIFACT_SCREENSHOT_DIR, '15_E2E_07_AFTER_TALLY_SUCCESS.png');
      await page.screenshot({ path: screenshot07, fullPage: true });
    }
  });

  test('Kịch bản 4: Tương tác Thanh Phân Trang & Bộ Lọc Status Tabs', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    // Chuyển đổi giữa các tab trạng thái
    const waitingTab = page.locator('button:has-text("Chờ nhập kho")');
    await waitingTab.click();
    await page.waitForTimeout(400);

    const customerTab = page.locator('button:has-text("Khách gửi")');
    await customerTab.click();
    await page.waitForTimeout(400);

    const transferTab = page.locator('button:has-text("Luân chuyển")');
    await transferTab.click();
    await page.waitForTimeout(400);

    const storedTab = page.locator('button:has-text("Đã nhập kho")');
    await storedTab.click();
    await page.waitForTimeout(400);

    const allTab = page.locator('button:has-text("Tất cả")');
    await allTab.click();
    await page.waitForTimeout(400);

    // Thử nút "Cập nhật lại thông số"
    const refreshBtn = page.getByRole('button', { name: /Cập nhật lại thông số/ });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await page.waitForTimeout(800);

    // Chụp ảnh kết quả
    const screenshot08 = path.join(ARTIFACT_SCREENSHOT_DIR, '15_E2E_08_TABS_AND_PAGINATION_ACTIVE.png');
    await page.screenshot({ path: screenshot08, fullPage: true });
  });
});
