import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './helpers/auth';

const API_BASE = process.env.API_URL || 'https://backend-tms-core-dev.up.railway.app/api/v1';

test.describe('API Performance, Load & Stress Testing Suite (E2E Gate)', () => {
  let authTokenHcm: string = '';
  let authTokenAdmin: string = '';

  test.beforeAll(async ({ request }) => {
    // 1. Login as warehouse_hcm (TEST_USERS[4])
    const resHcm = await request.post(`${API_BASE}/auth/email/login`, {
      data: {
        email: TEST_USERS[4].email, // warehouse_hcm (Andromeda Hub - HCM)
        password: TEST_USERS[4].password
      }
    });
    expect(resHcm.ok()).toBeTruthy();
    const hcmBody = await resHcm.json();
    authTokenHcm = hcmBody.data?.token || hcmBody.token;
    expect(authTokenHcm).toBeTruthy();

    // 2. Login as admin
    const resAdmin = await request.post(`${API_BASE}/auth/email/login`, {
      data: {
        email: TEST_USERS[0].email, // admin
        password: TEST_USERS[0].password
      }
    });
    expect(resAdmin.ok()).toBeTruthy();
    const adminBody = await resAdmin.json();
    authTokenAdmin = adminBody.data?.token || adminBody.token;
    expect(authTokenAdmin).toBeTruthy();
  });

  test('Scenario 1: API Response Time SLA Verification (Latency & Schema)', async ({ request }) => {
    const endpoints = [
      {
        name: 'Warehouse KPI (HCM)',
        url: `${API_BASE}/warehouse/kpi`,
        token: authTokenHcm,
        maxLatencyMs: 1500,
        validate: (data: any) => {
          expect(typeof data.total).toBe('number');
          expect(typeof data.inboundTotal).toBe('number');
          expect(typeof data.outboundTotal).toBe('number');
        }
      },
      {
        name: 'Warehouse Orders Grouped (HCM, p1 limit 20)',
        url: `${API_BASE}/warehouse/orders?groupBy=orderCode&page=1&limit=20`,
        token: authTokenHcm,
        maxLatencyMs: 4500,
        validate: (data: any, json?: any) => {
          const list = Array.isArray(data) ? data : data?.data;
          expect(Array.isArray(list)).toBeTruthy();
          expect((json && json.meta) || data?.meta).toBeDefined();
        }
      },
      {
        name: 'Warehouse Inbound Trips (HCM, p1 limit 15)',
        url: `${API_BASE}/warehouse/inbound-trips?page=1&limit=15`,
        token: authTokenHcm,
        maxLatencyMs: 3500,
        validate: (data: any, json?: any) => {
          const list = Array.isArray(data) ? data : data?.data;
          expect(Array.isArray(list)).toBeTruthy();
          expect((json && json.meta) || data?.meta).toBeDefined();
        }
      },
      {
        name: 'Warehouse Outbound Trips (HCM, p1 limit 20)',
        url: `${API_BASE}/warehouse/outbound-trips?page=1&limit=20`,
        token: authTokenHcm,
        maxLatencyMs: 3500,
        validate: (data: any, json?: any) => {
          const list = Array.isArray(data) ? data : data?.data;
          expect(Array.isArray(list)).toBeTruthy();
          expect((json && json.meta) || data?.meta).toBeDefined();
        }
      },
      {
        name: 'Fleet Trips (Admin, p1 limit 20)',
        url: `${API_BASE}/trips?page=1&limit=20`,
        token: authTokenAdmin,
        maxLatencyMs: 2000,
        validate: (data: any, json?: any) => {
          const list = Array.isArray(data) ? data : data?.data;
          expect(Array.isArray(list)).toBeTruthy();
        }
      },
      {
        name: 'Orders Stats (Admin)',
        url: `${API_BASE}/orders/stats`,
        token: authTokenAdmin,
        maxLatencyMs: 1000,
        validate: (data: any) => {
          expect(typeof data.total).toBe('number');
        }
      }
    ];

    for (const ep of endpoints) {
      const t0 = Date.now();
      const res = await request.get(ep.url, {
        headers: { Authorization: `Bearer ${ep.token}` }
      });
      const duration = Date.now() - t0;
      expect(res.status(), `Endpoint ${ep.name} failed with status ${res.status()}`).toBe(200);
      const json = await res.json();
      const payload = json.data !== undefined && json.statusCode !== undefined ? json.data : json;
      ep.validate(payload, json);
      expect(
        duration,
        `Endpoint ${ep.name} exceeded SLA: took ${duration}ms, max allowed ${ep.maxLatencyMs}ms`
      ).toBeLessThanOrEqual(ep.maxLatencyMs);
    }
  });

  test('Scenario 2: Concurrent Burst & Load Testing (Multi-Client Simulation)', async ({
    request
  }) => {
    const CONCURRENCY = 10;
    const urls = [
      `${API_BASE}/warehouse/orders?groupBy=orderCode&page=1&limit=10`,
      `${API_BASE}/warehouse/orders?groupBy=orderCode&page=2&limit=10`,
      `${API_BASE}/warehouse/orders?status=STORED&groupBy=orderCode&page=1&limit=10`,
      `${API_BASE}/warehouse/kpi`,
      `${API_BASE}/warehouse/inbound-trips?page=1&limit=10`,
      `${API_BASE}/warehouse/outbound-trips?page=1&limit=10`
    ];

    const tasks = Array.from({ length: CONCURRENCY }).map(async (_, idx) => {
      const targetUrl = urls[idx % urls.length];
      const t0 = Date.now();
      const res = await request.get(targetUrl, {
        headers: { Authorization: `Bearer ${authTokenHcm}` }
      });
      const duration = Date.now() - t0;
      return {
        idx,
        url: targetUrl,
        status: res.status(),
        ok: res.ok(),
        duration
      };
    });

    const results = await Promise.all(tasks);
    const failed = results.filter((r) => !r.ok);
    expect(failed.length, `Concurrent burst test had ${failed.length} failures`).toBe(0);

    const durations = results.map((r) => r.duration).sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95)];
    expect(p95).toBeLessThan(5000);
  });

  test('Scenario 3: Stress Testing (Heavy Wildcards & Date Range Scans)', async ({ request }) => {
    const stressScenarios = [
      {
        name: 'Deep Yearly Date Range Scan',
        url: `${API_BASE}/warehouse/orders?fromDate=2026-01-01&toDate=2026-12-31&groupBy=orderCode&page=1&limit=20`
      },
      {
        name: 'Freetext ILIKE Wildcard Search',
        url: `${API_BASE}/warehouse/orders?search=HCM&groupBy=orderCode&page=1&limit=20`
      },
      {
        name: 'Outbound Lookup Flow Filter',
        url: `${API_BASE}/warehouse/orders?flow=OUTBOUND_LOOKUP&page=1&limit=20`
      },
      {
        name: 'Outbound Trips License Plate Trigram Search',
        url: `${API_BASE}/warehouse/outbound-trips?search=SD&page=1&limit=20`
      }
    ];

    for (const sc of stressScenarios) {
      const t0 = Date.now();
      const res = await request.get(sc.url, {
        headers: { Authorization: `Bearer ${authTokenHcm}` }
      });
      const duration = Date.now() - t0;
      expect(res.status(), `Stress test ${sc.name} failed with status ${res.status()}`).toBe(200);
      expect(
        duration,
        `Stress test ${sc.name} timed out or took too long: ${duration}ms`
      ).toBeLessThan(6000);
    }
  });

  test('Scenario 4: Visual Evidence Verification on Dashboard UI', async ({ page }) => {
    // Setup response listener before navigating
    const ordersResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/warehouse/orders') && res.status() === 200,
      { timeout: 20000 }
    );

    // Login as warehouse_hcm (Andromeda Hub - HCM) using official helper
    await loginAs(page, TEST_USERS[4]);
    await page.waitForURL('**/dashboard/warehouse/orders', { timeout: 15000 });

    // Wait for the orders API call to respond and loading state to disappear
    await ordersResponsePromise;
    await expect(page.locator('text=Đang tải dữ liệu đơn hàng...')).not.toBeVisible({
      timeout: 15000
    });

    // Wait for the table rows to render
    const dataRows = page.locator('tbody tr:not(:has-text("Đang tải"))');
    await expect(dataRows.first()).toBeVisible({ timeout: 10000 });
    const count = await dataRows.count();
    expect(
      count,
      'Non-Empty Visual Evidence Gate: Table must have at least 1 record'
    ).toBeGreaterThan(0);

    // Capture visual verification screenshot as mandated by RULE-ZERO-PREMATURE-REPORTING-01
    await page.screenshot({
      path: 'frontend/e2e/screenshots/screenshot_api_performance_verified.png',
      fullPage: true
    });
  });
});
