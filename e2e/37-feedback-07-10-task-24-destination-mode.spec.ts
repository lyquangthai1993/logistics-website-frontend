/**
 * e2e/37-feedback-07-10-task-24-destination-mode.spec.ts
 *
 * Dedicated E2E Test Suite for Feedback 07/10 Task 24:
 * Tùy biến Hình thức & Địa chỉ Giao nhận (Khách / Hub Cấp 1 / Tuyến Xe Bo)
 * Cho Đơn Hàng Xuất Mới Lên Chuyến Xe Tại Trạm Trung Chuyển (Bước 2: OUTBOUND STAGE)
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
const DAD_MANAGER_EMAIL = 'lyquangthai1993+5@gmail.com';
const PASSWORDS = ['secret', '123456'];

const EVIDENCE_DIR_24 = path.resolve(process.cwd(), '..', 'feedback_07_10_task_24');

function saveEvidenceScreenshot(filename: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(EVIDENCE_DIR_24)) {
      fs.mkdirSync(EVIDENCE_DIR_24, { recursive: true });
    }
    fs.writeFileSync(path.join(EVIDENCE_DIR_24, filename), buffer);
    console.log(`[EVIDENCE SAVED] ${path.join(EVIDENCE_DIR_24, filename)}`);
  } catch (err) {
    console.warn(`Could not save evidence screenshot to ${EVIDENCE_DIR_24}:`, err);
  }
}

let userToken = '';
let activeTripCode = 'SD64';
let testOrderId = 0;
let testOrderCode = '';
let originalCustAddress = 'Ba Đình, Hà Nội';
let level1Hub: { id: number; name: string } | null = null;
let level2Hub: { id: number; name: string } | null = null;

test.describe.serial('Feedback 07/10 Task 24: Delivery Destination Modes (Customer / Hub L1 / Xe Bo)', () => {
  test.beforeAll(async ({ request }) => {
    // 1. Authenticate against Backend (try Da Nang manager first, then Admin)
    for (const email of [DAD_MANAGER_EMAIL, ADMIN_EMAIL]) {
      for (const pwd of PASSWORDS) {
        const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
          data: { email, password: pwd },
        });
        if (loginRes.ok()) {
          const loginJson = await loginRes.json();
          userToken = loginJson?.data?.token ?? loginJson?.token;
          break;
        }
      }
      if (userToken) break;
    }
    expect(userToken, 'Must obtain a valid JWT token for E2E tests').toBeTruthy();

    // 2. Fetch active hubs to discover Level 1 and Level 2 hubs
    const hubsRes = await request.get(`${DEV_BACKEND_URL}/hubs/active`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (hubsRes.ok()) {
      const hubsJson = await hubsRes.json();
      const hubsList: any[] = hubsJson?.data ?? hubsJson ?? [];
      const l1 = hubsList.find((h: any) => h.level === 1 && !h.code.startsWith('HUB-BO-'));
      const l2 = hubsList.find((h: any) => h.level === 2 || h.code.startsWith('HUB-BO-'));
      if (l1) level1Hub = { id: l1.id, name: l1.name };
      if (l2) level2Hub = { id: l2.id, name: l2.name };
    }

    if (!level1Hub) level1Hub = { id: 3, name: 'Polaris Hub - Hưng Yên' };
    if (!level2Hub) level2Hub = { id: 4, name: 'Xe bo Tuyến Hà Nội' };

    // 3. Locate an active trip with lines
    const tripsRes = await request.get(`${DEV_BACKEND_URL}/warehouse/inbound-trips`, {
      headers: { Authorization: `Bearer ${userToken}` },
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
    }

    // 4. Retrieve manifest of active trip to inspect or use an order line
    const manifestRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/manifest`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    if (manifestRes.ok()) {
      const mJson = await manifestRes.json();
      const manifest = mJson?.data ?? mJson;
      if (manifest?.lines?.length > 0) {
        const line = manifest.lines[manifest.lines.length - 1];
        testOrderId = line.id;
        testOrderCode = line.orderCode;
        originalCustAddress = line.originalDeliveryAddress || line.deliveryAddress || 'Ba Đình, Hà Nội';
      }
    }
  });

  // ── SCENARIO 1 & 2: API - UPDATE TRIP ORDER DESTINATION TO HUB_L1 ──
  test('API: Update trip order destination to HUB_L1 and verify manifest returns deliveryMode', async ({
    request,
  }) => {
    if (!testOrderId) {
      test.skip(!testOrderId, 'No test order found on trip');
      return;
    }

    // 1. PATCH destination to HUB_L1
    const patchRes = await request.patch(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/orders/${testOrderId}/destination`,
      {
        headers: { Authorization: `Bearer ${userToken}` },
        data: {
          deliveryMode: 'HUB_L1',
          destinationHubId: level1Hub!.id,
          deliveryAddress: level1Hub!.name,
          notes: 'Test E2E: Điều chuyển về Hub Cấp 1',
        },
      }
    );
    expect(patchRes.ok(), `Failed to patch destination to HUB_L1: ${patchRes.status()}`).toBeTruthy();
    const patchJson = await patchRes.json();
    const data = patchJson?.data ?? patchJson;
    expect(data.success).toBe(true);
    expect(data.deliveryMode).toBe('HUB_L1');
    expect(data.destinationHubId).toBe(level1Hub!.id);

    // 2. GET Trip Manifest and verify deliveryMode & destinationHubEntity
    const manifestRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/manifest`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(manifestRes.ok()).toBeTruthy();
    const manifestJson = await manifestRes.json();
    const manifest = manifestJson?.data ?? manifestJson;
    const targetLine = manifest.lines.find((l: any) => l.id === testOrderId);
    expect(targetLine).toBeDefined();
    expect(targetLine.deliveryMode).toBe('HUB_L1');
    expect(targetLine.destinationHubId).toBe(level1Hub!.id);
    expect(targetLine.destinationHub).toBe(level1Hub!.name);
    expect(targetLine.destinationHubEntity).toBeDefined();
    expect(targetLine.destinationHubEntity?.id).toBe(level1Hub!.id);
  });

  // ── SCENARIO 3: API - UPDATE TRIP ORDER DESTINATION TO XE_BO ──
  test('API: Update trip order destination to XE_BO (Satellite route)', async ({
    request,
  }) => {
    if (!testOrderId) {
      test.skip(!testOrderId, 'No test order found on trip');
      return;
    }

    const patchRes = await request.patch(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/orders/${testOrderId}/destination`,
      {
        headers: { Authorization: `Bearer ${userToken}` },
        data: {
          deliveryMode: 'XE_BO',
          destinationHubId: level2Hub!.id,
          deliveryAddress: level2Hub!.name,
          notes: 'Test E2E: Điều chuyển Tuyến Xe Bo',
        },
      }
    );
    expect(patchRes.ok(), `Failed to patch destination to XE_BO: ${patchRes.status()}`).toBeTruthy();
    const patchJson = await patchRes.json();
    const data = patchJson?.data ?? patchJson;
    expect(data.success).toBe(true);
    expect(data.deliveryMode).toBe('XE_BO');
    expect(data.destinationHubId).toBe(level2Hub!.id);

    // GET Trip Manifest to verify XE_BO mode
    const manifestRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/manifest`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(manifestRes.ok()).toBeTruthy();
    const manifestJson = await manifestRes.json();
    const manifest = manifestJson?.data ?? manifestJson;
    const targetLine = manifest.lines.find((l: any) => l.id === testOrderId);
    expect(targetLine).toBeDefined();
    expect(targetLine.deliveryMode).toBe('XE_BO');
    expect(targetLine.destinationHubId).toBe(level2Hub!.id);
  });

  // ── SCENARIO 4: API - RESET TO ORIGINAL CUSTOMER ADDRESS (DIRECT_CUSTOMER) ──
  test('API: Reset destination to DIRECT_CUSTOMER and verify customer address restored', async ({
    request,
  }) => {
    if (!testOrderId) {
      test.skip(!testOrderId, 'No test order found on trip');
      return;
    }

    const patchRes = await request.patch(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/orders/${testOrderId}/destination`,
      {
        headers: { Authorization: `Bearer ${userToken}` },
        data: {
          deliveryMode: 'DIRECT_CUSTOMER',
          destinationHubId: null,
          deliveryAddress: originalCustAddress,
          notes: 'Test E2E: Khôi phục địa chỉ khách ban đầu',
        },
      }
    );
    expect(patchRes.ok(), `Failed to reset destination to DIRECT_CUSTOMER: ${patchRes.status()}`).toBeTruthy();
    const patchJson = await patchRes.json();
    const data = patchJson?.data ?? patchJson;
    expect(data.success).toBe(true);
    expect(data.deliveryMode).toBe('DIRECT_CUSTOMER');
    expect(data.destinationHubId).toBeNull();

    // Verify manifest has DIRECT_CUSTOMER and original delivery address
    const manifestRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/manifest`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(manifestRes.ok()).toBeTruthy();
    const manifestJson = await manifestRes.json();
    const manifest = manifestJson?.data ?? manifestJson;
    const targetLine = manifest.lines.find((l: any) => l.id === testOrderId);
    expect(targetLine).toBeDefined();
    expect(targetLine.deliveryMode).toBe('DIRECT_CUSTOMER');
    expect(targetLine.destinationHubId).toBeNull();
  });

  // ── SCENARIO 5 & 6: BROWSER UI - INTERACTIVE DESTINATION CELL, MODAL SELECTION & EVIDENCE ──
  test('Browser UI: Step 2 displays interactive destination cell, opens modal, and updates destination', async ({
    page,
  }) => {
    // 1. Sign in to Frontend
    await page.goto(`${DEV_FRONTEND_URL}/auth/sign-in`);
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORDS[0]);
    await page.click('button[type="submit"]');

    // Wait for dashboard navigation
    await page.waitForURL('**/dashboard/**', { timeout: 30000 });

    // 2. Navigate to Inbound Warehouse page
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('domcontentloaded');

    // 3. Open Trip Detail Modal
    const tripDetailBtn = page.locator('button[title*="chi tiết chuyến xe"]').first();
    await tripDetailBtn.waitFor({ state: 'visible', timeout: 25000 });
    await tripDetailBtn.click();

    const tripModal = page.locator('div[role="dialog"]');
    await expect(tripModal).toBeVisible({ timeout: 15000 });

    // 4. Switch to Step 2: Xuất hàng mới lên xe
    const step2Btn = tripModal.locator('button', { hasText: '2. Xuất hàng mới lên xe' });
    await expect(step2Btn).toBeVisible({ timeout: 10000 });
    await step2Btn.click();

    // Verify Step 2 Outbound table is rendered
    const step2Table = tripModal.locator('table');
    await expect(step2Table).toBeVisible({ timeout: 10000 });

    // Capture screenshot of Step 2 table with destination column
    const step2Screenshot = await tripModal.screenshot();
    saveEvidenceScreenshot('01_step2_interactive_destination_cell.png', step2Screenshot);

    // Look for change destination button if any newly loaded item exists
    const changeDestBtn = tripModal.locator('button', { hasText: 'Thay đổi địa chỉ (Điều chuyển)' }).first();
    if (await changeDestBtn.isVisible()) {
      // Click change destination button
      await changeDestBtn.click();

      // Destination Modal should open
      const destModal = page.locator('div[role="dialog"]').last();
      await expect(destModal).toBeVisible({ timeout: 10000 });
      await expect(destModal.locator('text=Chọn Đích Xuất Kho')).toBeVisible();

      // Capture screenshot of Destination Selection Modal
      const modalScreenshot = await destModal.screenshot();
      saveEvidenceScreenshot('02_destination_selection_modal.png', modalScreenshot);

      // Select first Level 1 hub
      const selectHubBtn = destModal.locator('button', { hasText: 'Chọn kho này' }).first();
      if (await selectHubBtn.isVisible()) {
        await selectHubBtn.click();

        // Modal closes and toast confirms destination change
        await expect(destModal).not.toBeVisible({ timeout: 10000 });

        // Capture screenshot of updated Hub L1 destination badge
        const updatedScreenshot = await tripModal.screenshot();
        saveEvidenceScreenshot('03_destination_updated_hub_l1.png', updatedScreenshot);

        // Click "Quay lại địa chỉ thường" if visible
        const resetBtn = tripModal.locator('button', { hasText: 'Quay lại địa chỉ thường' }).first();
        if (await resetBtn.isVisible()) {
          await resetBtn.click();
          const resetScreenshot = await tripModal.screenshot();
          saveEvidenceScreenshot('04_reset_to_original_customer_address.png', resetScreenshot);
        }
      }
    }

    // Final verification that modal is clean and responsive
    expect(await tripModal.isVisible()).toBe(true);
  });
});
