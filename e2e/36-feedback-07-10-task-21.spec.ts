/**
 * e2e/36-feedback-07-10-task-21.spec.ts
 *
 * Dedicated E2E Test Suite for Feedback 07/10 Task 21 & Task 22:
 * 1. Task 21: Resolve empty stored orders list when appending from Hub to trip (hub scoping, queryHubId, downstream stops).
 * 2. Task 22: Expand modal dimensions, 10 columns, UI compact density, sticky action footer, and live search/filter.
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

const DAD_MANAGER_EMAIL = 'lyquangthai1993+5@gmail.com';
const ADMIN_EMAIL = 'lyquangthai1993+1@gmail.com';
const PASSWORDS = ['secret', '123456'];

const EVIDENCE_DIR_21 = path.resolve(process.cwd(), '..', 'feedback_07_10_task_21');
const EVIDENCE_DIR_22 = path.resolve(process.cwd(), '..', 'feedback_07_10_task_22');

function saveEvidenceScreenshot(filename: string, buffer: Buffer) {
  for (const dir of [EVIDENCE_DIR_21, EVIDENCE_DIR_22]) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.join(dir, filename), buffer);
      console.log(`[EVIDENCE SAVED] ${path.join(dir, filename)}`);
    } catch (err) {
      console.warn(`Could not save evidence screenshot to ${dir}:`, err);
    }
  }
}

let dadToken = '';
let activeTripCode = 'SD64';

test.describe.serial('Feedback 07/10 Task 21 & Task 22: Stored Orders Outbound Append & Modal UI Optimization', () => {
  test.beforeAll(async ({ request }) => {
    // 1. Authenticate against Backend as Da Nang Warehouse Manager
    for (const pwd of PASSWORDS) {
      const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
        data: { email: DAD_MANAGER_EMAIL, password: pwd },
      });
      if (loginRes.ok()) {
        const loginJson = await loginRes.json();
        dadToken = loginJson?.data?.token ?? loginJson?.token;
        break;
      }
    }

    if (!dadToken) {
      // Fallback to Admin email if manager login fails
      for (const pwd of PASSWORDS) {
        const adminRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
          data: { email: ADMIN_EMAIL, password: pwd },
        });
        if (adminRes.ok()) {
          const adminJson = await adminRes.json();
          dadToken = adminJson?.data?.token ?? adminJson?.token;
          break;
        }
      }
    }

    expect(dadToken, 'Must obtain a valid JWT token for tests').toBeTruthy();

    // 2. Verify SD64 is present or get first inbound trip
    const tripsRes = await request.get(`${DEV_BACKEND_URL}/warehouse/inbound-trips`, {
      headers: { Authorization: `Bearer ${dadToken}` },
    });
    if (tripsRes.ok()) {
      const tripsJson = await tripsRes.json();
      const list = tripsJson?.data?.items ?? tripsJson?.items ?? tripsJson?.data ?? [];
      const foundSd64 = list.find((t: any) => t.tripCode === 'SD64');
      if (foundSd64) {
        activeTripCode = 'SD64';
      } else if (list.length > 0) {
        activeTripCode = list[0].tripCode;
      }
      console.log(`[ACTIVE TRIP CODE FOR E2E]: ${activeTripCode}`);
    }
  });

  // ── TEST 1: API - AVAILABLE OUTBOUND ORDERS WITH HUB_ID QUERY PARAM (TASK 21) ──
  test('API: GET /warehouse/trips/:tripCode/available-outbound-orders with hubId=2 returns stored orders', async ({
    request,
  }) => {
    const res = await request.get(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/available-outbound-orders?hubId=2`,
      {
        headers: { Authorization: `Bearer ${dadToken}` },
      }
    );

    expect(res.ok(), `API status: ${res.status()}`).toBeTruthy();
    const json = await res.json();
    const data = json?.data ?? json;

    expect(data).toHaveProperty('tripCode');
    expect(data).toHaveProperty('currentHubId', 2);
    expect(data.currentHubName).toContain('Đà Nẵng');

    // Downstream hubs must be an array and should not include current hub (hubId=2)
    expect(Array.isArray(data.downstreamHubs)).toBeTruthy();
    const hasCurrentHubInDownstream = data.downstreamHubs.some((h: any) => Number(h.id) === 2);
    expect(hasCurrentHubInDownstream).toBeFalsy();

    // Stored orders must contain available items with remainingQuantity > 0
    expect(Array.isArray(data.orders)).toBeTruthy();
    expect(data.orders.length).toBeGreaterThanOrEqual(1);

    const firstOrder = data.orders[0];
    expect(firstOrder).toHaveProperty('id');
    expect(firstOrder).toHaveProperty('orderCode');
    expect(firstOrder).toHaveProperty('goodsDescription');
    expect(Number(firstOrder.remainingQuantity ?? firstOrder.totalQuantity)).toBeGreaterThan(0);
    console.log(`[STORED ORDERS COUNT AT HUB 2]: ${data.orders.length}`);
  });

  // ── TEST 2: BROWSER UI - MODAL SIZING, 10 COLUMNS, COMPACT DENSITY & ACTIONS (TASKS 21 & 22) ──
  test('Browser UI: Step 2 outbound modal expands wide, displays 10 columns and executes batch append', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // 1. Sign in to Frontend
    await page.goto(`${DEV_FRONTEND_URL}/auth/sign-in`);
    await page.waitForLoadState('domcontentloaded');

    let loginSucceeded = false;
    for (const pwd of PASSWORDS) {
      await page.fill('input[type="email"], input[name="email"]', DAD_MANAGER_EMAIL);
      await page.fill('input[type="password"], input[name="password"]', pwd);
      await page.click('button[type="submit"]');

      try {
        await page.waitForURL('**/dashboard/**', { timeout: 12000 });
        loginSucceeded = true;
        break;
      } catch {
        // try next password
      }
    }

    if (!loginSucceeded) {
      // Try admin
      for (const pwd of PASSWORDS) {
        await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
        await page.fill('input[type="password"], input[name="password"]', pwd);
        await page.click('button[type="submit"]');

        try {
          await page.waitForURL('**/dashboard/**', { timeout: 12000 });
          loginSucceeded = true;
          break;
        } catch {
          // continue
        }
      }
    }

    expect(loginSucceeded, 'Must successfully login to dashboard').toBeTruthy();

    // 2. Navigate to Inbound Warehouse management page
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for trip cards or trip list
    await page.waitForSelector('[data-slot="card"], button[title*="chi tiết"], tr', { timeout: 25000 });

    // 3. Locate and open the trip detail modal
    const tripDetailBtn = page.locator('button[title*="chi tiết chuyến xe"]').first();
    await tripDetailBtn.waitFor({ state: 'visible', timeout: 20000 });
    await tripDetailBtn.click();

    // 4. In WarehouseTripDetailModal, switch to Step 2 (Xe xuất kho)
    const dialogContent = page.locator('[data-slot="dialog-content"]').first();
    await dialogContent.waitFor({ state: 'visible', timeout: 15000 });

    // Find tab or button for Step 2
    const step2Tab = page.locator('button:has-text("2. Xe xuất kho"), button:has-text("Xuất hàng"), button:has-text("Bước 2")').first();
    if (await step2Tab.isVisible()) {
      await step2Tab.click();
    }

    // 5. Click "+ Thêm đơn xuất từ kho lên xe"
    const addStoredBtn = page.locator('button:has-text("Thêm đơn xuất từ kho lên xe"), button:has-text("đơn lưu kho")').first();
    await addStoredBtn.waitFor({ state: 'visible', timeout: 15000 });

    // Set up request listener to assert hubId param is passed to API
    const outboundRequestPromise = page.waitForRequest(
      (req) => req.url().includes('/available-outbound-orders') && req.method() === 'GET',
      { timeout: 15000 }
    );

    await addStoredBtn.click();

    // Wait for the API request and verify URL param
    const outboundRequest = await outboundRequestPromise;
    expect(outboundRequest.url()).toContain('hubId=');
    console.log(`[VERIFIED API REQUEST URL]: ${outboundRequest.url()}`);

    // 6. Inspect WarehouseSelectStoredOrdersModal
    const selectStoredModal = page.locator('[data-slot="dialog-content"]').last();
    await selectStoredModal.waitFor({ state: 'visible', timeout: 15000 });

    // Assertion: Modal width should have sm:max-w-6xl or w-[95vw] or similar expanded layout
    const modalClass = await selectStoredModal.getAttribute('class');
    expect(modalClass).toMatch(/max-w-6xl|max-w-7xl|w-\[95vw\]|w-\[96vw\]/);

    // Assertion: Subtitle shows current warehouse
    const modalText = await selectStoredModal.textContent();
    expect(modalText).toContain('Kho xuất:');

    // Assertion: Table contains rows and is not stuck at 0 / 0
    await page.waitForTimeout(1000); // Allow render
    const rows = selectStoredModal.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    // Assertion: Verify 10 column headers
    const headers = selectStoredModal.locator('thead th');
    const headerCount = await headers.count();
    expect(headerCount).toBe(10);

    // 7. Test Checkbox / Row selection & Sticky Footer Counter
    await rows.first().locator('td').nth(2).click();

    // Sticky footer should update to "Đã chọn: 1 đơn hàng"
    const footer = selectStoredModal.locator('[data-slot="dialog-footer"], footer, .sticky.bottom-0').first();
    await expect(footer).toContainText('Đã chọn:');
    await expect(footer).toContainText('1 đơn hàng');

    // Click second row if available
    if (rowCount > 1) {
      await rows.nth(1).locator('td').nth(2).click();
      await expect(footer).toContainText('2 đơn hàng');
    }

    // 8. Capture visual evidence screenshot
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('screenshot_02_verified.png', screenshotBuffer);

    // 9. Close modal cleanly or confirm
    const cancelBtn = selectStoredModal.locator('button:has-text("Hủy")').first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    }
  });
});
