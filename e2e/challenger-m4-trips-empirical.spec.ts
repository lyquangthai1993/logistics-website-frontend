import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

test.describe('Challenger 2 Empirical Suite: Trips & Vehicle Capacity Standardization Stress Tests', () => {
  const dispatcherUser = TEST_USERS.find((u) => u.role === 'DISPATCHER')!;
  const fleetUser = TEST_USERS.find((u) => u.role === 'FLEET_MANAGER')!;

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('Test 1: Capacity Gauge Live Calculations & Boundary Stress Testing', async ({ page }) => {
    test.setTimeout(60_000);
    const testOrderCode = `GAUGE${Date.now().toString().slice(-4)}`;

    // 1.1 Dispatcher creates a test order with high weight
    await loginAs(page, dispatcherUser);
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Tạo lệnh điều vận mới")');
    await page.fill('#order-code-input', testOrderCode);
    await page.fill('#total-weight-input', '15000');
    await page.fill('#total-volume-input', '35.5');
    await page.fill('#goods-desc-input', 'Thép tấm xây dựng nặng');

    const createPromise = page.waitForResponse(
      (res) => res.url().includes('/orders') && res.request().method() === 'POST' && res.status() === 201
    );
    await page.click('button[type="submit"]:has-text("Lưu & Tạo lệnh")');
    await createPromise;

    const row = page.locator('tr', { hasText: testOrderCode });
    await row.locator('button:has-text("Gửi Fleet")').click();
    await expect(row.locator('text=Chờ điều xe')).toBeVisible({ timeout: 10000 });

    await clearSession(page);

    // 1.2 Fleet Manager opens Assign Vehicle modal to inspect Capacity Gauge
    await loginAs(page, fleetUser);
    await page.goto('/dashboard/trips');
    await page.waitForLoadState('networkidle');

    const assignBtn = page.locator(`[data-testid="btn-assign-order-${testOrderCode}"]`);
    await expect(assignBtn).toBeVisible({ timeout: 15000 });
    await assignBtn.click();

    // Verify Vehicle Select is visible
    const vehicleSelect = page.locator('#select-trip-vehicle');
    await expect(vehicleSelect).toBeVisible();

    // Select a vehicle option
    await vehicleSelect.selectOption({ index: 1 });

    // Verify Capacity Gauge container renders
    const gaugeSection = page.locator('text=Mức độ tải trọng xe (Capacity Utilization)');
    await expect(gaugeSection).toBeVisible();

    // Check volume utilization string
    await expect(page.locator('text=Thể tích hàng / Thể tích thùng:')).toBeVisible();

    // Verify visual progress bar element exists
    const progressBar = page.locator('.h-full.transition-all.duration-300').first();
    await expect(progressBar).toBeVisible();

    // Close modal
    await page.click('button:has-text("Hủy")');
  });

  test('Test 2: Split Shipment Mode - Min/Max Vehicle Boundaries (2..5) & Validation', async ({ page }) => {
    test.setTimeout(60_000);
    const testOrderCode = `SPLIT${Date.now().toString().slice(-4)}`;

    // Create large order
    await loginAs(page, dispatcherUser);
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Tạo lệnh điều vận mới")');
    await page.fill('#order-code-input', testOrderCode);
    await page.fill('#total-weight-input', '30000');
    await page.fill('#total-volume-input', '80');
    await page.fill('#goods-desc-input', 'Hàng cồng kềnh chia 5 xe');

    const createPromise = page.waitForResponse(
      (res) => res.url().includes('/orders') && res.request().method() === 'POST' && res.status() === 201
    );
    await page.click('button[type="submit"]:has-text("Lưu & Tạo lệnh")');
    await createPromise;

    const row = page.locator('tr', { hasText: testOrderCode });
    await row.locator('button:has-text("Gửi Fleet")').click();
    await expect(row.locator('text=Chờ điều xe')).toBeVisible({ timeout: 10000 });

    await clearSession(page);

    // Fleet Manager tests Split Shipment boundaries
    await loginAs(page, fleetUser);
    await page.goto('/dashboard/trips');
    await page.waitForLoadState('networkidle');

    const assignBtn = page.locator(`[data-testid="btn-assign-order-${testOrderCode}"]`);
    await expect(assignBtn).toBeVisible({ timeout: 15000 });
    await assignBtn.click();

    // Switch to Split mode
    const splitBtn = page.locator('button:has-text("Chuyển sang Split")');
    await splitBtn.click();
    await expect(page.locator('button:has-text("Đang chia nhiều xe")')).toBeVisible();

    // 2.1 Check initial split rows count is exactly 2 (minimum boundary)
    await expect(page.locator('text=Xe #1')).toBeVisible();
    await expect(page.locator('text=Xe #2')).toBeVisible();
    await expect(page.locator('text=Xe #3')).not.toBeVisible();

    // 2.2 Boundary: Cannot delete when only 2 vehicles exist ("Xóa xe này" must not be visible)
    await expect(page.locator('button:has-text("Xóa xe này")')).toHaveCount(0);

    // 2.3 Add vehicles up to 5 (maximum boundary)
    const addVehicleBtn = page.locator('button:has-text("Thêm xe chở hàng")');
    await expect(addVehicleBtn).toContainText('(2/5)');

    // Add 3rd vehicle
    await addVehicleBtn.click();
    await expect(page.locator('text=Xe #3')).toBeVisible();
    await expect(addVehicleBtn).toContainText('(3/5)');
    // When 3 vehicles exist, "Xóa xe này" buttons appear
    await expect(page.locator('button:has-text("Xóa xe này")')).toHaveCount(3);

    // Add 4th vehicle
    await addVehicleBtn.click();
    await expect(page.locator('text=Xe #4')).toBeVisible();
    await expect(addVehicleBtn).toContainText('(4/5)');

    // Add 5th vehicle
    await addVehicleBtn.click();
    await expect(page.locator('text=Xe #5')).toBeVisible();

    // 2.4 Boundary: At 5 vehicles, "Thêm xe chở hàng" button must be hidden/removed
    await expect(page.locator('button:has-text("Thêm xe chở hàng")')).toHaveCount(0);

    // 2.5 Delete down to 4 vehicles
    const deleteBtn = page.locator('button:has-text("Xóa xe này")').last();
    await deleteBtn.click();
    await expect(page.locator('text=Xe #5')).not.toBeVisible();
    await expect(page.locator('button:has-text("Thêm xe chở hàng")')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Hủy")');
  });

  test('Test 3: No-Vehicle Declaration & Categorized Reason Selection', async ({ page }) => {
    test.setTimeout(60_000);
    const testOrderCode = `NOVEH${Date.now().toString().slice(-4)}`;

    // Create order
    await loginAs(page, dispatcherUser);
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Tạo lệnh điều vận mới")');
    await page.fill('#order-code-input', testOrderCode);
    await page.fill('#total-weight-input', '22000');
    await page.fill('#total-volume-input', '60');
    await page.fill('#goods-desc-input', 'Hàng cồng kềnh cần báo hết xe');

    const createPromise = page.waitForResponse(
      (res) => res.url().includes('/orders') && res.request().method() === 'POST' && res.status() === 201
    );
    await page.click('button[type="submit"]:has-text("Lưu & Tạo lệnh")');
    await createPromise;

    const row = page.locator('tr', { hasText: testOrderCode });
    await row.locator('button:has-text("Gửi Fleet")').click();
    await expect(row.locator('text=Chờ điều xe')).toBeVisible({ timeout: 10000 });

    await clearSession(page);

    // Fleet Manager declares No Vehicle
    await loginAs(page, fleetUser);
    await page.goto('/dashboard/trips');
    await page.waitForLoadState('networkidle');

    // Find the specific order button in pending orders tab
    const noVehicleBtn = page
      .locator(`div:has-text("${testOrderCode}")`)
      .locator('button:has-text("Báo hết xe")')
      .first();
    await expect(noVehicleBtn).toBeVisible({ timeout: 15000 });
    await noVehicleBtn.click();

    // Verify No-Vehicle dialog opens
    const dialog = page.locator('text=Xác Nhận Báo Hết Xe Nội Bộ');
    await expect(dialog).toBeVisible();

    // 3.1 Verify categorized radio buttons exist
    const radioBusy = page.locator('input[value="BUSY"]');
    const radioMaint = page.locator('input[value="MAINTENANCE"]');
    const radioOverCap = page.locator('input[value="OVER_CAPACITY"]');
    const radioHub = page.locator('input[value="HUB_UNAVAILABLE"]');
    const radioCustom = page.locator('input[value="CUSTOM"]');

    await expect(radioBusy).toBeVisible();
    await expect(radioMaint).toBeVisible();
    await expect(radioOverCap).toBeVisible();
    await expect(radioHub).toBeVisible();
    await expect(radioCustom).toBeVisible();

    // 3.2 Select CUSTOM reason and provide detailed notes
    await radioCustom.check();
    await expect(radioCustom).toBeChecked();

    const customReasonInput = page.locator('#no-vehicle-custom-reason');
    await customReasonInput.fill('Toàn bộ xe tải 15T đang chạy tuyến Huế - SG. Đề nghị thuê xe ngoài.');

    // Confirm No-Vehicle action (PATCH request)
    const noVehiclePromise = page.waitForResponse(
      (res) => res.url().includes('/no-vehicle') && res.request().method() === 'PATCH' && res.status() === 200
    );
    await page.click('button:has-text("Xác nhận báo hết xe")');
    await noVehiclePromise;

    // 3.3 Verify order status transitions to NO_VEHICLE ("Không có xe nội bộ")
    await expect(page.locator(`text=${testOrderCode}`).first()).toBeVisible({ timeout: 10000 });
    const updatedCard = page.locator(`div:has-text("${testOrderCode}")`).first();
    await expect(updatedCard.locator('text=Không có xe nội bộ')).toBeVisible({ timeout: 10000 });
  });

  test('Test 4: Tab State & URL Synchronization with nuqs', async ({ page }) => {
    test.setTimeout(45_000);
    await loginAs(page, fleetUser);

    // 4.1 Direct URL navigation to pending-orders
    await page.goto('/dashboard/trips?tab=pending-orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#tab-pending-orders')).toHaveAttribute('data-active', '');

    // 4.2 Direct URL navigation to all-trips
    await page.goto('/dashboard/trips?tab=all-trips');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#tab-all-trips')).toHaveAttribute('data-active', '');
    await expect(page.locator('table')).toBeVisible();

    // 4.3 URL backward compatibility with legacy tab names ('pending', 'all')
    await page.goto('/dashboard/trips?tab=pending');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#tab-pending-orders')).toHaveAttribute('data-active', '');

    await page.goto('/dashboard/trips?tab=all');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#tab-all-trips')).toHaveAttribute('data-active', '');

    // 4.4 Tab switching updates URL
    await page.click('#tab-all-trips');
    await page.waitForTimeout(300);
    expect(page.url()).toContain('tab=all-trips');

    // 4.5 Search query input resets pagination & updates URL
    const searchInput = page.locator('input[placeholder*="Tìm kiếm mã đơn / biển số..."]');
    await searchInput.fill('TRIP-TEST-99');
    await page.waitForTimeout(400);
    expect(page.url()).toContain('search=TRIP-TEST-99');

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(400);
    expect(page.url()).not.toContain('TRIP-TEST-99');

    // 4.6 Injected corrupt URL params fallback gracefully without crashing React
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/dashboard/trips?page=-99&perPage=99999&search=%3Cscript%3E&status=INVALID&tab=corrupted_tab');
    await page.waitForLoadState('networkidle');

    // Page must remain responsive and render without fatal crash
    await expect(page.getByRole('heading', { name: 'Phân Công Xe & Quản Lý Chuyến' })).toBeVisible();
    const hasFatalCrash = consoleErrors.some((e) => e.includes('Minified React error') || e.includes('Uncaught Error'));
    expect(hasFatalCrash).toBe(false);
  });
});
