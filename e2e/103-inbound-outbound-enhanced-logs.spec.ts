import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_ADMIN } from './helpers/auth';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';
const API_URL = process.env.API_URL || 'http://localhost:4001/api/v1';
const EVIDENCE_DIR = path.resolve(__dirname, '../../issues/issue_enhanced_logs');

test.describe('Inbound & Outbound Enhanced Logging & Audit Trail Verification (3 Test Cases)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Execute 3 End-to-End Cases: Inbound Logging -> Outbound Logging -> UI Waybill Modal Inspection', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });

    const uniqueSuffix = Date.now().toString().slice(-6);
    const testOrderCode = `TEST-LOG-${uniqueSuffix}`;
    const testInboundTrip = `SD-IN-${uniqueSuffix}`;
    const testOutboundTrip = `SD-OUT-${uniqueSuffix}`;

    // =========================================================================
    // STEP 1 / CASE 1: Quick Create Inbound & Verify Inbound Audit Log
    // =========================================================================
    console.log(`--- CASE 1: Inbound Logging Verification for ${testOrderCode} ---`);
    await loginAs(page, USER_ADMIN, BASE_URL);

    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === 'access_token' || c.name === 'token');
    const effectiveToken = tokenCookie?.value || '';

    const inboundPayload = {
      orderCode: testOrderCode,
      goodsDescription: 'Hàng kiểm thử log nhập kho',
      totalQuantity: 12,
      totalWeight: 24,
      totalVolume: 0.12,
      pickupAddress: 'Kho Hà Nội',
      deliveryAddress: 'Kho Đà Nẵng',
      licensePlate: '29H-12345',
      driverName: 'Nguyễn Văn Test',
      tripCode: testInboundTrip,
      initialStatus: 'INBOUND',
      notes: 'Test log tiếp nhận nhập kho số lượng kiện'
    };

    const createRes = await page.request.post(`${API_URL}/warehouse/inbound/quick-create`, {
      headers: {
        'Content-Type': 'application/json',
        ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {})
      },
      data: inboundPayload
    });

    expect(createRes.ok()).toBeTruthy();
    const createJson = await createRes.json();
    const createdOrder = createJson.data || createJson;
    const orderId = createdOrder.id;
    console.log(`[Case 1] Created order ${createdOrder.orderCode || testOrderCode} (id: ${orderId})`);

    // Verify Activity Log for Inbound
    const inboundLogRes = await page.request.get(`${API_URL}/orders/code/${encodeURIComponent(testOrderCode)}/activity-logs`, {
      headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}
    });

    expect(inboundLogRes.ok()).toBeTruthy();
    const inboundLogJson = await inboundLogRes.json();
    const inboundLogs = Array.isArray(inboundLogJson) ? inboundLogJson : (inboundLogJson.data || []);
    console.log(`[Case 1] Found ${inboundLogs.length} activity logs for ${testOrderCode}`);

    const inboundLog = inboundLogs.find((l: any) => l.action === 'INBOUND_CONFIRMED');
    expect(inboundLog).toBeDefined();
    expect(inboundLog.quantity).toBe(12);
    expect(inboundLog.reason).toContain('12 kiện');
    console.log(`[Case 1 PASS] INBOUND_CONFIRMED: Qty=${inboundLog.quantity}, Reason: ${inboundLog.reason}`);

    // =========================================================================
    // STEP 2 / CASE 2: Confirm Outbound & Verify Outbound Audit Log
    // =========================================================================
    console.log(`--- CASE 2: Outbound Logging Verification for ${testOrderCode} ---`);

    const outboundPayload = {
      mode: 'TRANSFER',
      tripCode: testOutboundTrip,
      licensePlate: '51D-99999',
      driverName: 'Trần Văn Xuất',
      destinationHubId: 2,
      items: [
        {
          orderId: Number(orderId),
          quantity: 5,
          quantityToExport: 5,
          destinationHubId: 2
        }
      ]
    };

    const outboundRes = await page.request.post(`${API_URL}/warehouse/outbound/confirm`, {
      headers: {
        'Content-Type': 'application/json',
        ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {})
      },
      data: outboundPayload
    });

    expect(outboundRes.ok()).toBeTruthy();
    console.log(`[Case 2] Confirmed outbound 5 packages on trip ${testOutboundTrip}`);

    // Verify Activity Log for Outbound
    const outboundLogRes = await page.request.get(`${API_URL}/orders/code/${encodeURIComponent(testOrderCode)}/activity-logs`, {
      headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}
    });

    expect(outboundLogRes.ok()).toBeTruthy();
    const outboundLogJson = await outboundLogRes.json();
    const outboundLogs = Array.isArray(outboundLogJson) ? outboundLogJson : (outboundLogJson.data || []);

    const outboundLog = outboundLogs.find((l: any) => l.action === 'OUTBOUND_CONFIRMED');
    expect(outboundLog).toBeDefined();
    expect(outboundLog.quantity).toBe(5);
    expect(outboundLog.reason).toContain('5 kiện');
    if (outboundLog.tripCode) {
      expect(outboundLog.reason).toContain(outboundLog.tripCode);
    }
    console.log(`[Case 2 PASS] OUTBOUND_CONFIRMED: Qty=${outboundLog.quantity}, Trip=${outboundLog.tripCode}, Reason: ${outboundLog.reason}`);

    // =========================================================================
    // STEP 3 / CASE 3: Inspect UI Waybill Detail Modal & Capture Visual Evidence
    // =========================================================================
    console.log(`--- CASE 3: Inspect UI Waybill Detail Modal for ${testOrderCode} ---`);
    await page.goto(`${BASE_URL}/dashboard/warehouse/orders`);
    await page.waitForLoadState('networkidle').catch(() => {});

    // Search for test order
    const searchInput = page.locator('input[placeholder*="Tìm kiếm"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 15_000 });
    await searchInput.fill(testOrderCode);
    await searchInput.press('Enter');
    await page.waitForTimeout(2500);

    // Locate and click order row
    const orderRow = page.locator('tr').filter({ hasText: testOrderCode }).first();
    await orderRow.waitFor({ state: 'visible', timeout: 15_000 });
    await orderRow.click();

    // Verify detail dialog is open
    const detailDialog = page.locator('[role="dialog"]').filter({ hasText: testOrderCode }).first();
    await detailDialog.waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(1500);

    // Assert Audit Logs
    await expect(detailDialog.locator('text=Nhật ký thao tác & Thay đổi dữ liệu')).toBeVisible({ timeout: 10_000 });
    await expect(detailDialog.locator('text=INBOUND_CONFIRMED').first()).toBeVisible({ timeout: 10_000 });
    await expect(detailDialog.locator('text=OUTBOUND_CONFIRMED').first()).toBeVisible({ timeout: 10_000 });
    await expect(detailDialog.getByText('Tiếp nhận nhập kho 12 kiện').first()).toBeVisible({ timeout: 10_000 });
    await expect(detailDialog.getByText('Xác nhận xuất kho 5 kiện').first()).toBeVisible({ timeout: 10_000 });

    // Capture visual screenshot proof
    const screenshotPath = path.join(EVIDENCE_DIR, 'step_03_waybill_enhanced_logs_verified.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`[Case 3 PASS] Verified visual evidence saved to: ${screenshotPath}`);
  });
});
