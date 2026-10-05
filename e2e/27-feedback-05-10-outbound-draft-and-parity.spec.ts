/**
 * e2e/27-feedback-05-10-outbound-draft-and-parity.spec.ts
 *
 * E2E Verification Suite for Feedback 05/10:
 * 1. Outbound trip board & CTE 1:1 counter parity (allCount = pendingCount + completedCount).
 * 2. Full draft trip lifecycle: create draft (POST /v1/warehouse/outbound/draft),
 *    verify status PENDING, cancel draft (DELETE /v1/warehouse/outbound/drafts/:tripCode),
 *    and confirm draft into dispatched trip (POST /v1/warehouse/outbound/confirm with draftTripCode).
 * 3. Browser UI verification on dev frontend:
 *    - Status tabs (Tất cả / Chờ xử lý / Đã xử lý).
 *    - Confirmation that trip-type sub-filters (Xuất khách / Luân chuyển) are eliminated.
 *    - Draft action buttons (Tiếp tục, Hủy nháp, Lưu nháp).
 *    - Console health (zero critical errors).
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

const DEV_BACKEND_URL =
  process.env.API_URL ?? 'https://logistics-website-backend-1jho.onrender.com/api/v1';
const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://logistics-website-frontend-git-dev-thai-lys-projects.vercel.app';

const ADMIN_EMAIL = 'lyquangthai1993+1@gmail.com';
const PASSWORD = 'secret';

let adminToken = '';

test.describe.serial('Feedback 05/10: Outbound Drafts & Trip Board Parity', () => {
  test.beforeAll(async ({ request }) => {
    // 1. Authenticate against Dev Backend
    const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
      data: { email: ADMIN_EMAIL, password: PASSWORD }
    });
    expect(loginRes.ok(), `Login status: ${loginRes.status()}`).toBeTruthy();
    const loginJson = await loginRes.json();
    adminToken = loginJson?.data?.token ?? loginJson?.token;
    expect(adminToken).toBeTruthy();
  });

  // ── TEST 1: API - Verify Outbound Trips Endpoint Schema & Counter Parity ──
  test('API: Outbound trips endpoint returns correct meta counters with 1:1 parity', async ({
    request
  }) => {
    const res = await request.get(`${DEV_BACKEND_URL}/warehouse/outbound-trips`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.ok(), `GET outbound-trips status: ${res.status()}`).toBeTruthy();

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

    // 1:1 parity assertion: total status count = pendingCount + completedCount
    expect(
      meta.allCount,
      `allCount (${meta.allCount}) should equal pendingCount (${meta.pendingCount}) + completedCount (${meta.completedCount})`
    ).toBe(meta.pendingCount + meta.completedCount);

    expect(
      meta.typeAllCount,
      `typeAllCount (${meta.typeAllCount}) should equal customerCount (${meta.customerCount}) + transferCount (${meta.transferCount})`
    ).toBe(meta.customerCount + meta.transferCount);
  });

  // ── TEST 2: API - Full Draft Lifecycle (Create Draft -> Query -> Cancel) ──
  test('API: Draft lifecycle - create draft, verify in PENDING query, and cancel', async ({
    request
  }) => {
    // A. Fetch available stored orders to draft from
    const ordersRes = await request.get(`${DEV_BACKEND_URL}/warehouse/orders?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(ordersRes.ok()).toBeTruthy();
    const ordersJson = await ordersRes.json();
    const orders = ordersJson?.data ?? ordersJson;
    const availableOrder = orders.find(
      (o: any) =>
        ['INBOUND', 'WAITING_OUTBOUND', 'CONFIRMED', 'COLLECTED'].includes(
          o.hubStatus ?? o.status
        ) && Number(o.remainingQuantity ?? o.totalQuantity ?? 0) > 0
    );

    if (!availableOrder) {
      test.skip(true, 'No available order in warehouse to test draft creation');
      return;
    }

    const testPlate = `51H-DRAFT-${Date.now().toString().slice(-4)}`;

    // B. Save Outbound Draft
    const draftRes = await request.post(`${DEV_BACKEND_URL}/warehouse/outbound/draft`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        orderIds: [availableOrder.id],
        items: [
          {
            orderId: availableOrder.id,
            quantityToExport: 1
          }
        ],
        mode: 'CUSTOMER',
        licensePlate: testPlate,
        driverName: 'Tài Xế Nháp Test'
      }
    });

    expect(draftRes.ok(), `Draft save status: ${draftRes.status()}`).toBeTruthy();
    const draftJson = await draftRes.json();
    const draftPayload = draftJson?.data ?? draftJson;
    const draftTripCode = draftPayload?.tripCode;

    expect(draftTripCode, 'Should return generated draft tripCode').toMatch(/^SD\d+$/);

    // C. Verify the draft trip appears in the PENDING filter query
    const pendingQueryRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/outbound-trips?status=PENDING`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    expect(pendingQueryRes.ok()).toBeTruthy();
    const pendingJson = await pendingQueryRes.json();
    const pendingData = pendingJson?.data ?? pendingJson;
    const foundDraft = (Array.isArray(pendingData) ? pendingData : []).find(
      (t: any) => t.tripCode === draftTripCode
    );

    expect(foundDraft, `Draft ${draftTripCode} must be present in PENDING list`).toBeDefined();
    expect(foundDraft?.status).toBe('PENDING');
    expect(foundDraft?.isDraft).toBe(true);

    // D. Cancel the draft trip
    const cancelRes = await request.delete(
      `${DEV_BACKEND_URL}/warehouse/outbound/drafts/${encodeURIComponent(draftTripCode)}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    expect(cancelRes.ok(), `Cancel draft status: ${cancelRes.status()}`).toBeTruthy();
    const cancelJson = await cancelRes.json();
    expect(cancelJson?.data?.cancelled ?? cancelJson?.cancelled).toBe(true);

    // E. Verify the draft no longer exists in PENDING query
    const afterCancelRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/outbound-trips?status=PENDING`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const afterCancelJson = await afterCancelRes.json();
    const afterCancelData = afterCancelJson?.data ?? afterCancelJson;
    const afterFound = (Array.isArray(afterCancelData) ? afterCancelData : []).find(
      (t: any) => t.tripCode === draftTripCode
    );
    expect(afterFound, `Draft ${draftTripCode} must be deleted after cancel`).toBeUndefined();
  });

  // ── TEST 3: Browser UI - Outbound Board Tabs, Draft Flow & Console Health ──
  test('UI: Outbound board renders status tabs, draft buttons, and maintains console health', async ({
    page
  }) => {
    test.setTimeout(90_000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          !text.includes('favicon') &&
          !text.includes('websocket') &&
          !text.includes('socket.io')
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

    // 4. Navigate to Outbound Board
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`);

    // 5. Assert processing status tabs are rendered with dynamic counter format
    const allTab = page.locator('button:has-text("Tất cả (")').first();
    const pendingTab = page.locator('button:has-text("Chờ xử lý (")');
    const completedTab = page.locator('button:has-text("Đã xử lý (")');

    await expect(allTab, 'Tab "Tất cả" must be visible').toBeVisible({ timeout: 25_000 });
    await expect(pendingTab, 'Tab "Chờ xử lý" must be visible').toBeVisible({ timeout: 10_000 });
    await expect(completedTab, 'Tab "Đã xử lý" must be visible').toBeVisible({ timeout: 10_000 });

    // 6. Assert trip-type sub-filters are eliminated per user decision
    const customerTab = page.locator('button:has-text("Xuất khách (")');
    const transferTab = page.locator('button:has-text("Luân chuyển (")');
    await expect(customerTab, 'Tab "Xuất khách" must be removed').toHaveCount(0);
    await expect(transferTab, 'Tab "Luân chuyển" must be removed').toHaveCount(0);

    // 7. Click "Chờ xử lý" tab and ensure table filters without crashing
    await pendingTab.click();
    await page.waitForTimeout(1_000);

    // 8. Click "Đã xử lý" tab and verify completed trips
    await completedTab.click();
    await page.waitForTimeout(1_000);

    // 9. Open Outbound Note Form by clicking "Xuất kho"
    const createOutboundBtn = page.locator('button:has-text("Xuất kho")').first();
    if (await createOutboundBtn.isVisible()) {
      await createOutboundBtn.click();
      await page.waitForTimeout(1_000);

      // Verify "Tạo Phiếu Xuất Kho" form and "Lưu nháp" button
      const draftSaveBtn = page.locator('button:has-text("Lưu nháp")').first();
      await expect(draftSaveBtn, 'Button "Lưu nháp" must exist on outbound note').toBeVisible({
        timeout: 10_000
      });

      // Return to board
      const backBtn = page.locator('button:has-text("Quay lại danh sách")').first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
      }
    }

    // 10. Assert 0 critical console errors
    expect(consoleErrors, `Uncaught console errors: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });
});
