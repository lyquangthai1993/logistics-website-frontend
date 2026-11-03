import { test, expect } from '@playwright/test';
import path from 'path';
import { loginAs, USER_ADMIN, USER_WAREHOUSE_HCM, waitForTableLoaded } from './helpers/auth';

const SCREENSHOT_PATH = path.resolve(
  __dirname,
  '../../feedbacks/feedback_03_11_task_112_railway_hub_name_log/screenshot_01_verified.png'
);

test.describe('Task #112 — Warehouse Operational Logs & Activity Audit Include Explicit Hub Name', () => {
  test('Inbound and Outbound operations resolve and record explicit Hub ID + Hub Name (e.g. Hub 1 (Andromeda Hub - HCM))', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 860 });

    // 1. Login as Warehouse Manager of Andromeda Hub - HCM
    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto('/dashboard/warehouse/orders', {
      waitUntil: 'domcontentloaded'
    });
    await waitForTableLoaded(page);

    await expect(page).toHaveURL(/\/dashboard\/warehouse\/orders/);
    const token = await page.evaluate(() => window.localStorage.getItem('access_token'));
    expect(token).toBeTruthy();

    // Wait for warehouse orders table rows to load (Non-Empty Visual Gate)
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.first()).toBeVisible({ timeout: 20_000 });
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Resolve API base origin
    const apiBase = process.env.API_URL || 'http://localhost:4001/api/v1';

    // 2. Create a real inbound order via quick-create API to trigger [INBOUND CREATED] & [AUDIT] logs
    const uniqueSuffix = Date.now().toString().slice(-6);
    const testOrderCode = `HUBLOG-${uniqueSuffix}`;
    const testPlate = `51H-${uniqueSuffix.slice(0, 5)}`;

    const quickCreateRes = await page.request.post(`${apiBase}/warehouse/inbound/quick-create`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        orderCode: testOrderCode,
        goodsDescription: 'Kiện kiểm thử tên Hub trong Railway log',
        totalQuantity: 10,
        totalWeight: 50,
        totalVolume: 1.2,
        licensePlate: testPlate,
        driverName: 'Tài xế Test Hub Log',
        pickupAddress: 'Andromeda Hub - HCM',
        deliveryAddress: 'Khách hàng Quận 1, TP.HCM',
        initialStatus: 'INBOUND'
      },
      timeout: 15_000
    });
    expect(quickCreateRes.ok()).toBeTruthy();
    const quickCreateJson = await quickCreateRes.json();
    const createdOrder = quickCreateJson?.data || quickCreateJson;
    expect(createdOrder?.id).toBeTruthy();
    expect(createdOrder?.orderCode).toBe(testOrderCode);

    // 3. Perform a real outbound confirmation on the created order to trigger [OUTBOUND CONFIRMED] & [AUDIT] logs
    const outboundRes = await page.request.post(`${apiBase}/warehouse/outbound/confirm`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        orderIds: [createdOrder.id],
        mode: 'CUSTOMER',
        licensePlate: testPlate,
        driverName: 'Tài xế Xuất Kho Hub Log',
        items: [
          {
            orderId: createdOrder.id,
            quantityToExport: 10,
            weightToExport: 50,
            volumeToExport: 1.2,
            deliveryMode: 'DIRECT_CUSTOMER',
            deliveryAddress: 'Khách hàng Quận 1, TP.HCM'
          }
        ]
      },
      timeout: 15_000
    });
    expect(outboundRes.ok()).toBeTruthy();
    const outboundJson = await outboundRes.json();
    const outboundData = outboundJson?.data || outboundJson;
    expect(outboundData?.tripCode).toBeTruthy();

    // 4. Authenticate Super Admin token & inspect immutable Order Activity Logs to verify Hub Name resolution
    const adminLoginRes = await page.request.post(`${apiBase}/auth/email/login`, {
      data: {
        email: USER_ADMIN.username || USER_ADMIN.email,
        password: USER_ADMIN.password
      },
      timeout: 15_000
    });
    expect(adminLoginRes.ok()).toBeTruthy();
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson?.data?.token || adminLoginJson?.token;
    expect(adminToken).toBeTruthy();

    const activityRes = await page.request.get(
      `${apiBase}/orders/code/${encodeURIComponent(testOrderCode)}/activity-logs`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        timeout: 15_000
      }
    );
    expect(activityRes.ok()).toBeTruthy();
    const activityJson = await activityRes.json();
    const logs = Array.isArray(activityJson?.data)
      ? activityJson.data
      : Array.isArray(activityJson)
        ? activityJson
        : [];
    expect(logs.length).toBeGreaterThanOrEqual(2);

    const outboundLog = logs.find((l: any) => l.action === 'OUTBOUND_CONFIRMED');
    const inboundLog = logs.find((l: any) => l.action === 'INBOUND_CONFIRMED');
    expect(outboundLog).toBeTruthy();
    expect(inboundLog).toBeTruthy();

    // Both INBOUND_CONFIRMED and OUTBOUND_CONFIRMED must have a real Hub Name (e.g. 'Andromeda Hub - HCM')
    expect(outboundLog.hubId).toBeGreaterThan(0);
    expect(outboundLog.hubName).toBeTruthy();
    expect(outboundLog.hubName).not.toBe('N/A Hub');
    expect(outboundLog.hubName).toContain('Andromeda Hub - HCM');

    expect(inboundLog.hubId).toBeGreaterThan(0);
    expect(inboundLog.hubName).toBeTruthy();
    expect(inboundLog.hubName).not.toBe('N/A Hub');
    expect(inboundLog.hubName).toContain('Andromeda Hub - HCM');

    // 5. Search the orderCode via UI input on Warehouse Orders board and verify visual rendering
    const searchInput = page
      .locator(
        'input[placeholder*="Tìm"], input[placeholder*="mã"], input[type="search"], input[type="text"]'
      )
      .first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    const searchApiPromise = page.waitForResponse(
      (res) => res.url().includes('/warehouse/orders') && res.status() === 200,
      { timeout: 20_000 }
    );
    await searchInput.fill(testOrderCode);
    await searchInput.press('Enter');
    await searchApiPromise;

    const matchingRow = page.locator('table tbody tr').filter({ hasText: testOrderCode }).first();
    await expect(matchingRow).toBeVisible({ timeout: 15_000 });
    await expect(matchingRow).toContainText(testOrderCode);
    await expect(matchingRow).toContainText('Đã xuất kho');

    // Click the order code link/row to open detail inspection dialog
    const orderCodeTrigger = matchingRow.getByText(testOrderCode).first();
    await orderCodeTrigger.click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog).toContainText(testOrderCode);
    await expect(dialog).toContainText('Andromeda Hub - HCM');

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
  });
});
