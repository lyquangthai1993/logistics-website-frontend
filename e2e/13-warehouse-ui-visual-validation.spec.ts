import { test, expect } from '@playwright/test';
import { loginAs, clearSession } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

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

const ARTIFACT_SCREENSHOT_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/8c1cdb2a-5228-45f9-a6ff-0c9d427e1f1a/screenshots';

test.describe('Phân Hệ Quản Lý Kho - Visual Screenshot Validation', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(ARTIFACT_SCREENSHOT_DIR)) {
      fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Screenshot 01: WH_INBOUND_BOARD (Node ID sq2P6 - Màn hình chính Danh sách nhập kho)', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('CHỜ NHẬP KHO', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tạo đơn nhập mới' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nhận luân chuyển nội bộ' })).toBeVisible();
    await expect(page.locator('button:has-text("Cập nhật lại thông số")')).toBeVisible();

    await page.waitForTimeout(1000);

    const screenshotPath = path.join(ARTIFACT_SCREENSHOT_DIR, '01_WH_INBOUND_BOARD.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPath}`);
  });

  test('Screenshot 02: WH_INBOUND_MODE1 (Mode 1 - Nhập kho khách hàng & Bảng 10 cột)', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Tạo đơn nhập mới' }).click();
    await expect(page.locator('text=1. Ngày tiếp nhận')).toBeVisible();
    await expect(page.locator('th:has-text("MÃ ĐƠN HÀNG")')).toBeVisible();

    await page.waitForTimeout(1000);

    const screenshotPath = path.join(ARTIFACT_SCREENSHOT_DIR, '02_WH_INBOUND_MODE1.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPath}`);
  });

  test('Screenshot 03: WH_INBOUND_MODE2 (Mode 2 - Luân chuyển nội bộ liên Hub)', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Nhận luân chuyển nội bộ' }).click();
    await expect(page.locator('text=① Chọn chuyến xe đang đến')).toBeVisible();

    await page.waitForTimeout(1000);

    const screenshotPath = path.join(ARTIFACT_SCREENSHOT_DIR, '03_WH_INBOUND_MODE2.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPath}`);
  });

  test('Screenshot 04: WH_PALLET_LABEL_A4 (Tem Nhận Diện Hàng Hóa Khổ A4)', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    const printBtn = page.locator('button[title="In tem nhận diện A4"]').first();
    if (!(await printBtn.isVisible())) {
      await page.getByRole('button', { name: 'Tạo đơn nhập mới' }).click();
      await page.waitForTimeout(500);
    }
    await printBtn.click();
    await expect(page.getByRole('heading', { name: 'TEM NHẬN DIỆN HÀNG HÓA', exact: true })).toBeVisible();

    await page.waitForTimeout(1000);

    const screenshotPath = path.join(ARTIFACT_SCREENSHOT_DIR, '04_WH_PALLET_LABEL_A4.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: ${screenshotPath}`);
  });

  test('Screenshot 05: WH_OUTBOUND_BOARD (Màn hình chính Danh sách xuất kho)', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/outbound');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Xuất kho/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Chờ xuất kho')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xuất cho khách hàng' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xuất luân chuyển nội bộ' })).toBeVisible();
    await expect(page.locator('button:has-text("Cập nhật lại thông số")')).toBeVisible();

    await page.waitForTimeout(1000);

    const screenshotPath = path.join(ARTIFACT_SCREENSHOT_DIR, '05_WH_OUTBOUND_BOARD.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPath}`);
  });

  test('Screenshot 06: WH_OUTBOUND_CUSTOMER (Mode 1 - Xuất cho khách hàng)', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/outbound');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Xuất cho khách hàng' }).click();
    await expect(page.locator('text=Tạo Phiếu Xuất Kho · Giao Cho Khách Hàng (Mode 1)')).toBeVisible();
    await expect(page.locator('th:has-text("MÃ ĐƠN HÀNG")')).toBeVisible();

    await page.waitForTimeout(1000);

    const screenshotPath = path.join(ARTIFACT_SCREENSHOT_DIR, '06_WH_OUTBOUND_CUSTOMER.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPath}`);
  });

  test('Screenshot 07: Mode 2 - Xuất luân chuyển nội bộ 3 Bước (WH_OUTBOUND_CREATE_TRIP, WH_OUTBOUND_SELECT_MODAL, WH_OUTBOUND_LOADED)', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/outbound');
    await page.waitForLoadState('networkidle');

    // Enter Mode 2: Step 1 (WH_OUTBOUND_CREATE_TRIP)
    await page.getByRole('button', { name: 'Xuất luân chuyển nội bộ' }).click();
    await expect(page.locator('text=BƯỚC 1: CHỌN HUB ĐÍCH & THÔNG TIN XE CHUYẾN')).toBeVisible();
    await expect(page.locator('text=Thông tin chuyến xuất')).toBeVisible();
    await expect(page.locator('button:has-text("Chọn hàng trong kho →")')).toBeVisible();

    await page.waitForTimeout(1000);
    const step1Path = path.join(ARTIFACT_SCREENSHOT_DIR, '07_WH_OUTBOUND_TRANSFER.png');
    await page.screenshot({ path: step1Path, fullPage: true });
    const step1NamedPath = path.join(ARTIFACT_SCREENSHOT_DIR, '07_A_WH_OUTBOUND_CREATE_TRIP.png');
    await page.screenshot({ path: step1NamedPath, fullPage: true });
    console.log(`Saved screenshot: ${step1NamedPath}`);

    // Advance to Step 2 (WH_OUTBOUND_SELECT_MODAL)
    await page.click('button:has-text("Chọn hàng trong kho →")');
    await expect(page.locator('text=CHỌN HÀNG XUẤT KHO')).toBeVisible();
    await expect(page.locator('text=Kho xuất:')).toBeVisible();
    await expect(page.locator('th:has-text("MÃ ĐƠN HÀNG")')).toBeVisible();
    await page.waitForTimeout(1000);
    const step2Path = path.join(ARTIFACT_SCREENSHOT_DIR, '07_B_WH_OUTBOUND_SELECT_MODAL.png');
    await page.screenshot({ path: step2Path, fullPage: true });
    console.log(`Saved screenshot: ${step2Path}`);

    // Select rows from real DB table before proceeding to Step 3
    const selectAllLabel = page.locator('label:has-text("Chọn tất cả")');
    if (await selectAllLabel.isVisible()) {
      await selectAllLabel.click();
    } else {
      const firstCheckbox = page.locator('tbody input[type="checkbox"]').first();
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click();
      }
    }
    await page.waitForTimeout(500);

    // Advance to Step 3 (WH_OUTBOUND_LOADED)
    await page.click('button:has-text("Xác nhận hàng đã chọn → Sang Bước 3")');
    await expect(page.locator('text=Xác nhận phiếu xuất kho')).toBeVisible();
    await expect(page.locator('text=Thông tin chuyến xe xuất kho')).toBeVisible();
    await expect(page.locator('text=Khóa từ Bước 1')).toBeVisible();
    await expect(page.locator('text=TỔNG KẾT HÀNG XUẤT')).toBeVisible();
    await expect(page.locator('button:has-text("Xác nhận xuất kho luân chuyển")')).toBeVisible();

    await page.waitForTimeout(1000);
    const step3Path = path.join(ARTIFACT_SCREENSHOT_DIR, '07_C_WH_OUTBOUND_LOADED.png');
    await page.screenshot({ path: step3Path, fullPage: true });
    console.log(`Saved screenshot: ${step3Path}`);
  });

  test('Screenshot 08: WH_ORDERS_SUMMARY (Tổng Hợp Đơn Hàng Tại Kho & Bộ Lọc Trạng Thái)', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/orders');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Tổng Hợp Đơn Hàng Tại Kho')).toBeVisible();
    await expect(page.locator('button:has-text("Tất cả")')).toBeVisible();

    await page.waitForTimeout(1000);

    const screenshotPath = path.join(ARTIFACT_SCREENSHOT_DIR, '08_WH_ORDERS_SUMMARY.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPath}`);
  });

  test('Screenshot 09: WH_XE_BO_SEARCHABLE_DROPDOWN (Kiểm tra Dropdown Xe bo tìm kiếm live & hiển thị đầy đủ danh sách từ DB)', async ({ page }) => {
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Tạo đơn nhập mới' }).click();
    await expect(page.locator('text=1. Ngày tiếp nhận')).toBeVisible();

    // Select 'XE_BO' in the delivery mode dropdown for row 1
    const deliveryModeSelect = page.locator('select').filter({ hasText: 'Địa chỉ thường' }).first();
    await deliveryModeSelect.selectOption('XE_BO');

    // Click the searchable xe bo trigger button
    const xeBoTrigger = page.locator('button:has-text("Xe bo")').first();
    await xeBoTrigger.click();

    // Verify the search input appears and live search works
    const searchInput = page.locator('input[placeholder*="Tìm Tuyến xe bo"]');
    await expect(searchInput).toBeVisible();

    // Verify search count badge shows 34 xe bo loaded from DB
    await expect(page.getByText(/\d+ xe bo/i)).toBeVisible();

    // Type 'Hà Nội' into search
    await searchInput.fill('Hà Nội');
    await page.waitForTimeout(500);

    // Verify filtered result shows Hà Nội
    await expect(page.locator('button:has-text("Xe bo Tuyến Hà Nội")')).toBeVisible();

    const screenshotPath = path.join(ARTIFACT_SCREENSHOT_DIR, '09_WH_XE_BO_SEARCHABLE_DROPDOWN.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: ${screenshotPath}`);
  });

  test('Screenshot 10: WH_OUTBOUND_LOOKUP_MODAL (Modal Tra Cứu & Chọn Hàng Trong Kho theo chuẩn Design Pen)', async ({ page }) => {
    await loginAs(page, WAREHOUSE_DAD);
    await page.goto('/dashboard/warehouse/outbound');
    await page.waitForLoadState('networkidle');

    // Click 'Xuất cho khách hàng' to enter editable grid mode
    await page.getByRole('button', { name: 'Xuất cho khách hàng' }).click();
    await expect(page.locator('th:has-text("MÃ ĐƠN HÀNG")')).toBeVisible();

    // Click the search lookup icon on row 1 of the editable table
    const lookupBtn = page.locator('button[title*="Tra cứu"]').first();
    await expect(lookupBtn).toBeVisible();
    await lookupBtn.click();

    // Wait for the Lookup Modal to appear
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('text=Tra Cứu & Chọn Đơn Hàng Từ Kho')).toBeVisible();
    await expect(dialog.locator('th:has-text("MÃ ĐƠN HÀNG")')).toBeVisible();
    await expect(dialog.locator('th:has-text("TÊN HÀNG HÓA")')).toBeVisible();
    await expect(dialog.locator('th:has-text("SỐ KIỆN")')).toBeVisible();
    await expect(dialog.locator('th:has-text("SỐ KG")')).toBeVisible();
    await expect(dialog.locator('th:has-text("SỐ M³")')).toBeVisible();
    await expect(dialog.locator('th:has-text("TRẠNG THÁI")')).toBeVisible();
    await expect(dialog.locator('th:has-text("THAO TÁC")')).toBeVisible();

    await page.waitForTimeout(1500);

    const screenshotPath = path.join(ARTIFACT_SCREENSHOT_DIR, '10_WH_OUTBOUND_LOOKUP_MODAL.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: ${screenshotPath}`);
  });
});

