/**
 * e2e/28-inbound-trip-status-filters-and-parity.spec.ts
 *
 * E2E Verification Suite for Inbound Trip Status Filters & 1:1 Parity:
 * 1. API Verification:
 *    - Inbound trips endpoint schema & CTE counters:
 *      allCount = pendingCount + completedCount (1:1 parity).
 *      typeAllCount = customerCount + transferCount (1:1 parity).
 *    - Query filtering by status (PENDING / COMPLETED) and type (CUSTOMER / TRANSFER).
 * 2. Browser UI Verification on Dev Frontend:
 *    - Processing Status Tabs: Tất cả, Chờ xử lý, Đã xử lý with dynamic counters.
 *    - Confirmation that trip-type sub-filters (Tất cả loại, Khách gửi, Luân chuyển) are eliminated.
 *    - TablePaginationBar unitLabel displays "chuyến xe".
 *    - Zero critical console errors.
 */

import { test, expect } from '@playwright/test';

const DEV_BACKEND_URL =
  process.env.API_URL ?? 'https://logistics-website-backend-1jho.onrender.com/api/v1';
const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://logistics-website-frontend-git-dev-thai-lys-projects.vercel.app';

const ADMIN_EMAIL = 'lyquangthai1993+1@gmail.com';
const PASSWORD = 'secret';

let adminToken = '';

test.describe.serial('Suite 28: Inbound Trip Status Filters & 1:1 Counter Parity', () => {
  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
      data: { email: ADMIN_EMAIL, password: PASSWORD }
    });
    expect(loginRes.ok(), `Login status: ${loginRes.status()}`).toBeTruthy();
    const loginJson = await loginRes.json();
    adminToken = loginJson?.data?.token ?? loginJson?.token;
    expect(adminToken, 'Admin token must be obtained').toBeTruthy();
  });

  // ── TEST 1: API - Verify Inbound Trips Endpoint Schema & Counter Parity ──
  test('API: Inbound trips endpoint returns correct meta counters with 1:1 parity', async ({
    request
  }) => {
    const res = await request.get(`${DEV_BACKEND_URL}/warehouse/inbound-trips`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok(), `GET inbound-trips status: ${res.status()}`).toBeTruthy();

    const json = await res.json();
    const payload = json?.meta ? json : (json?.data ?? json);
    const meta = payload?.meta;

    expect(meta, 'Meta block must exist').toBeDefined();
    expect(typeof meta.allCount).toBe('number');
    expect(typeof meta.pendingCount).toBe('number');
    expect(typeof meta.completedCount).toBe('number');
    expect(typeof meta.typeAllCount).toBe('number');
    expect(typeof meta.customerCount).toBe('number');
    expect(typeof meta.transferCount).toBe('number');

    // 1:1 Counter Parity assertion: allCount = pendingCount + completedCount
    expect(
      meta.allCount,
      `allCount (${meta.allCount}) must equal pendingCount (${meta.pendingCount}) + completedCount (${meta.completedCount})`
    ).toBe(meta.pendingCount + meta.completedCount);

    // Sub-filter Parity assertion: typeAllCount = customerCount + transferCount
    expect(
      meta.typeAllCount,
      `typeAllCount (${meta.typeAllCount}) must equal customerCount (${meta.customerCount}) + transferCount (${meta.transferCount})`
    ).toBe(meta.customerCount + meta.transferCount);
  });

  // ── TEST 2: API - Status & Type Filtering Accuracy ──
  test('API: Inbound trips status and type query parameters filter rows correctly', async ({
    request
  }) => {
    // 1. Filter by PENDING
    const pendingRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/inbound-trips?status=PENDING`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    expect(pendingRes.ok()).toBeTruthy();
    const pendingJson = await pendingRes.json();
    const pendingPayload = pendingJson?.meta ? pendingJson : (pendingJson?.data ?? pendingJson);
    const pendingRows = pendingPayload?.data || [];
    for (const r of pendingRows) {
      expect(r.status).toBe('PENDING');
    }

    // 2. Filter by COMPLETED
    const completedRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/inbound-trips?status=COMPLETED`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    expect(completedRes.ok()).toBeTruthy();
    const completedJson = await completedRes.json();
    const completedPayload = completedJson?.meta ? completedJson : (completedJson?.data ?? completedJson);
    const completedRows = completedPayload?.data || [];
    for (const r of completedRows) {
      expect(r.status).toBe('COMPLETED');
    }

    // 3. Filter by type CUSTOMER
    const customerRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/inbound-trips?type=CUSTOMER`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    expect(customerRes.ok()).toBeTruthy();
    const customerJson = await customerRes.json();
    const customerPayload = customerJson?.meta ? customerJson : (customerJson?.data ?? customerJson);
    const customerRows = customerPayload?.data || [];
    for (const r of customerRows) {
      expect(r.isTransfer).toBe(false);
    }

    // 4. Filter by type TRANSFER
    const transferRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/inbound-trips?type=TRANSFER`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    expect(transferRes.ok()).toBeTruthy();
    const transferJson = await transferRes.json();
    const transferPayload = transferJson?.meta ? transferJson : (transferJson?.data ?? transferJson);
    const transferRows = transferPayload?.data || [];
    for (const r of transferRows) {
      expect(r.isTransfer).toBe(true);
    }
  });

  // ── TEST 3: Browser UI - Inbound Page 2-Tier Tabs & Unit Label ──
  test('UI: Inbound page renders 2-tier tabs, unitLabel="chuyến xe", and zero console errors', async ({
    page
  }) => {
    test.setTimeout(90_000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          !text.includes('Failed to load resource') &&
          !text.includes('favicon') &&
          !text.includes('websocket') &&
          !text.includes('socket.io') &&
          !text.includes('401') &&
          !text.includes('403')
        ) {
          consoleErrors.push(text);
        }
      }
    });

    // 1. Visit Dev Frontend sign-in page
    await page.goto(`${DEV_FRONTEND_URL}/auth/sign-in`);
    await page.locator('input[name="email"]').waitFor({ state: 'visible', timeout: 25_000 });

    // 2. Perform Login as Admin
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // 3. Wait for authenticated redirect into dashboard
    await page.waitForURL(/\/dashboard\/.*/, { timeout: 30_000 });

    // 4. Navigate to Inbound Warehouse page
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.locator('h1:has-text("Nhập kho")').waitFor({ state: 'visible', timeout: 25_000 });

    // 5. Assert Tier 1 processing status tabs are rendered with dynamic counter format
    const allTab = page.locator('button:has-text("Tất cả (")').first();
    const pendingTab = page.locator('button:has-text("Chờ xử lý (")').first();
    const completedTab = page.locator('button:has-text("Đã xử lý (")').first();

    await expect(allTab, 'Tab "Tất cả" must be visible').toBeVisible({ timeout: 25_000 });
    await expect(pendingTab, 'Tab "Chờ xử lý" must be visible').toBeVisible({ timeout: 10_000 });
    await expect(completedTab, 'Tab "Đã xử lý" must be visible').toBeVisible({ timeout: 10_000 });

    // 6. Assert Tier 2 trip-type sub-filters are eliminated per user decision
    const allTypesTab = page.locator('button:has-text("Tất cả loại (")');
    const customerTab = page.locator('button:has-text("Khách gửi (")');
    const transferTab = page.locator('button:has-text("Luân chuyển (")');

    await expect(allTypesTab, 'Tab "Tất cả loại" must be removed').toHaveCount(0);
    await expect(customerTab, 'Tab "Khách gửi" must be removed').toHaveCount(0);
    await expect(transferTab, 'Tab "Luân chuyển" must be removed').toHaveCount(0);

    // 7. Verify Date Range pickers
    const fromDateInput = page.getByLabel('Từ ngày');
    const toDateInput = page.getByLabel('Đến ngày');
    await expect(fromDateInput).toBeVisible();
    await expect(toDateInput).toBeVisible();

    // 8. Test Tab Switching
    await pendingTab.click();
    await page.waitForTimeout(600);
    await expect(pendingTab).toHaveClass(/bg-white/);

    await completedTab.click();
    await page.waitForTimeout(600);
    await expect(completedTab).toHaveClass(/bg-white/);

    await allTab.click();
    await page.waitForTimeout(600);
    await expect(allTab).toHaveClass(/bg-white/);

    // 9. Verify Pagination Bar unitLabel="chuyến xe" if pagination exists
    const paginationText = page.locator('text=/chuyến xe/i');
    const hasPagination = (await paginationText.count()) > 0;
    if (hasPagination) {
      await expect(paginationText.first()).toBeVisible();
    }

    // 10. Verify Console Health
    expect(consoleErrors, `Critical console errors: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });
});
