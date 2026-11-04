import { test, expect } from '@playwright/test';
import path from 'path';
import {
  loginAs,
  USER_ADMIN,
  USER_WAREHOUSE_HCM,
  USER_WAREHOUSE_DAD,
  USER_WAREHOUSE_HYN,
  waitForTableLoaded
} from './helpers/auth';

const SCREENSHOT_PATH = path.resolve(
  __dirname,
  '../../feedbacks/feedback_03_11_task_112_railway_hub_name_log/screenshot_01_verified.png'
);

const HUB_TEST_CASES = [
  {
    hubId: 1,
    hubName: 'Andromeda Hub - HCM',
    user: USER_WAREHOUSE_HCM,
    prefix: 'HCM'
  },
  {
    hubId: 2,
    hubName: 'Magellan Hub - Đà Nẵng',
    user: USER_WAREHOUSE_DAD,
    prefix: 'DAD'
  },
  {
    hubId: 3,
    hubName: 'Polaris Hub - Hưng Yên',
    user: USER_WAREHOUSE_HYN,
    prefix: 'HYN'
  }
];

test.describe('Task #112 — Warehouse Operational Logs & Activity Audit Across All 3 Hubs', () => {
  for (const hubCase of HUB_TEST_CASES) {
    test(`Hub ${hubCase.hubId} (${hubCase.hubName}) resolves and records explicit Hub ID + Hub Name in operational & audit logs`, async ({
      page
    }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: 1440, height: 860 });

      // 1. Login as Warehouse Manager of target hub
      await loginAs(page, hubCase.user);
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

      // Resolve API base origin
      const apiBase = process.env.API_URL || 'http://localhost:4001/api/v1';

      // 2. Create a real inbound order via quick-create API to trigger [INBOUND CREATED] & [AUDIT] logs
      const uniqueSuffix = Date.now().toString().slice(-6);
      const testOrderCode = `HUB${hubCase.prefix}-${uniqueSuffix}`;
      const testPlate = `51H-${uniqueSuffix.slice(0, 5)}`;

      const quickCreateRes = await page.request.post(`${apiBase}/warehouse/inbound/quick-create`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          orderCode: testOrderCode,
          goodsDescription: `Kiện kiểm thử tên ${hubCase.hubName} trong Railway log`,
          totalQuantity: 10,
          totalWeight: 50,
          totalVolume: 1.2,
          licensePlate: testPlate,
          driverName: `Tài xế Test ${hubCase.prefix}`,
          pickupAddress: hubCase.hubName,
          deliveryAddress: `Khách hàng ${hubCase.prefix}`,
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
          driverName: `Tài xế Xuất Kho ${hubCase.prefix}`,
          items: [
            {
              orderId: createdOrder.id,
              quantityToExport: 10,
              weightToExport: 50,
              volumeToExport: 1.2,
              deliveryMode: 'DIRECT_CUSTOMER',
              deliveryAddress: `Khách hàng ${hubCase.prefix}`
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

      // Verify Hub ID and canonical Hub Name for target hub
      expect(Number(outboundLog.hubId)).toBe(hubCase.hubId);
      expect(outboundLog.hubName).toBeTruthy();
      expect(outboundLog.hubName).not.toBe('N/A Hub');
      expect(outboundLog.hubName).toContain(hubCase.hubName);

      expect(Number(inboundLog.hubId)).toBe(hubCase.hubId);
      expect(inboundLog.hubName).toBeTruthy();
      expect(inboundLog.hubName).not.toBe('N/A Hub');
      expect(inboundLog.hubName).toContain(hubCase.hubName);

      // 5. Search the orderCode on UI table and capture evidence on the last hub
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

      if (hubCase.hubId === 3) {
        await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
      }
    });
  }
});
