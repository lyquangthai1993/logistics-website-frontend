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

    // 2. Kiểm tra Header hiển thị Hub hiện tại và 3 trường bắt buộc viền đỏ
    await expect(page.locator('text=Tiếp Nhận & Nhập Kho')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=1. Ngày tiếp nhận')).toBeVisible();
    await expect(page.locator('text=2. Biển số xe')).toBeVisible();
    await expect(page.locator('text=3. Họ tên tài xế / người giao')).toBeVisible();

    // 3. Kiểm tra 10 Cột Bảng Vận Hành Chuẩn
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

    // 4. Mở Modal In Tem Nhận Diện A4 và kiểm tra các trường biến động
    const printBtn = page.locator('button[title="In tem nhận diện A4"]').first();
    await printBtn.click();

    await expect(page.getByRole('heading', { name: 'TEM NHẬN DIỆN HÀNG HÓA', exact: true })).toBeVisible();
    await expect(page.locator('text=KHO TIẾP NHẬN:')).toBeVisible();
    await expect(page.locator('text=PALET SỐ:')).toBeVisible();
    await expect(page.locator('text=TỔNG SỐ PALET:')).toBeVisible();
    await expect(page.locator('text=SỐ LƯỢNG (KIỆN / TỔNG ĐƠN):')).toBeVisible();

    // Đóng modal in tem
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 5. Bấm nút Thêm dòng mới
    await page.locator('button:has-text("+ Thêm dòng hàng mới")').click();

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
    await expect(page.locator('text=Phân Hệ Xuất Kho')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Chờ xuất kho')).toBeVisible();
    await expect(page.getByText('Xuất cho khách hàng', { exact: true })).toBeVisible();
    await expect(page.getByText('Luân chuyển nội bộ', { exact: true })).toBeVisible();
    await expect(page.locator('text=Đã xuất kho hôm nay')).toBeVisible();

    // 3. Kiểm tra Nút Cập nhật lại thông số
    const refreshBtn = page.locator('button:has-text("Cập nhật lại thông số")');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    // 4. Bấm "+ Xuất cho khách hàng" (Mode 1)
    await page.getByRole('button', { name: '+ Xuất cho khách hàng' }).click();
    await expect(page.locator('text=Tạo Phiếu Xuất Kho · Giao Cho Khách Hàng (Mode 1)')).toBeVisible();

    // 5. Kiểm tra Form người nhận & Icon Tra cứu kho
    await expect(page.locator('label:has-text("Khách hàng / Người nhận")')).toBeVisible();
    const lookupBtn = page.locator('button[title="Tra cứu kho để gán mã đơn"]').first();
    if (await lookupBtn.isVisible()) {
      await lookupBtn.click();
      await expect(page.locator('text=Tra Cứu Hàng Trong Kho')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('TC-WH-03: Thủ kho Đà Nẵng (warehouse_dad) - Nhận luân chuyển Mode 2 Stepper 3 bước', async ({ page }) => {
    await loginAs(page, WAREHOUSE_DAD);

    // 1. Vào trang Nhập kho
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    // 2. Chuyển sang Tab Mode 2: Luân chuyển nội bộ
    await page.locator('button:has-text("Mode 2: Luân chuyển nội bộ")').click();

    // 3. Kiểm tra Stepper 3 bước
    await expect(page.locator('text=① Chọn chuyến xe đang đến')).toBeVisible();
    await expect(page.locator('text=② Chọn đơn hàng cần dỡ')).toBeVisible();
    await expect(page.locator('text=③ Kiểm tra & Nhập kho')).toBeVisible();

    // 4. Bấm nút Chọn chuyến hàng
    const selectTripBtn = page.locator('button:has-text("Chọn chuyến hàng")');
    await expect(selectTripBtn).toBeVisible();
    await selectTripBtn.click();

    // 5. Kiểm tra Modal Chuyến xe luân chuyển
    await expect(page.locator('text=Chọn chuyến xe đến')).toBeVisible({ timeout: 5_000 });
    const chooseThisTripBtn = page.locator('button:has-text("Chọn chuyến này ➔")').first();
    if (await chooseThisTripBtn.isVisible()) {
      await chooseThisTripBtn.click();
      await expect(page.locator('text=Đổi chuyến xe khác')).toBeVisible();
    }
  });

  test('TC-WH-04: Thủ kho HCM (warehouse_hcm) - Tổng Hợp Đơn Hàng Tại Kho', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HCM);

    // 1. Vào trang Đơn hàng kho
    await page.goto('/dashboard/warehouse/orders');
    await page.waitForLoadState('networkidle');

    // 2. Kiểm tra giao diện và bộ lọc trạng thái
    await expect(page.locator('text=Tổng Hợp Đơn Hàng Tại Kho')).toBeVisible({ timeout: 10_000 });
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
    await expect(page.locator('text=Tiếp Nhận & Nhập Kho')).toBeVisible({ timeout: 10_000 });

    await page.goto('/dashboard/warehouse/outbound');
    await expect(page.locator('text=Phân Hệ Xuất Kho')).toBeVisible({ timeout: 10_000 });

    await page.goto('/dashboard/warehouse/orders');
    await expect(page.locator('text=Tổng Hợp Đơn Hàng Tại Kho')).toBeVisible({ timeout: 10_000 });
  });
});
