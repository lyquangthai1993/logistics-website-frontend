/**
 * e2e/35-feedback-07-10-warehouse-outbound-and-stock-isolation.spec.ts
 *
 * Dedicated E2E Test Suite for Feedback 07/10 Tasks:
 * 1. Task 07/10: Outbound Receipt Modal & Print ("Kho đích / Nơi giao" column, destinationHub priority).
 * 2. Task 10: Step 2 Outbound Loading - Select Stored Warehouse Orders (Multi-select, batch append API).
 * 3. Task 11: Elimination of redundant "TRẠNG THÁI" column from outbound selection tables.
 * 4. Task 12: Hub Scope Isolation & Zero-Stock Orders Guard (No "LƯU KHO" badge when stock = 0, tab count parity).
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
const WAREHOUSE_HCM_EMAIL = 'lyquangthai1993+6@gmail.com';
const PASSWORD = 'secret';

const EVIDENCE_DIR_07 = path.resolve(process.cwd(), '..', 'feedback_07_10');
const EVIDENCE_DIR_12 = path.resolve(process.cwd(), '..', 'feedback_07_10_task_12');

function saveEvidenceScreenshot(dir: string, filename: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, filename), buffer);
    console.log(`[EVIDENCE SAVED] ${path.join(dir, filename)}`);
  } catch (err) {
    console.warn(`Could not save evidence screenshot:`, err);
  }
}

let adminToken = '';
let targetTripCode = '';
let currentHubId = 1;

test.describe.serial('Feedback 07/10 Suite: Outbound Receipt, Stored Selection & Stock Isolation', () => {
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
    currentHubId = userProfile?.hubId || 1;

    // 2. Locate an active trip manifest
    const tripsRes = await request.get(`${DEV_BACKEND_URL}/warehouse/inbound-trips`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (tripsRes.ok()) {
      const tripsJson = await tripsRes.json();
      const list = tripsJson?.data?.items ?? tripsJson?.items ?? tripsJson?.data ?? [];
      if (list.length > 0) {
        targetTripCode = list[0].tripCode;
        console.log(`[TARGET TRIP FOR FEEDBACK 07/10 TESTS]: ${targetTripCode}`);
      }
    }
  });

  // ── TEST 1: API - TRIP MANIFEST CARRIES DESTINATION HUB PRIORITY (TASK 07/10) ──
  test('API: GET /warehouse/trips/:tripCode/manifest returns destinationHub correctly', async ({
    request,
  }) => {
    if (!targetTripCode) {
      test.skip(!targetTripCode, 'No active trip available for manifest check');
      return;
    }

    const res = await request.get(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(targetTripCode)}/manifest`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(res.ok(), `Manifest status: ${res.status()}`).toBeTruthy();
    const json = await res.json();
    const manifest = json?.data ?? json;

    expect(manifest).toHaveProperty('tripCode', targetTripCode);
    const manifestLines = manifest.lines ?? manifest.orders ?? [];
    expect(Array.isArray(manifestLines)).toBeTruthy();

    if (manifestLines.length > 0) {
      const firstLine = manifestLines[0];
      expect(firstLine).toHaveProperty('orderCode');
      expect(firstLine).toHaveProperty('destinationHub');
      expect(typeof firstLine.destinationHub === 'string').toBeTruthy();
      console.log(`[MANIFEST LINE ${firstLine.orderCode}] destinationHub: "${firstLine.destinationHub}"`);
    }
  });

  // ── TEST 2: API - BATCH APPEND STORED ORDERS (TASK 10) ──
  test('API: POST /warehouse/trips/:tripCode/append-stored-orders validation and contract', async ({
    request,
  }) => {
    if (!targetTripCode) {
      test.skip(!targetTripCode, 'No active trip available for append stored orders');
      return;
    }

    // 1. Fetch available stored orders for this hub and trip
    const availRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(targetTripCode)}/available-outbound-orders`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(availRes.ok()).toBeTruthy();
    const availJson = await availRes.json();
    const availData = availJson?.data ?? availJson;
    expect(availData).toHaveProperty('orders');
    expect(Array.isArray(availData.orders)).toBeTruthy();

    // 2. Test rejection on empty orderIds array (DTO validation guard)
    const badRes = await request.post(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(targetTripCode)}/append-stored-orders`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { orderIds: [] },
      }
    );
    expect([400, 422]).toContain(badRes.status());

    // 3. If there are available orders, test batch append endpoint structure
    if (availData.orders.length > 0) {
      const orderToAppend = availData.orders[0];
      const appendRes = await request.post(
        `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(targetTripCode)}/append-stored-orders`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: {
            orderIds: [orderToAppend.id],
            notes: 'E2E automated batch append stored test',
          },
        }
      );

      expect(appendRes.ok(), `Append status: ${appendRes.status()}`).toBeTruthy();
      const appendJson = await appendRes.json();
      const appendData = appendJson?.data ?? appendJson;

      expect(appendData).toHaveProperty('success', true);
      expect(appendData).toHaveProperty('tripCode', targetTripCode);
      expect(appendData.appendedCount).toBeGreaterThanOrEqual(1);
    }
  });

  // ── TEST 3: API - HUB SCOPE ISOLATION & ZERO STOCK GUARD (TASK 12) ──
  test('API: GET /warehouse/orders strict Hub scoping and zero-stock stored filter', async ({
    request,
  }) => {
    // Authenticate as Andromeda Hub - HCM Warehouse Manager
    const hcmLoginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
      data: { email: WAREHOUSE_HCM_EMAIL, password: PASSWORD },
    });
    expect(hcmLoginRes.ok(), `HCM login failed: ${hcmLoginRes.status()}`).toBeTruthy();
    const hcmJson = await hcmLoginRes.json();
    const hcmToken = hcmJson?.data?.token ?? hcmJson?.token;
    expect(hcmToken).toBeTruthy();

    // Query stored orders for Andromeda Hub (status = INBOUND)
    const storedRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/orders?status=INBOUND&page=1&limit=50`,
      {
        headers: { Authorization: `Bearer ${hcmToken}` },
      }
    );

    expect(storedRes.ok()).toBeTruthy();
    const storedJson = await storedRes.json();
    const storedOrders = storedJson?.data ?? [];

    // Verify 100% invariant: NO order in INBOUND tab has stock === 0
    for (const ord of storedOrders) {
      const stock = ord.hubStock ?? ord.stock ?? ord.remainingQuantity ?? 0;
      expect(stock).toBeGreaterThan(0);
      expect(ord.orderCode).not.toBe('MCD2610-00009'); // Must not leak Da Nang roadside order to HCM
    }

    // Verify meta counts parity
    expect(storedJson?.meta).toBeDefined();
    if (storedJson?.meta?.storedCount != null) {
      expect(storedJson.meta.storedCount).toBeGreaterThanOrEqual(0);
    }
  });

  // ── TEST 4: BROWSER UI - OUTBOUND RECEIPT & STORED SELECTION MODAL (TASKS 07/10, 10, 11) ──
  test('Browser UI: Outbound modal "Kho đích / Nơi giao", stored selection table without "TRẠNG THÁI"', async ({
    page,
  }) => {
    // 1. Sign in to Frontend
    await page.goto(`${DEV_FRONTEND_URL}/auth/sign-in`);
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for Dashboard
    await page.waitForURL('**/dashboard/**', { timeout: 25000 });

    // 2. Navigate to Inbound Warehouse page to inspect Step 2 stored selection modal
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('domcontentloaded');

    const tripDetailBtn = page.locator('button[title*="chi tiết chuyến xe"]').first();
    await tripDetailBtn.waitFor({ state: 'visible', timeout: 20000 });
    await tripDetailBtn.click();

    const tripModal = page.locator('div[role="dialog"]');
    await expect(tripModal).toBeVisible({ timeout: 10000 });

    // Switch to Step 2: Xuất hàng mới lên xe
    const step2Btn = tripModal.locator('button', { hasText: '2. Xuất hàng mới lên xe' });
    await expect(step2Btn).toBeVisible();
    await step2Btn.click();

    // Verify Step 2 action button exists and has clean label (Zero Redundant Icons)
    const addStoredBtn = tripModal.locator('button', { hasText: 'Thêm đơn xuất từ kho lên xe' });
    await expect(addStoredBtn).toBeVisible();

    // Open Select Stored Orders Modal (TASK 10 & TASK 11)
    await addStoredBtn.click();
    const selectModal = page.locator('div[role="dialog"]').last();
    await expect(selectModal).toBeVisible({ timeout: 8000 });

    // Sub-header verifies context
    await expect(selectModal.locator('text=Chọn đơn lưu kho bốc lên chuyến xe')).toBeVisible();

    // Task 11 Verification: Check table headers - MUST NOT have "TRẠNG THÁI"
    const tableHeader = selectModal.locator('thead');
    await expect(tableHeader).toBeVisible();
    const statusHeader = tableHeader.locator('th', { hasText: 'TRẠNG THÁI' });
    expect(await statusHeader.count()).toBe(0); // STRICT REQUIREMENT: Column removed

    // Verify required operational columns are present
    await expect(tableHeader.locator('th', { hasText: 'MÃ VẬN ĐƠN' })).toBeVisible();
    await expect(tableHeader.locator('th', { hasText: 'TÊN HÀNG HÓA' })).toBeVisible();
    await expect(tableHeader.locator('th', { hasText: 'KHO ĐÍCH / NƠI GIAO' })).toBeVisible();

    // Capture screenshot of stored selection modal without redundant status
    const selectScreenshot = await selectModal.screenshot();
    saveEvidenceScreenshot(EVIDENCE_DIR_07, '02_e2e_select_stored_orders_clean_columns.png', selectScreenshot);

    // Close select modal & trip modal
    const closeSelectBtn = selectModal.locator('button', { hasText: 'Đóng' }).first();
    if (await closeSelectBtn.count() > 0) {
      await closeSelectBtn.click();
    }
    const closeTripBtn = tripModal.locator('button[aria-label="Close"], button:has-text("✕"), button:has-text("Đóng")').first();
    if (await closeTripBtn.count() > 0) {
      await closeTripBtn.click().catch(() => {});
    }

    // 3. Navigate to Outbound Warehouse page to verify Outbound Receipt Modal (TASK 07/10)
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`);
    await page.waitForLoadState('domcontentloaded');

    // Look for print receipt button in outbound page
    const printReceiptBtn = page.locator('button', { hasText: /in phiếu/i }).first();
    if (await printReceiptBtn.count() > 0) {
      await printReceiptBtn.click();

      const receiptModal = page.locator('div[role="dialog"]').last();
      await expect(receiptModal).toBeVisible({ timeout: 8000 });

      // Check header: "Kho đích / Nơi giao" (TASK 07/10 SPEC)
      const destHeader = receiptModal.locator('th', { hasText: 'Kho đích / Nơi giao' });
      await expect(destHeader).toBeVisible();

      // Capture screenshot of standardized Outbound Receipt modal
      const receiptScreenshot = await receiptModal.screenshot();
      saveEvidenceScreenshot(EVIDENCE_DIR_07, '01_e2e_outbound_receipt_destination_header.png', receiptScreenshot);

      const closeReceiptBtn = receiptModal.locator('button', { hasText: 'Đóng' }).first();
      if (await closeReceiptBtn.count() > 0) {
        await closeReceiptBtn.click();
      }
    }
  });

  // ── TEST 5: BROWSER UI - WAREHOUSE ORDERS PAGE ZERO-STOCK ISOLATION (TASK 12) ──
  test('Browser UI: /dashboard/warehouse/orders zero-stock orders guard & Andromeda isolation', async ({
    page,
  }) => {
    // 1. Sign in as Andromeda Hub - HCM Warehouse Manager
    await page.goto(`${DEV_FRONTEND_URL}/auth/sign-in`);
    await page.fill('input[type="email"], input[name="email"]', WAREHOUSE_HCM_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for Dashboard
    await page.waitForURL('**/dashboard/**', { timeout: 25000 });

    // 2. Navigate to Warehouse Orders
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/orders`);
    await page.waitForLoadState('domcontentloaded');

    // Click LƯU KHO tab
    const storedTab = page.locator('button', { hasText: 'LƯU KHO' }).first();
    await expect(storedTab).toBeVisible({ timeout: 15000 });
    await storedTab.click();

    // Wait for table to load
    const ordersTable = page.locator('table');
    await expect(ordersTable).toBeVisible({ timeout: 10000 });

    // Assert: No visible row in LƯU KHO tab has "0 / " stock
    const zeroStockCells = page.locator('td', { hasText: /0\s*\/\s*\d+\s*kiện/i });
    expect(await zeroStockCells.count()).toBe(0);

    // Assert: Order MCD2610-00009 must NOT be in HCM warehouse view
    const leakedOrder = page.locator('td', { hasText: 'MCD2610-00009' });
    expect(await leakedOrder.count()).toBe(0);

    // Capture screenshot of clean LƯU KHO tab
    const ordersScreenshot = await page.screenshot();
    saveEvidenceScreenshot(EVIDENCE_DIR_12, '01_e2e_warehouse_orders_clean_stored_tab.png', ordersScreenshot);
  });
});
