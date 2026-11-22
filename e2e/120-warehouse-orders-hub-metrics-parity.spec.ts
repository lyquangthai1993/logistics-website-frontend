import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  USER_ADMIN,
  USER_WAREHOUSE_DAD,
  USER_WAREHOUSE_HCM,
  USER_WAREHOUSE_HYN,
  loginAs
} from './helpers/auth';

type WarehouseOrder = {
  orderCode?: string;
  totalQuantity?: number | string | null;
  totalWeight?: number | string | null;
  totalVolume?: number | string | null;
};

type WarehouseResponse = {
  data?: WarehouseOrder[];
  meta?: { total?: number; totalQuantity?: number; totalWeight?: number; totalVolume?: number };
};

type WarehouseSummaryResponse = {
  data?: {
    hubId?: number | null;
    quantity?: number;
    weightKg?: number;
    volumeCbm?: number;
    orderCount?: number;
  };
};

type Hub = { id: number; name: string };

const API_BASE = (process.env.API_URL ?? 'http://localhost:4001/api/v1').replace(/\/$/, '');

const WAREHOUSE_CASES = [
  { username: 'warehouse_hcm', hubName: 'Andromeda Hub - HCM', user: USER_WAREHOUSE_HCM },
  { username: 'warehouse_dad', hubName: 'Magellan Hub - Đà Nẵng', user: USER_WAREHOUSE_DAD },
  { username: 'warehouse_hyn', hubName: 'Polaris Hub - Hưng Yên', user: USER_WAREHOUSE_HYN }
] as const;

function numberOf(value: unknown): number {
  return Number(value ?? 0) || 0;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function displayNumber(value: unknown, decimals: number): string {
  const rounded = round(numberOf(value), decimals);
  return String(rounded);
}

function displayMetric(value: unknown, decimals: number): string {
  return round(numberOf(value), decimals).toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

async function loginToken(request: APIRequestContext, identifier: string, password: string) {
  const response = await request.post(`${API_BASE}/auth/email/login`, {
    data: { email: identifier, password }
  });
  expect(response.ok(), `Đăng nhập API thất bại cho ${identifier}`).toBeTruthy();
  const body = await response.json();
  const token = body?.data?.token ?? body?.token;
  expect(token, `Không nhận được access token cho ${identifier}`).toBeTruthy();
  return token as string;
}

async function getHub(request: APIRequestContext, adminToken: string, hubName: string): Promise<Hub> {
  const response = await request.get(`${API_BASE}/hubs/active`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  expect(response.ok(), 'Không tải được danh sách Hub đang hoạt động').toBeTruthy();
  const payload = await response.json();
  const hubs = (Array.isArray(payload) ? payload : payload?.data ?? []) as Hub[];
  const hub = hubs.find((item) => item.name === hubName);
  expect(hub, `Không tìm thấy Hub ${hubName}`).toBeTruthy();
  return hub as Hub;
}

async function queryAllOrders(
  request: APIRequestContext,
  token: string,
  hubId?: number
): Promise<WarehouseResponse> {
  const query = new URLSearchParams({ groupBy: 'orderCode', isExport: 'true', limit: '5000' });
  if (hubId !== undefined) query.set('hubId', String(hubId));

  const response = await request.get(`${API_BASE}/warehouse/orders?${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(response.ok(), `Query Đơn hàng kho thất bại: ${response.status()}`).toBeTruthy();
  return (await response.json()) as WarehouseResponse;
}

async function querySummary(request: APIRequestContext, token: string): Promise<WarehouseSummaryResponse> {
  const response = await request.get(`${API_BASE}/warehouse/orders/summary`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(response.ok(), `API tổng hợp Đơn hàng kho thất bại: ${response.status()}`).toBeTruthy();
  return (await response.json()) as WarehouseSummaryResponse;
}

function aggregate(rows: WarehouseOrder[]) {
  return {
    orderCount: rows.length,
    quantity: rows.reduce((sum, row) => sum + numberOf(row.totalQuantity), 0),
    weightKg: round(rows.reduce((sum, row) => sum + numberOf(row.totalWeight), 0), 2),
    volumeCbm: round(rows.reduce((sum, row) => sum + numberOf(row.totalVolume), 0), 3)
  };
}

async function reloadAndCaptureOrders(page: Page): Promise<WarehouseResponse> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/warehouse/orders?') &&
      response.request().method() === 'GET' &&
      new URL(response.url()).searchParams.get('groupBy') === 'orderCode' &&
      new URL(response.url()).searchParams.get('isExport') !== 'true',
    { timeout: 30_000 }
  );
  await page.goto('/dashboard/warehouse/orders');
  const response = await responsePromise;
  expect(response.ok(), 'API mà hình Đơn hàng kho trả lỗi').toBeTruthy();
  return (await response.json()) as WarehouseResponse;
}

test.describe('Đối chiếu tổng Đơn hàng kho theo Hub', () => {
  test.describe.configure({ mode: 'serial' });

  for (const testCase of WAREHOUSE_CASES) {
    test(`${testCase.username} chỉ nhận đúng tổng kiện, kg và m³ của ${testCase.hubName}`, async ({ page, request }) => {
      const adminToken = await loginToken(
        request,
        USER_ADMIN.username ?? USER_ADMIN.email,
        USER_ADMIN.password
      );
      const hub = await getHub(request, adminToken, testCase.hubName);
      const adminReference = await queryAllOrders(request, adminToken, hub.id);
      const expected = aggregate(adminReference.data ?? []);

      expect(expected.orderCount, `Hub ${testCase.hubName} không có dữ liệu để đối chiếu`).toBeGreaterThan(0);

      await loginAs(page, testCase.user);
      const screenResponse = await reloadAndCaptureOrders(page);
      const screenRows = screenResponse.data ?? [];
      const summaryRow = page.getByTestId('admin-orders-metrics-boxes');
      await expect(summaryRow).toBeVisible();
      const screenCodes = new Set(screenRows.map((row) => row.orderCode).filter(Boolean));
      const referenceByCode = new Map(
        (adminReference.data ?? []).map((row) => [row.orderCode, row])
      );

      await expect(page.locator('tbody tr').filter({ hasText: screenRows[0]?.orderCode ?? '' }).first()).toBeVisible();

      expect(screenResponse.meta?.total).toBeLessThanOrEqual(expected.orderCount);
      for (const row of screenRows) {
        const reference = referenceByCode.get(row.orderCode);
        expect(reference, `${testCase.username} nhận nhầm đơn ${row.orderCode}`).toBeTruthy();
        expect(numberOf(row.totalQuantity)).toBe(numberOf(reference?.totalQuantity));
        expect(round(numberOf(row.totalWeight), 2)).toBe(round(numberOf(reference?.totalWeight), 2));
        expect(round(numberOf(row.totalVolume), 3)).toBe(round(numberOf(reference?.totalVolume), 3));

        const uiRow = page.locator('tbody tr').filter({ hasText: row.orderCode ?? '' }).first();
        await expect(uiRow).toBeVisible();
        const uiCells = uiRow.locator('td');
        await expect(uiCells.nth(4)).toContainText(`/ ${displayNumber(row.totalQuantity, 0)}`);
        await expect(uiCells.nth(5)).toHaveText(displayNumber(row.totalWeight, 2));
        await expect(uiCells.nth(6)).toHaveText(displayNumber(row.totalVolume, 2));
      }

      const warehouseToken = await loginToken(
        request,
        testCase.user.username ?? testCase.user.email,
        testCase.user.password
      );
      const warehouseAllOrders = await queryAllOrders(request, warehouseToken);
      const warehouseSummary = await querySummary(request, warehouseToken);
      const actual = aggregate(warehouseAllOrders.data ?? []);
      const summary = warehouseSummary.data ?? {};

      expect(actual).toEqual(expected);
      expect(screenCodes.size).toBe(screenRows.length);
      expect(warehouseAllOrders.meta?.total).toBe(expected.orderCount);
      expect(warehouseAllOrders.meta?.totalQuantity).toBe(expected.quantity);
      expect(round(numberOf(warehouseAllOrders.meta?.totalWeight), 2)).toBe(expected.weightKg);
      expect(round(numberOf(warehouseAllOrders.meta?.totalVolume), 3)).toBe(expected.volumeCbm);
      expect(summary.hubId).toBe(hub.id);
      expect(summary.quantity).toBe(expected.quantity);
      expect(round(numberOf(summary.weightKg), 2)).toBe(expected.weightKg);
      expect(round(numberOf(summary.volumeCbm), 3)).toBe(expected.volumeCbm);
      expect(summary.orderCount).toBe(expected.orderCount);
      await expect(page.getByTestId('admin-metric-quantity')).toHaveText(displayMetric(expected.quantity, 0));
      await expect(page.getByTestId('admin-metric-weight')).toHaveText(displayMetric(expected.weightKg, 2));
      await expect(page.getByTestId('admin-metric-volume')).toHaveText(displayMetric(expected.volumeCbm, 2));
    });
  }
});
