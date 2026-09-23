import { test, expect } from '@playwright/test';
import { loginAs, clearSession } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.resolve(__dirname, '../playwright-report/evidence');
const ARTIFACT_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/f8c46d05-4cbd-4861-9a69-65b90b6d5c21';

const WAREHOUSE_USER = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

test.describe('Phân Hệ Nhập Kho - Cải Tiến Tem Nhận Diện A4 & Cột Tỉnh/TP E2E Test Suite', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Kiểm thử giao diện Tem A4 & Cột Tỉnh/TP khi tạo đơn nhập kho thành công', async ({ page }) => {
    // ── 1. Đăng nhập với quyền Quản lý Kho ───────────────────────────────────
    await loginAs(page, WAREHOUSE_USER);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    // Chờ tiêu đề trang xuất hiện
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 15_000 });

    // ── 2. Chuyển sang Mode 1 (Tạo đơn nhập mới từ khách hàng) ────────────────
    const newOrderBtn = page.getByRole('button', { name: /Tạo đơn nhập mới/ });
    await expect(newOrderBtn).toBeVisible();
    await newOrderBtn.click();

    // Xác nhận tiêu đề và form tạo đơn nhập kho xuất hiện
    await expect(page.locator('text=1. Ngày tiếp nhận')).toBeVisible();
    await expect(page.locator('text=2. Biển số xe')).toBeVisible();

    // ── 3. Kiểm tra sự hiện diện của Cột TỈNH / TP ngay sau ĐỊA CHỈ GIAO HÀNG ──
    const addressHeader = page.locator('th:has-text("ĐỊA CHỈ GIAO HÀNG")');
    await expect(addressHeader).toBeVisible();

    const provinceHeader = page.locator('th:has-text("TỈNH / TP")');
    await expect(provinceHeader).toBeVisible();

    // ── 4. Nhập dữ liệu tiếp nhận & thông tin đơn hàng ─────────────────────────
    const licensePlateInput = page.locator('input[placeholder*="29C-123.45"]');
    await licensePlateInput.fill('51D-999.88');

    // Nhập Tên hàng
    const goodsInput = page.locator('input[placeholder="Tên loại hàng..."]').first();
    await goodsInput.fill('Thùng carton linh kiện máy móc E2E');

    // Nhập Số kiện
    const qtyInput = page.locator('table tbody tr:first-child td:nth-child(5) input').first();
    await qtyInput.fill('25');

    // Nhập Địa chỉ giao hàng
    const deliveryAddressInput = page.locator('textarea[placeholder*="địa chỉ giao"]').first();
    await deliveryAddressInput.fill('Số 45 Đường Lê Lợi, Phường Bến Nghé, Quận 1');

    // Nhập Cột Tỉnh/TP (Nhập tay tự do)
    const provinceInput = page.locator('input[placeholder="VD: Hà Nội, TP.HCM..."]').first();
    await expect(provinceInput).toBeVisible();
    await provinceInput.fill('TP. Hồ Chí Minh');

    // Chụp ảnh bằng chứng Form Nhập Kho có Cột Tỉnh/TP
    const formScreenshot = path.join(ARTIFACT_DIR, '01_INBOUND_CREATE_WITH_PROVINCE_COLUMN.png');
    await page.screenshot({ path: formScreenshot });
    console.log('Saved screenshot 1:', formScreenshot);

    // ── 5. Kiểm thử Modal Xem Trước Tem Nhận Diện Hàng Hóa A4 ─────────────────
    const previewBtn = page.getByRole('button', { name: 'Xem trước' });
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    // Xác nhận Modal In Tem A4 mở ra
    await expect(page.locator('text=Xem & In Tem Nhận Diện Hàng Hóa A4')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#pallet-label-print-area')).toBeVisible();

    // Kiểm tra cấu trúc layout đã được làm gọn & mở rộng
    // Ô Mã đơn hàng phải gọn gàng, ô Số lượng phải cao thoáng
    await expect(page.locator('#pallet-label-print-area td:has-text("MÃ ĐƠN HÀNG :")')).toBeVisible();
    await expect(page.locator('#pallet-label-print-area td:has-text("SỐ LƯỢNG :")')).toBeVisible();

    // Chụp ảnh bằng chứng Layout Tem In Nhận Diện Hàng Hóa A4
    const labelScreenshot = path.join(ARTIFACT_DIR, '02_PALLET_LABEL_A4_COMPACT_ORDER_EXPANDED_QTY.png');
    await page.screenshot({ path: labelScreenshot });
    console.log('Saved screenshot 2:', labelScreenshot);

    // Đóng Modal Tem In
    const closeLabelBtn = page.getByRole('button', { name: 'Đóng' });
    await closeLabelBtn.click();

    // ── 6. Xác nhận tiếp nhận & Lưu kho vào Database Thật ──────────────────────
    const submitBtn = page.getByRole('button', { name: /Xác nhận tiếp nhận & Lưu kho/ });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Chờ hoàn tất và quay lại bảng Inbound Board
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);

    // ── 7. Kiểm tra đơn hàng mới trong Bảng & Mở Modal Chi Tiết Vận Đơn ────────
    // Tìm dòng hàng vừa tạo theo tên hàng
    const createdRow = page.locator('tbody tr:has-text("Thùng carton linh kiện máy móc E2E")').first();
    await expect(createdRow).toBeVisible({ timeout: 10_000 });

    // Bấm xem chi tiết mã vận đơn
    const detailBtn = createdRow.locator('button[title*="Xem chi tiết"], button:has-text("Chi tiết")').first();
    await detailBtn.click();

    // Kiểm tra Modal Chi Tiết Mã Vận Đơn
    await expect(page.locator('text=Tiến trình vận chuyển & Tồn kho')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Danh mục hàng hóa vận đơn')).toBeVisible();

    // Kiểm tra cột TỈNH / TP trong modal chi tiết hiển thị đúng 'TP. Hồ Chí Minh'
    await expect(page.locator('th:has-text("TỈNH / TP")')).toBeVisible();
    await expect(page.locator('table:has-text("TP. Hồ Chí Minh")')).toBeVisible();

    // Chụp ảnh bằng chứng Modal Chi Tiết lưu trữ Tỉnh/TP thành công
    const detailScreenshot = path.join(ARTIFACT_DIR, '03_WAYBILL_DETAIL_WITH_PROVINCE_BADGE.png');
    await page.screenshot({ path: detailScreenshot });
    console.log('Saved screenshot 3:', detailScreenshot);
  });
});
