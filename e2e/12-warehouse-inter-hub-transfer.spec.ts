import { test, expect } from '@playwright/test';
import { loginAs, clearSession } from './helpers/auth';

const WAREHOUSE_HYN = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

const WAREHOUSE_DAD = {
  email: 'lyquangthai1993+5@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

const WAREHOUSE_HCM = {
  email: 'lyquangthai1993+6@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

const SUPER_ADMIN = {
  email: 'lyquangthai1993+1@gmail.com',
  password: 'secret',
  role: 'SUPER_ADMIN' as const,
};

test.describe('Phân Hệ Quản Lý Kho (Warehouse Hub Operations) - Multi-Hub E2E', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('TC-WH-01: Thủ kho Hưng Yên (warehouse_hyn) - Nhập kho Mode 1, Bảng 10 cột & In Tem A4', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);

    // 1. Điều hướng đến trang Nhập kho
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    // 2. Kiểm tra Header hiển thị Hub hiện tại và mở Mode 1
    await expect(page.getByRole('heading', { name: /Nhập kho.*Polaris Hub - Hưng Yên/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Tạo đơn nhập mới' })).toBeVisible();
    await page.getByRole('button', { name: 'Tạo đơn nhập mới' }).click();

    // 2b. Kiểm tra 3 trường bắt buộc viền đỏ trong Mode 1 (Frame UVtv4)
    await expect(page.locator('text=1. Ngày tiếp nhận')).toBeVisible();
    await expect(page.locator('text=2. Biển số xe')).toBeVisible();
    await expect(page.locator('text=3. Họ tên người nhận / tài xế')).toBeVisible();

    // 3. Kiểm tra 10 Cột Bảng Vận Hành Chuẩn (Frame xTfjC)
    await expect(page.locator('th:has-text("STT")')).toBeVisible();
    await expect(page.locator('th:has-text("MÃ ĐƠN HÀNG")')).toBeVisible();
    await expect(page.locator('th:has-text("ĐỊA CHỈ NHẬN HÀNG")')).toBeVisible();
    await expect(page.locator('th:has-text("TÊN HÀNG")')).toBeVisible();
    await expect(page.locator('th:has-text("SỐ KIỆN")')).toBeVisible();
    await expect(page.locator('th:has-text("SỐ KG")')).toBeVisible();
    await expect(page.locator('th:has-text("SỐ M³")')).toBeVisible();
    await expect(page.locator('th:has-text("ĐỊA CHỈ GIAO HÀNG")')).toBeVisible();
    await expect(page.locator('th:has-text("GHI CHÚ")')).toBeVisible();
    await expect(page.locator('th:has-text("THAO TÁC")')).toBeVisible();

    // 4. Nhập số kiện hàng = 80 và mở Modal In Tem Nhận Diện A4
    const row1 = page.locator('tbody tr').first();
    const qtyInput1 = row1.locator('input[type="number"]').first();
    await qtyInput1.fill('80');

    const printBtn = row1.locator('button[title="In tem nhận diện A4"]');
    await printBtn.click();

    await expect(page.getByRole('heading', { name: 'TEM NHẬN DIỆN HÀNG HÓA', exact: true })).toBeVisible();
    await expect(page.locator('text=KHO :')).toBeVisible();
    await expect(page.locator('text=TÊN HÀNG:')).toBeVisible();
    await expect(page.locator('text=MÃ ĐƠN HÀNG :')).toBeVisible();
    await expect(page.locator('text=PALET SỐ :')).toBeVisible();
    await expect(page.locator('text=TỔNG SỐ PALET :')).toBeVisible();
    await expect(page.locator('text=SỐ LƯỢNG :')).toBeVisible();
    await expect(page.locator('text=... / 80')).toBeVisible();

    // Đóng modal in tem
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 5. Bấm nút Thêm dòng mới
    await page.locator('button:has-text("Thêm 1 dòng đơn mới")').click();

    // 6. Xác nhận tiếp nhận & lưu kho
    const submitBtn = page.locator('button:has-text("Xác nhận tiếp nhận & Lưu kho")');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    await page.waitForTimeout(1000);
  });

  test('TC-WH-02: Xuất kho (warehouse_hyn) - Bảng danh sách, Nút Cập nhật thông số & Mode 1 Xuất Khách', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);

    // 1. Điều hướng đến trang Xuất kho
    await page.goto('/dashboard/warehouse/outbound');
    await page.waitForLoadState('networkidle');

    // 2. Kiểm tra Header & 4 Stat Cards
    await expect(page.getByRole('heading', { name: /Xuất kho.*Polaris Hub - Hưng Yên/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Chờ xuất kho')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xuất cho khách hàng' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xuất luân chuyển nội bộ' })).toBeVisible();
    await expect(page.locator('text=Đã xuất kho hôm nay')).toBeVisible();

    // 3. Kiểm tra Nút Cập nhật lại thông số
    const refreshBtn = page.locator('button:has-text("Cập nhật lại thông số")');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    // 4. Bấm "Xuất cho khách hàng" (Mode 1)
    await page.getByRole('button', { name: 'Xuất cho khách hàng' }).click();
    await expect(page.locator('text=Tạo Phiếu Xuất Kho · Giao Cho Khách Hàng (Mode 1)')).toBeVisible();

    // 5. Kiểm tra Form người nhận & Icon Tra cứu kho
    await expect(page.locator('label:has-text("Khách hàng / Người nhận")')).toBeVisible();
    const lookupBtn = page.locator('button[title="Tra cứu kho để gán mã đơn"]').first();
    if (await lookupBtn.isVisible()) {
      await lookupBtn.click();
      await expect(page.locator('text=/Tra Cứu.*Kho/i')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('TC-WH-03: Thủ kho Đà Nẵng (warehouse_dad) - Nhận luân chuyển Mode 2 Stepper 3 bước', async ({ page }) => {
    await loginAs(page, WAREHOUSE_DAD);

    // 1. Vào trang Nhập kho
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    // 2. Kiểm tra Header hiển thị đúng Hub Đà Nẵng
    await expect(page.getByRole('heading', { name: /Nhập kho.*Magellan Hub - Đà Nẵng/ })).toBeVisible({ timeout: 10_000 });

    // 3. Chuyển sang Mode 2: Luân chuyển nội bộ
    await page.getByRole('button', { name: 'Nhận luân chuyển nội bộ' }).click();

    // 4. Kiểm tra Modal Bước 1 mở
    await expect(page.locator('text=/BƯỚC 1.*CHỌN CHUYẾN/i')).toBeVisible({ timeout: 5_000 });
    const chooseTripBtn = page.locator('button:has-text("Chọn chuyến")').first();
    if (await chooseTripBtn.isVisible()) {
      await chooseTripBtn.evaluate((el: HTMLElement) => el.click());
      await page.waitForTimeout(500);
    }
  });

  test('TC-WH-04: Thủ kho HCM (warehouse_hcm) - Tổng Hợp Đơn Hàng Tại Kho', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HCM);

    // 1. Vào trang Đơn hàng kho
    await page.goto('/dashboard/warehouse/orders');
    await page.waitForLoadState('networkidle');

    // 2. Kiểm tra giao diện và bộ lọc trạng thái và Hub HCM
    await expect(page.getByRole('heading', { name: /Tổng Hợp Đơn Hàng Tại Kho.*Andromeda Hub - HCM/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('button:has-text("Tất cả")')).toBeVisible();
    await expect(page.locator('button:has-text("LƯU KHO")')).toBeVisible();
    await expect(page.locator('button:has-text("DRAFT")')).toBeVisible();
    await expect(page.locator('button:has-text("ĐÃ XUẤT KHO")')).toBeVisible();
  });

  test('TC-WH-05: Super Admin - Truy cập toàn diện và xác thực Navigation 3 Menu Kho', async ({ page }) => {
    await loginAs(page, SUPER_ADMIN);

    // 1. Kiểm tra Sidebar Navigation hiển thị đủ 3 menu kho
    await page.goto('/dashboard/overview');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('a[href="/dashboard/warehouse/inbound"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('a[href="/dashboard/warehouse/outbound"]')).toBeVisible();
    await expect(page.locator('a[href="/dashboard/warehouse/orders"]')).toBeVisible();

    // 2. Truy cập trực tiếp vào các route
    await page.goto('/dashboard/warehouse/inbound');
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 10_000 });

    await page.goto('/dashboard/warehouse/outbound');
    await expect(page.getByRole('heading', { name: /Xuất kho/ })).toBeVisible({ timeout: 10_000 });

    await page.goto('/dashboard/warehouse/orders');
    await expect(page.locator('text=Tổng Hợp Đơn Hàng Tại Kho')).toBeVisible({ timeout: 10_000 });
  });
});
