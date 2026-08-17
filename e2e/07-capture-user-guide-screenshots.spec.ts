/**
 * e2e/07-capture-user-guide-screenshots.spec.ts
 * Captures high-resolution, pixel-perfect screenshots for user documentation & onboarding.
 * Covers all 4 roles across the end-to-end logistics workflow.
 */
import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';
import * as path from 'path';

const dispatcherUser = TEST_USERS.find((u) => u.role === 'DISPATCHER')!;
const fleetUser = TEST_USERS.find((u) => u.role === 'FLEET_MANAGER')!;
const warehouseUser = TEST_USERS.find((u) => u.role === 'WAREHOUSE_MANAGER')!;

// Target directory for user guide screenshots
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/user-guide/screenshots');

test.describe('Capture User Guide Documentation Screenshots', () => {
  test.use({ viewport: { width: 1366, height: 850 } });
  test.setTimeout(90_000);

  test('Capture complete user guide workflow screenshots', async ({ page }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now().toString().slice(-4);
    const testOrderCode = `DOCS${timestamp}`;

    // ── 01. LOGIN PAGE & DEMO ACCOUNTS ──────────────────────────────────────
    await page.goto('/auth/sign-in');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01_login_page.png'),
      fullPage: false
    });

    // ── 02. DISPATCHER: ORDERS LIST ─────────────────────────────────────────
    await loginAs(page, dispatcherUser);
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02_dispatcher_orders_list.png')
    });

    // ── 03. DISPATCHER: CREATE ORDER MODAL (WITH TEXTAREA) ──────────────────
    await page.click('button:has-text("Tạo lệnh điều vận mới")');
    await page.waitForSelector('#order-code-input', { state: 'visible' });

    // Fill form with rich multiline content
    await page.fill('#order-code-input', testOrderCode);
    await page.selectOption('#origin-hub-select', 'Andromeda Hub (Hà Nội)');
    await page.selectOption('#destination-hub-select', 'Centaurus Hub (TP.HCM)');
    await page.fill('#total-weight-input', '22000');
    await page.fill('#total-volume-input', '58.5');
    await page.fill(
      '#goods-desc-input',
      '40 kiện thiết bị viễn thông nguyên đai nguyên kiện\nHàng giá trị cao, yêu cầu che chắn chống ẩm\nKèm 10 thùng phụ kiện cáp quang dự phòng'
    );
    await page.fill(
      '#notes-input',
      'Yêu cầu xe thùng kín có bửng nâng hạ thủy lực.\nThời gian giao hàng dự kiến trước 17h00 ngày 20/08.\nLiên hệ thủ kho tiếp nhận trước 30 phút.'
    );
    await page.check('#isExternalNeeded');
    await page.waitForSelector('#external-note-input', { state: 'visible' });
    await page.fill(
      '#external-note-input',
      'Đội xe nội bộ 15 tấn đang kín lịch; Cần thuê ngoài xe đầu kéo sàn phẳng từ đối tác Vận Tải Á Châu.'
    );
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03_dispatcher_create_order_modal.png')
    });

    // Submit form
    const createPromise = page.waitForResponse(
      (res) =>
        res.url().includes('/orders') && res.request().method() === 'POST' && res.status() === 201
    );
    await page.click('button[type="submit"]:has-text("Lưu & Tạo lệnh")');
    await createPromise;
    await page.waitForSelector('#order-code-input', { state: 'hidden' });
    await page.waitForLoadState('networkidle');

    // ── 04. DISPATCHER: SUBMIT TO FLEET ────────────────────────────────────
    const row = page.locator('tr', { hasText: testOrderCode }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04_dispatcher_order_draft_created.png')
    });

    const sendFleetBtn = row.locator('button:has-text("Gửi Fleet")');
    await sendFleetBtn.click();
    await expect(row.locator('text=Chờ điều xe')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05_dispatcher_order_submitted_to_fleet.png')
    });

    // ── 05. ORDER DETAIL VIEW ──────────────────────────────────────────────
    await row.locator('a[href*="/dashboard/orders/"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06_order_detail_view.png')
    });

    await clearSession(page);

    // ── 06. FLEET MANAGER: PENDING ORDERS & CAPACITY GAUGE MODAL ───────────
    await loginAs(page, fleetUser);
    await page.goto('/dashboard/trips');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07_fleet_trips_pending_board.png')
    });

    // Open Assign Vehicle Modal
    const assignBtn = page.locator(`[data-testid="btn-assign-order-${testOrderCode}"]`);
    await expect(assignBtn).toBeVisible({ timeout: 15000 });
    await assignBtn.click();
    await page.waitForSelector('#select-trip-vehicle', { state: 'visible' });

    // Select an external vehicle to show the warning and capacity gauge
    const vehicleSelect = page.locator('#select-trip-vehicle');
    const options = await vehicleSelect.locator('option').all();
    if (options.length > 1) {
      await vehicleSelect.selectOption({ index: 1 });
    }
    await page.fill('#trip-pickup-date', '2026-08-20');
    await page.fill('#trip-pickup-time', '08:30');
    await page.fill('#trip-eta-date', '2026-08-22');
    await page.fill(
      '#trip-notes-input',
      'Tài xế nhận hàng tại Cửa số 3 Hub Hà Nội, kiểm tra seal chì trước khi lăn bánh.'
    );
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08_fleet_assign_single_modal.png')
    });

    // ── 07. FLEET MANAGER: SPLIT SHIPMENT MODE ─────────────────────────────
    await page.click('button:has-text("Chuyển sang Split")');
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09_fleet_assign_split_modal.png')
    });

    // Switch back to single mode and confirm assignment
    await page.click('button:has-text("Đang chia nhiều xe")');
    await page.waitForTimeout(300);
    await page.click('button[type="submit"]:has-text("Xác nhận phân công")');
    await page.waitForSelector('#select-trip-vehicle', { state: 'hidden' });
    await page.waitForTimeout(500);

    // ── 08. FLEET MANAGER: CONFIRM TRIP ────────────────────────────────────
    await page.click('button:has-text("Danh Sách Chuyến Xe")');
    await page.waitForLoadState('networkidle');

    const confirmTripBtn = page
      .locator(`tr:has-text("${testOrderCode}") button:has-text("Xác nhận Trip")`)
      .first();
    await expect(confirmTripBtn).toBeVisible({ timeout: 10000 });

    const confirmPromise = page.waitForResponse(
      (res) => res.url().includes('/confirm') && res.status() === 200
    );
    await confirmTripBtn.click();
    await confirmPromise;

    await expect(
      page.locator(`tr:has-text("${testOrderCode}"):has-text("Đã xác nhận")`).first()
    ).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '10_fleet_trips_confirmed_list.png')
    });

    // ── 09. FLEET VEHICLE MANAGEMENT ───────────────────────────────────────
    await page.goto('/dashboard/fleet');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '11_fleet_vehicles_management.png')
    });

    await clearSession(page);

    // ── 10. WAREHOUSE MANAGER: INBOUND RECEIVING BOARD ─────────────────────
    await loginAs(page, warehouseUser);
    await page.goto('/dashboard/warehouse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '12_warehouse_inbound_board.png')
    });

    // Filter to this order
    await page.fill('input[placeholder*="Tìm theo mã đơn"]', testOrderCode);
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '13_warehouse_inbound_order_detail.png')
    });

    await clearSession(page);
  });
});
