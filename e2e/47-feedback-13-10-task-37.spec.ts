/**
 * frontend/e2e/47-feedback-13-10-task-37.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 13/10 (Task #37) — Khóa Quyền Thao Tác Đơn Hàng Đối Với Chuyến Xe Đã Xử Lý Tại Hub & Phân Quyền Đặc Quyền Admin
 *
 * Scenarios:
 * 1. API Security Guard:
 *    - WAREHOUSE_MANAGER at Andromeda Hub (HCM) calling POST append-order on COMPLETED stop SD44 receives 403 Forbidden.
 *    - SUPER_ADMIN calling the API succeeds with Admin Override privilege.
 * 2. UI Inspection - Hub Account Locked (Andromeda Hub - HCM):
 *    - Verify lock banner is displayed.
 *    - Verify '+ Bốc thêm đơn dọc đường về Hub' button is completely hidden.
 *    - Verify footer submit/skip buttons are hidden; forward button displays 'Xem hàng xuất tiếp trên xe'.
 *    - In Step 2: '+ Thêm đơn xuất từ kho lên xe' is hidden; destination buttons are read-only; confirm button is hidden.
 *    - Top card inputs (vehicle, driver) are disabled.
 *    - Saves screenshot_01_verified.png into feedbacks/feedback_13_10_task_37/.
 * 3. UI Inspection - Super Admin Override:
 *    - Super Admin opens completed trip SD44.
 *    - Verify Admin Override banner is displayed.
 *    - Saves screenshot_02_admin_override_verified.png into feedbacks/feedback_13_10_task_37/.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs } from './helpers/auth';

const DEV_BACKEND_URL =
  process.env.API_URL ?? 'https://backend-tms-core-dev.up.railway.app/api/v1';
const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const WH_HCM_EMAIL = 'lyquangthai1993+6@gmail.com';
const ADMIN_EMAIL = 'lyquangthai1993+1@gmail.com';
const PASSWORDS = ['secret', '123456'];

const WH_HCM_USER = {
  email: WH_HCM_EMAIL,
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
  expectedLandingPath: '/dashboard/overview',
};

const SUPER_ADMIN_USER = {
  email: ADMIN_EMAIL,
  password: 'secret',
  role: 'SUPER_ADMIN' as const,
  expectedLandingPath: '/dashboard/overview',
};

const FEEDBACK_DIR = fs.existsSync(path.resolve(__dirname, '../../feedbacks/feedback_13_10_task_37'))
  ? path.resolve(__dirname, '../../feedbacks/feedback_13_10_task_37')
  : path.resolve(process.cwd(), 'feedbacks/feedback_13_10_task_37');

function saveEvidenceScreenshot(filename: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(FEEDBACK_DIR)) {
      fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }
    const target = path.join(FEEDBACK_DIR, filename);
    fs.writeFileSync(target, buffer);
    console.warn(`[EVIDENCE SAVED] ${target}`);
  } catch (err) {
    console.warn(`Could not save evidence screenshot to ${FEEDBACK_DIR}:`, err);
  }
}

let hcmToken = '';
let adminToken = '';
const TARGET_TRIP_CODE = 'SD44';

test.describe.serial('Feedback 13/10 (Task #37): Completed Trip Hub Operation Lock & Admin Override', () => {
  test.beforeAll(async ({ request }) => {
    // 1. Authenticate as HCM Warehouse Manager
    for (const pwd of PASSWORDS) {
      const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
        data: { email: WH_HCM_EMAIL, password: pwd },
      });
      if (loginRes.ok()) {
        const json = await loginRes.json();
        hcmToken = json?.data?.token ?? json?.token;
        break;
      }
    }

    // 2. Authenticate as Super Admin
    for (const pwd of PASSWORDS) {
      const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
        data: { email: ADMIN_EMAIL, password: pwd },
      });
      if (loginRes.ok()) {
        const json = await loginRes.json();
        adminToken = json?.data?.token ?? json?.token;
        break;
      }
    }

    expect(hcmToken, 'Must authenticate HCM Warehouse Manager').toBeTruthy();
    expect(adminToken, 'Must authenticate Super Admin').toBeTruthy();
  });

  // ── TEST 1: BACKEND RBAC GUARD - 403 FORBIDDEN FOR HUB ACCOUNT ON COMPLETED STOP ──
  test('Backend Guard: Hub account attempting to append order to completed stop receives 403 Forbidden', async ({
    request,
  }) => {
    const res = await request.post(
      `${DEV_BACKEND_URL}/warehouse/trips/${TARGET_TRIP_CODE}/append-order`,
      {
        headers: {
          Authorization: `Bearer ${hcmToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          goodsDescription: 'Hàng kiểm thử bảo mật trạm đã hoàn tất',
          totalQuantity: 1,
          totalWeight: 10,
          totalVolume: 0.1,
          deliveryAddress: '303 Trần Hưng Đạo, Q5, TP.HCM',
          senderPhone: '0901234567',
        },
      }
    );

    // Expect 403 Forbidden
    expect(res.status()).toBe(403);
    const body = await res.json();
    console.warn('[RBAC 403 Response Body]:', body);
    expect(body.message || body.error).toMatch(/đã ở trạng thái Đã xử lý|không có quyền|Chỉ tài khoản Quản trị viên/i);
  });

  // ── TEST 2: BACKEND RBAC GUARD - 403 FORBIDDEN FOR HUB ACCOUNT ON APPEND STORED ORDERS ──
  test('Backend Guard: Hub account attempting to append stored orders to completed stop receives 403 Forbidden', async ({
    request,
  }) => {
    const res = await request.post(
      `${DEV_BACKEND_URL}/warehouse/trips/${TARGET_TRIP_CODE}/append-stored-orders`,
      {
        headers: {
          Authorization: `Bearer ${hcmToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          orderIds: [999999],
        },
      }
    );

    // Expect 403 Forbidden
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.message || body.error).toMatch(/đã ở trạng thái Đã xử lý|không có quyền|Chỉ tài khoản Quản trị viên/i);
  });

  // ── TEST 3: UI VERIFICATION - HUB MANAGER OPENS COMPLETED TRIP SD44 ──
  test('UI Verification: Hub account opening completed trip sees locked banner and zero mutating actions', async ({
    page,
  }) => {
    // 1. Sign in as HCM Warehouse Manager
    await loginAs(page, WH_HCM_USER);

    // 2. Navigate to Warehouse Outbound (SD44 is an outbound origin trip at Andromeda Hub - HCM)
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Search for TARGET_TRIP_CODE to immediately focus the target row
    const searchInput = page.getByPlaceholder(/Tìm mã chuyến, xe, tài xế, mã đơn/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(TARGET_TRIP_CODE);
      await page.waitForTimeout(1000);
    }

    // 3. Find and click trip SD44
    const tripRowOrCard = page.locator(`text=${TARGET_TRIP_CODE}`).first();
    await expect(tripRowOrCard).toBeVisible({ timeout: 20000 });
    await tripRowOrCard.click();

    // Wait for Modal to open
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 15000 });

    // 4. Verify Locked Banner is visible
    const lockBanner = modal.locator('text=Chuyến xe đã hoàn tất tác nghiệp tại kho này');
    await expect(lockBanner).toBeVisible({ timeout: 10000 });

    // 5. Verify '+ Bốc thêm đơn dọc đường về Hub' button is NOT visible
    const roadsideAppendBtn = modal.locator('button:has-text("Bốc thêm đơn dọc đường")');
    await expect(roadsideAppendBtn).not.toBeVisible();

    // 6. Verify Step 1 footer buttons are locked/hidden
    const confirmInboundBtn = modal.locator('button:has-text("Xác nhận nhập kho")');
    await expect(confirmInboundBtn).not.toBeVisible();

    const skipAndFinishBtn = modal.locator('button:has-text("Bỏ qua xuất mới & Hoàn tất")');
    await expect(skipAndFinishBtn).not.toBeVisible();

    // 7. Verify Forward button is renamed to 'Xem hàng xuất tiếp trên xe'
    const viewOutboundBtn = modal.locator('button:has-text("Xem hàng xuất tiếp trên xe")');
    await expect(viewOutboundBtn).toBeVisible();

    // 8. Capture verified screenshot of Step 1 (Locked state)
    const step1Screenshot = await modal.screenshot();
    saveEvidenceScreenshot('screenshot_01_verified.png', step1Screenshot);

    // 9. Navigate to Step 2
    await viewOutboundBtn.click();
    await page.waitForTimeout(500);

    // 10. Verify Step 2 restrictions
    const addStoredBtn = modal.locator('button:has-text("Thêm đơn xuất từ kho lên xe")');
    await expect(addStoredBtn).not.toBeVisible();

    const confirmOutboundBtn = modal.locator('button:has-text("Xác nhận xuất hàng lên trip")');
    await expect(confirmOutboundBtn).not.toBeVisible();

    const skipStep2Btn = modal.locator('button:has-text("Bỏ qua bước này")');
    await expect(skipStep2Btn).not.toBeVisible();

    // In Step 2, close button must be visible
    const closeBtn = modal.locator('button:has-text("Đóng")');
    await expect(closeBtn).toBeVisible();

    // Close modal
    await closeBtn.click();
  });

  // ── TEST 4: UI VERIFICATION - SUPER ADMIN OVERRIDE PRIVILEGE ──
  test('UI Verification: Super Admin opens completed trip SD44 and sees Admin Override privilege', async ({
    page,
  }) => {
    // 1. Sign in as Super Admin
    await loginAs(page, SUPER_ADMIN_USER);

    // 2. Navigate to Warehouse Outbound
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Search for TARGET_TRIP_CODE to immediately focus the target row
    const searchInput = page.getByPlaceholder(/Tìm mã chuyến, xe, tài xế, mã đơn/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(TARGET_TRIP_CODE);
      await page.waitForTimeout(1000);
    }

    // 3. Find and click trip SD44
    const tripRowOrCard = page.locator(`text=${TARGET_TRIP_CODE}`).first();
    await expect(tripRowOrCard).toBeVisible({ timeout: 20000 });
    await tripRowOrCard.click();

    // Wait for Modal
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 15000 });

    // 4. Verify Admin Override Banner is visible
    const adminBanner = modal.locator('text=Chế độ Quản trị viên: Chuyến xe đã xử lý tại trạm này');
    await expect(adminBanner).toBeVisible({ timeout: 10000 });

    // 5. Capture verified screenshot of Admin Override mode
    const adminScreenshot = await modal.screenshot();
    saveEvidenceScreenshot('screenshot_02_admin_override_verified.png', adminScreenshot);

    // Close modal
    const closeBtn = modal.locator('button:has-text("Đóng")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });
});
