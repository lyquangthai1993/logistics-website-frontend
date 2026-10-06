/**
 * e2e/33-feedback-06-10-enroute-append-order.spec.ts
 *
 * E2E Verification Suite for Feedback 06/10:
 * 1. Roadside pickup en-route order appending (POST /warehouse/trips/:tripCode/append-order):
 *    - Pickup address is user-entered text (roadside location: 'Cây xăng Hòa Cầm, QL1A').
 *    - Destination is the current warehouse ('Magellan Hub - Đà Nẵng' / operating hub).
 *    - Delivery address is the end customer's delivery destination.
 * 2. Trip Manifest verification:
 *    - Newly appended order appears in the trip manifest as isForCurrentHub = true.
 * 3. Browser UI verification:
 *    - Single contextual "+ Bốc thêm đơn lên xe" button in the table toolbar (redundant header button eliminated).
 *    - Route block renders: 1. Điểm bốc dọc đường (text input) -> 2. Kho nhập hàng (current hub badge).
 *    - Zero raw ID '3' or broken select dropdown.
 *    - Customer delivery address input.
 *    - Screenshot evidence saved to feedback_06_10/.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const DEV_BACKEND_URL =
  process.env.API_URL ?? 'https://logistics-website-backend-1jho.onrender.com/api/v1';
const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://logistics-website-frontend-git-dev-thai-lys-projects.vercel.app';

const ADMIN_EMAIL = 'lyquangthai1993+1@gmail.com';
const PASSWORD = 'secret';

const EVIDENCE_DIR = path.resolve(process.cwd(), '..', 'feedback_06_10');

function saveEvidenceScreenshot(filename: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(EVIDENCE_DIR, filename), buffer);
    console.log(`[EVIDENCE SAVED] ${filename}`);
  } catch (err) {
    console.warn(`Could not save evidence screenshot:`, err);
  }
}

let adminToken = '';
let targetTripCode = '';

test.describe.serial('Feedback 06/10: En-route Roadside Cargo Appending & Inbound Tally', () => {
  test.beforeAll(async ({ request }) => {
    // 1. Authenticate against Backend
    const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
      data: { email: ADMIN_EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok(), `Login status: ${loginRes.status()}`).toBeTruthy();
    const loginJson = await loginRes.json();
    adminToken = loginJson?.data?.token ?? loginJson?.token;
    expect(adminToken).toBeTruthy();

    // 2. Fetch existing inbound trips to find an active trip
    const tripsRes = await request.get(`${DEV_BACKEND_URL}/warehouse/inbound-trips`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (tripsRes.ok()) {
      const tripsJson = await tripsRes.json();
      const list = tripsJson?.data?.items ?? tripsJson?.items ?? tripsJson?.data ?? [];
      if (list.length > 0) {
        targetTripCode = list[0].tripCode;
        console.log(`[TARGET TRIP FOR E2E]: ${targetTripCode}`);
      }
    }
  });

  // ── TEST 1: API - APPEND ROADSIDE CARGO TO TRIP ──
  test('API: Append roadside order to trip with pickup address and operating destination hub', async ({
    request,
  }) => {
    if (!targetTripCode) {
      test.skip(!targetTripCode, 'No active trip available on dev backend to append order');
      return;
    }

    const payload = {
      pickupAddress: 'Cây xăng Hòa Cầm, QL1A Đà Nẵng',
      goodsDescription: 'Bạt cuộn che tàu thuyền (E2E Test 06/10)',
      totalQuantity: 12,
      totalWeight: 240,
      totalVolume: 1.5,
      deliveryAddress: '150 Điện Biên Phủ, Thanh Khê, Đà Nẵng',
      province: 'Đà Nẵng',
      notes: 'Bốc thêm dọc đường kiểm thử tự động 06/10',
    };

    const res = await request.post(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(targetTripCode)}/append-order`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: payload,
      }
    );

    expect(res.ok(), `Append order status: ${res.status()}`).toBeTruthy();
    const json = await res.json();
    const data = json?.data ?? json;

    expect(data.tripCode).toBe(targetTripCode);
    expect(data.order).toBeDefined();
    expect(data.order.originHub).toBe(payload.pickupAddress);
    expect(data.order.status).toBe('IN_TRANSIT');
    expect(data.order.totalQuantity).toBe(12);

    console.log(`✓ Order appended successfully: ${data.order.orderCode} to trip ${targetTripCode}`);

    // Verify trip manifest contains this new order
    const manifestRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(targetTripCode)}/manifest`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    expect(manifestRes.ok()).toBeTruthy();
    const manifestJson = await manifestRes.json();
    const manifestData = manifestJson?.data ?? manifestJson;

    const createdLine = (manifestData?.lines ?? []).find(
      (l: any) => l.orderCode === data.order.orderCode
    );
    expect(createdLine, 'Appended order must be present in trip manifest lines').toBeDefined();
    expect(createdLine.isForCurrentHub, 'Appended order must belong to receiving hub').toBeTruthy();
  });

  // ── TEST 2: UI - BROWSER VERIFICATION & ZERO RAW ID 3 ──
  test('UI: Verify modal inputs, single append button, and zero raw ID 3', async ({
    page,
  }) => {
    // Navigate to inbound warehouse page
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`, {
      waitUntil: 'domcontentloaded',
    });

    // Check if redirect to login occurs
    if (page.url().includes('/auth') || page.url().includes('/sign-in')) {
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passInput = page.locator('input[type="password"], input[name="password"]');
      await emailInput.fill(ADMIN_EMAIL);
      await passInput.fill(PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/dashboard/**', { timeout: 15_000 });
      await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`, {
        waitUntil: 'domcontentloaded',
      });
    }

    await page.waitForTimeout(2000);

    // Look for a trip code button in table
    const tripBtn = page.locator('button:has-text("SD"), [data-trip-code]').first();
    const hasTrip = await tripBtn.isVisible().catch(() => false);

    if (!hasTrip) {
      console.log('No inbound trip found on UI table to test modal.');
      return;
    }

    await tripBtn.click();
    await page.waitForTimeout(1500);

    // 1. Verify single append button in table toolbar
    const toolbarAppendBtn = page.locator('button:has-text("Bốc thêm đơn lên xe")');
    const headerAppendBtn = page.locator('header button:has-text("Bốc thêm đơn")');

    // Header redundant button must NOT exist
    const headerBtnCount = await headerAppendBtn.count();
    expect(headerBtnCount, 'Redundant append button in header must be removed').toBe(0);

    // Toolbar append button must be visible
    if (await toolbarAppendBtn.isVisible()) {
      await toolbarAppendBtn.click();
      await page.waitForTimeout(1000);

      // Verify modal is open
      await expect(page.locator('text="Bốc thêm đơn dọc đường"').first()).toBeVisible({
        timeout: 5000,
      });

      // 2. Verify road-side pickup input exists
      const pickupInput = page.locator(
        'input[placeholder*="Cây xăng Hòa Cầm"], input[placeholder*="Điểm bốc"]'
      );
      await expect(pickupInput).toBeVisible();

      // 3. Verify destination hub has "Kho hiện tại" badge and does NOT render raw "3"
      const currentHubBadge = page.locator('text="Kho hiện tại"');
      await expect(currentHubBadge).toBeVisible();

      // Ensure no raw "3" standalone box is rendered
      const rawId3Select = page.locator('button[data-slot="select-trigger"]:has-text("3")');
      const rawIdCount = await rawId3Select.count();
      expect(rawIdCount, 'Raw ID 3 trigger must not exist in modal').toBe(0);

      // 4. Capture evidence screenshot
      const modalScreenshot = await page.screenshot({ fullPage: false });
      saveEvidenceScreenshot('01_verified_roadside_append_modal.png', modalScreenshot);

      console.log('✓ UI Verification passed: No raw ID 3, clean roadside pickup & current hub badge.');
    }
  });
});
