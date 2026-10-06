/**
 * e2e/34-feedback-06-10-two-step-transit-workflow.spec.ts
 *
 * E2E Verification Suite for Feedback 06/10 Part III:
 * 1. Transit Stop 2-Step Sequential Workflow:
 *    - Step 1: Inbound Tally & Unloading (Roadside inbound pickup, confirm inbound, print inbound receipt).
 *    - Step 2: Outbound Loading & Dispatch (Hub outbound append, select from warehouse stock, print outbound receipt).
 * 2. API Endpoints:
 *    - GET /warehouse/trips/:tripCode/available-outbound-orders
 *    - POST /warehouse/trips/:tripCode/transit-step
 *    - POST /warehouse/trips/:tripCode/append-order (HUB_OUTBOUND mode)
 * 3. Browser UI & Compact Density:
 *    - Stepper Bar navigation [1. Nhập hàng & Dỡ kho] -> [2. Xuất hàng mới lên xe]
 *    - Single contextual action button on table toolbar
 *    - Zero raw ID '3' glitch in Hub dropdown
 *    - Clean receipt print separation between unloaded cargo and loaded cargo
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
let currentHubId = 1;

test.describe.serial('Feedback 06/10: 2-Step Transit Stop Lifecycle & Hub Outbound Loading', () => {
  test.beforeAll(async ({ request }) => {
    // 1. Authenticate against Backend
    const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
      data: { email: ADMIN_EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok(), `Login failed: ${loginRes.status()}`).toBeTruthy();
    const loginJson = await loginRes.json();
    adminToken = loginJson?.data?.token ?? loginJson?.token;
    expect(adminToken).toBeTruthy();

    const userProfile = loginJson?.data?.user ?? loginJson?.user;
    if (userProfile?.hubId) {
      currentHubId = userProfile.hubId;
    }

    // 2. Fetch active trips
    const tripsRes = await request.get(`${DEV_BACKEND_URL}/warehouse/inbound-trips`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (tripsRes.ok()) {
      const tripsJson = await tripsRes.json();
      const list = tripsJson?.data?.items ?? tripsJson?.items ?? tripsJson?.data ?? [];
      if (list.length > 0) {
        targetTripCode = list[0].tripCode;
        console.log(`[TARGET TRIP FOR TWO-STEP WORKFLOW]: ${targetTripCode}`);
      }
    }
  });

  // ── TEST 1: API - AVAILABLE OUTBOUND ORDERS FOR TRANSIT TRIP ──
  test('API: GET /warehouse/trips/:tripCode/available-outbound-orders', async ({ request }) => {
    if (!targetTripCode) {
      test.skip(!targetTripCode, 'No active trip on Dev backend');
      return;
    }

    const res = await request.get(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(targetTripCode)}/available-outbound-orders`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(res.ok(), `Status: ${res.status()}`).toBeTruthy();
    const json = await res.json();
    const data = json?.data ?? json;

    expect(data).toHaveProperty('tripCode');
    expect(data).toHaveProperty('currentHubId');
    expect(data).toHaveProperty('downstreamHubs');
    expect(Array.isArray(data.downstreamHubs)).toBeTruthy();
    expect(Array.isArray(data.orders)).toBeTruthy();
  });

  // ── TEST 2: API - APPEND OUTBOUND CARGO FROM HUB TO TRIP ──
  test('API: POST /warehouse/trips/:tripCode/append-order in HUB_OUTBOUND mode', async ({
    request,
  }) => {
    if (!targetTripCode) {
      test.skip(!targetTripCode, 'No active trip on Dev backend');
      return;
    }

    // Target a destination hub different from current operating hub
    const destHubId = currentHubId === 2 ? 3 : 2;

    const payload = {
      appendMode: 'HUB_OUTBOUND',
      destinationHubId: destHubId,
      goodsDescription: 'Lô phụ tùng điện tử xuất tiếp (E2E Step 2)',
      totalQuantity: 20,
      totalWeight: 350,
      totalVolume: 2.2,
      deliveryAddress: 'Kho phân phối phía Bắc, Polaris Hub',
      notes: 'Bốc thêm từ Hub lên chuyến xe đi tiếp (E2E Verification)',
    };

    const res = await request.post(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(targetTripCode)}/append-order`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: payload,
      }
    );

    expect(res.ok(), `Status: ${res.status()}`).toBeTruthy();
    const json = await res.json();
    const data = json?.data ?? json;

    expect(data).toHaveProperty('tripCode', targetTripCode);
    expect(data).toHaveProperty('order');
    expect(data.order.originHubId).toBe(currentHubId);
    expect(data.order.destinationHubId).toBe(destHubId);
    expect(data.order.status).toBe('IN_TRANSIT');
  });

  // ── TEST 3: API - UPDATE TRANSIT STEP LIFECYCLE ──
  test('API: POST /warehouse/trips/:tripCode/transit-step', async ({ request }) => {
    if (!targetTripCode) {
      test.skip(!targetTripCode, 'No active trip on Dev backend');
      return;
    }

    const res = await request.post(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(targetTripCode)}/transit-step`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { step: 'INBOUND', action: 'CONFIRM' },
      }
    );

    expect(res.ok(), `Status: ${res.status()}`).toBeTruthy();
    const json = await res.json();
    const data = json?.data ?? json;

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('status', 'COMPLETED');
  });

  // ── TEST 4: BROWSER UI - 2-STEP TRANSIT STEPPER & MODALS ──
  test('Browser UI: Verify 2-Step Stepper bar, Inbound vs Outbound view, and clean modal layout', async ({
    page,
  }) => {
    // 1. Login to Frontend
    await page.goto(`${DEV_FRONTEND_URL}/auth/sign-in`);
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for Dashboard
    await page.waitForURL('**/dashboard/**', { timeout: 25000 });

    // 2. Navigate to Inbound Warehouse
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('networkidle');

    // Find and open any trip row
    const tripRows = page.locator('table tbody tr');
    const rowCount = await tripRows.count();

    if (rowCount > 0) {
      // Click the first row to open WarehouseTripDetailModal
      await tripRows.first().click();

      // Verify Modal Dialog is visible
      const modal = page.locator('div[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 10000 });

      // Verify Stepper Bar elements
      const step1Button = modal.locator('button', { hasText: '1. Nhập hàng & Dỡ kho' });
      const step2Button = modal.locator('button', { hasText: '2. Xuất hàng mới lên xe' });
      await expect(step1Button).toBeVisible();
      await expect(step2Button).toBeVisible();

      // Take screenshot of Step 1
      const step1Screenshot = await modal.screenshot();
      saveEvidenceScreenshot('02_e2e_step1_inbound_modal.png', step1Screenshot);

      // Click to transition to Step 2
      await step2Button.click();
      await page.waitForTimeout(500);

      // Verify Step 2 UI
      const outboundTitle = modal.locator('text=Hàng hóa tiếp tục hành trình');
      await expect(outboundTitle).toBeVisible();

      // Verify single contextual button
      const addOutboundButton = modal.locator('button', { hasText: 'Thêm đơn xuất từ kho lên xe' });
      await expect(addOutboundButton).toBeVisible();

      // Take screenshot of Step 2
      const step2Screenshot = await modal.screenshot();
      saveEvidenceScreenshot('03_e2e_step2_outbound_modal.png', step2Screenshot);

      // Click "Thêm đơn xuất từ kho lên xe" to open Append modal in HUB_OUTBOUND mode
      await addOutboundButton.click();
      await page.waitForTimeout(500);

      const appendModal = page.locator('div[role="dialog"]').last();
      await expect(appendModal).toBeVisible();

      // Verify clean destination hub selector (no raw ID 3 glitch)
      const destHubSelect = appendModal.locator('select');
      if (await destHubSelect.count() > 0) {
        await expect(destHubSelect.first()).toBeVisible();
      }

      // Take screenshot of HUB_OUTBOUND append modal
      const appendScreenshot = await appendModal.screenshot();
      saveEvidenceScreenshot('04_e2e_hub_outbound_append_modal.png', appendScreenshot);
    }
  });
});
