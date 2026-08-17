/**
 * e2e/06-order-dispatch-workflow.spec.ts
 * Tests the complete end-to-end workflow in a single continuous operational sequence:
 * 1. Dispatcher creates order -> submits to Fleet
 * 2. Fleet Manager views pending order -> assigns vehicle -> confirms trip
 * 3. Warehouse Manager views Inbound Board -> verifies confirmed trip
 */
import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

const dispatcherUser = TEST_USERS.find((u) => u.role === 'DISPATCHER')!;
const fleetUser = TEST_USERS.find((u) => u.role === 'FLEET_MANAGER')!;
const warehouseUser = TEST_USERS.find((u) => u.role === 'WAREHOUSE_MANAGER')!;

test.describe('Order Dispatch & Trip Assignment E2E Workflow', () => {
  test('Complete end-to-end flow: Dispatcher -> Fleet -> Warehouse', async ({ page }) => {
    test.setTimeout(60_000);
    const testOrderCode = `E2E${Date.now().toString().slice(-4)}`;

    // ── STEP 1: Dispatcher creates order and submits to Fleet ──────────────
    await loginAs(page, dispatcherUser);
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Lập Lệnh Điều Vận' })).toBeVisible();

    // Click create order button
    await page.click('button:has-text("Tạo lệnh điều vận mới")');

    // Fill form
    await page.fill('#order-code-input', testOrderCode);
    await page.fill('#total-weight-input', '18000');
    await page.fill('#total-volume-input', '45');
    await page.fill('#goods-desc-input', 'Linh kiện điện tử E2E Test');

    // Submit form and wait for API response
    const createPromise = page.waitForResponse(
      (res) =>
        res.url().includes('/orders') && res.request().method() === 'POST' && res.status() === 201
    );
    await page.click('button[type="submit"]:has-text("Lưu & Tạo lệnh")');
    await createPromise;

    // Verify order in table
    const orderLink = page.locator(`text=${testOrderCode}`).first();
    await expect(orderLink).toBeVisible({ timeout: 10000 });

    // Submit to Fleet
    const row = page.locator('tr', { hasText: testOrderCode });
    const sendFleetBtn = row.locator('button:has-text("Gửi Fleet")');
    await sendFleetBtn.click();

    // Verify status changed to Chờ điều xe
    await expect(row.locator('text=Chờ điều xe')).toBeVisible({ timeout: 10000 });

    await clearSession(page);

    // ── STEP 2: Fleet Manager views pending order and assigns trip ─────────
    await loginAs(page, fleetUser);
    await page.goto('/dashboard/trips');
    await page.waitForLoadState('networkidle');

    // Click assign vehicle button using data-testid
    const assignBtn = page.locator(`[data-testid="btn-assign-order-${testOrderCode}"]`);
    await expect(assignBtn).toBeVisible({ timeout: 15000 });
    await assignBtn.click();

    // Select first available vehicle
    const vehicleSelect = page.locator('#select-trip-vehicle');
    await vehicleSelect.waitFor({ state: 'visible' });
    await vehicleSelect.selectOption({ index: 1 });

    // Submit assignment
    await page.click('button[type="submit"]:has-text("Xác nhận phân công")');

    // Wait for modal to disappear
    await expect(page.locator('#select-trip-vehicle')).toBeHidden({ timeout: 5000 });

    // Switch to all trips tab
    await page.click('button:has-text("Danh Sách Chuyến Xe")');
    await page.waitForLoadState('networkidle');

    // Find trip for this order and confirm it
    const confirmBtn = page
      .locator(`tr:has-text("${testOrderCode}") button:has-text("Xác nhận Trip")`)
      .first();
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });

    const confirmPromise = page.waitForResponse(
      (res) => res.url().includes('/confirm') && res.status() === 200
    );
    await confirmBtn.click();
    await confirmPromise;

    // Verify trip status changed to Đã xác nhận
    await expect(
      page.locator(`tr:has-text("${testOrderCode}"):has-text("Đã xác nhận")`).first()
    ).toBeVisible({ timeout: 10000 });

    await clearSession(page);

    // ── STEP 3: Warehouse Manager views confirmed trip on Inbound Board ───
    await loginAs(page, warehouseUser);
    await page.goto('/dashboard/warehouse');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Inbound Hub & Kho Tiếp Nhận' })).toBeVisible();

    // Search for order
    await page.fill('input[placeholder*="Tìm theo mã đơn"]', testOrderCode);

    // Verify trip card is visible
    await expect(page.locator(`text=${testOrderCode}`).first()).toBeVisible({ timeout: 10000 });

    await clearSession(page);
  });
});
