/**
 * e2e/25-master-contract-and-trip-stops.spec.ts
 *
 * IMPLEMENT_STATUS_TRIP_AND_ORDER.md v2.1.0 — Phase 4 verification on REAL DB data (no mocks).
 *
 * Scenario (hubs: 1 = HCM, 2 = Đà Nẵng, 3 = Hưng Yên):
 *  1. Kho HCM nhập 3 đơn (A → ĐN, B/C → HY) trên 1 xe: mã chuyến SDn + phiếu PNK. Đơn nháp D không sinh phiếu.
 *  2. Hợp đồng gốc bất biến: Dispatcher / Super Admin sửa trường hợp đồng sau DRAFT → 403; giữ nguyên giá trị → OK;
 *     đơn nháp vẫn sửa được.
 *  3. Super Admin điều chỉnh hợp đồng gốc (bắt buộc lý do) → phiếu DCH trong sổ.
 *  4. Kho HCM xuất luân chuyển cả 3 đơn trên 1 chuyến SD: phiếu PXK, trạm dừng HCM = Đã xử lý, ĐN/HY = Chờ xử lý.
 *  5. Kho ĐN dỡ chọn lọc chỉ đơn A, thực nhận 9/10 kèm lý do → PNK có chênh lệch; ĐN = Đã xử lý, HY vẫn Chờ xử lý;
 *     B/C vẫn trên xe; hợp đồng A không đổi; nhập trùng bị chặn.
 *  6. Kho HY dỡ B/C → HY = Đã xử lý; tại HCM đơn B hiển thị "Đã xuất kho".
 *  7. UI chi tiết đơn: badge "HỢP ĐỒNG GỐC - BẤT BIẾN", nút điều chỉnh chỉ SUPER_ADMIN, dòng thời gian phiếu.
 *
 * Test data is tagged with the "E2E-MC" prefix in goods descriptions / license plates.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { loginAs, clearSession, TEST_USERS } from './helpers/auth';

const API = `${process.env.API_URL ?? 'http://localhost:4001'}/api/v1`;
const PASSWORD = 'secret';
const ACC = {
  admin: 'lyquangthai1993+1@gmail.com',
  dispatcher: 'lyquangthai1993+2@gmail.com',
  whHYN: 'lyquangthai1993+4@gmail.com', // hub 3
  whDAD: 'lyquangthai1993+5@gmail.com', // hub 2
  whHCM: 'lyquangthai1993+6@gmail.com' // hub 1
};
const HUB = { HCM: 1, DAD: 2, HYN: 3 };
const SHOT_DIR = path.resolve(__dirname, 'screenshots/25-master-contract');

const RUN = Date.now().toString().slice(-6);
const TAG = `E2E-MC-${RUN}`;

type Json = Record<string, any>;
const unwrap = (j: Json) => (j && typeof j === 'object' && 'data' in j ? j.data : j);

const tokens: Record<string, string> = {};
const state: {
  intakeTripCode?: string;
  orders: Record<'A' | 'B' | 'C' | 'D', Json>;
  transferTripCode?: string;
  transferInvoice?: string;
} = { orders: {} as any };

async function login(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/email/login`, { data: { email, password: PASSWORD } });
  expect(res.status(), `login ${email}`).toBeLessThan(300);
  const d = unwrap(await res.json());
  return d.token as string;
}

const auth = (key: keyof typeof ACC) => ({ Authorization: `Bearer ${tokens[key]}` });

async function api(
  request: APIRequestContext,
  method: 'get' | 'post' | 'patch',
  url: string,
  who: keyof typeof ACC,
  data?: unknown
) {
  const res = await request[method](`${API}${url}`, { headers: auth(who), data });
  const body = await res.json().catch(() => ({}));
  return { status: res.status(), body, data: unwrap(body) };
}

async function ledger(request: APIRequestContext, orderId: number) {
  const r = await api(request, 'get', `/orders/${orderId}/ledger`, 'admin');
  expect(r.status).toBe(200);
  return r.data as Json[];
}

async function manifest(request: APIRequestContext, tripCode: string, who: keyof typeof ACC) {
  const r = await api(request, 'get', `/warehouse/trips/${encodeURIComponent(tripCode)}/manifest`, who);
  expect(r.status, `manifest ${tripCode} as ${who}`).toBe(200);
  return r.data as Json;
}

async function hubRow(request: APIRequestContext, who: keyof typeof ACC, orderCode: string) {
  const r = await api(
    request,
    'get',
    `/warehouse/orders?search=${encodeURIComponent(orderCode)}&limit=20&page=1`,
    who
  );
  expect(r.status).toBe(200);
  const rows: Json[] = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
  return rows.find((o) => o.orderCode === orderCode);
}

test.describe.serial('Hợp đồng gốc bất biến & trạng thái chuyến theo kho (dữ liệu thật)', () => {
  // Real-DB writes: never retry (a retry would duplicate test orders/invoices)
  test.describe.configure({ retries: 0 });
  test.beforeAll(async ({ request }) => {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    for (const key of Object.keys(ACC) as (keyof typeof ACC)[]) {
      tokens[key] = await login(request, ACC[key]);
    }
  });

  test('1. Kho HCM nhập kho: mã chuyến SD + phiếu PNK; đơn nháp không sinh phiếu', async ({ request }) => {
    const plate = `51C-${RUN.slice(-5)}`;
    const specs: Array<[keyof typeof state.orders, number, number, number, number, string]> = [
      ['A', HUB.DAD, 10, 120, 1.2, 'INBOUND'],
      ['B', HUB.HYN, 8, 80, 0.8, 'INBOUND'],
      ['C', HUB.HYN, 5, 50, 0.5, 'INBOUND']
    ];
    for (const [key, dest, qty, kg, m3, status] of specs) {
      const r = await api(request, 'post', '/warehouse/inbound/quick-create', 'whHCM', {
        goodsDescription: `${TAG} Đơn ${key}`,
        totalQuantity: qty,
        totalWeight: kg,
        totalVolume: m3,
        deliveryMode: 'HUB_L1',
        destinationHubId: dest,
        initialStatus: status,
        licensePlate: plate,
        driverName: `${TAG} Tài xế nhập`,
        ...(state.intakeTripCode ? { tripCode: state.intakeTripCode } : {})
      });
      expect(r.status, JSON.stringify(r.body)).toBeLessThan(300);
      const order = r.data;
      state.orders[key] = order;
      const tripCode = order.trips?.[0]?.tripCode;
      expect(tripCode, 'intake trip code').toMatch(/^SD\d+$/);
      state.intakeTripCode = state.intakeTripCode ?? tripCode;
      expect(tripCode).toBe(state.intakeTripCode);
      expect(order.currentHubId).toBe(HUB.HCM);
    }

    const draft = await api(request, 'post', '/warehouse/inbound/quick-create', 'whHCM', {
      goodsDescription: `${TAG} Đơn D nháp`,
      totalQuantity: 3,
      totalWeight: 30,
      totalVolume: 0.3,
      deliveryMode: 'HUB_L1',
      destinationHubId: HUB.DAD,
      initialStatus: 'DRAFT',
      licensePlate: `51D-${RUN.slice(-5)}`
    });
    expect(draft.status, JSON.stringify(draft.body)).toBeLessThan(300);
    state.orders.D = draft.data;

    const ledA = await ledger(request, state.orders.A.id);
    const pnk = ledA.find((e) => e.type === 'INBOUND');
    expect(pnk?.invoiceCode, 'PNK invoice').toMatch(/^PNK/);
    expect(pnk?.hubId).toBe(HUB.HCM);
    expect(pnk?.quantity).toBe(10);

    expect(await ledger(request, state.orders.D.id)).toHaveLength(0);
  });

  test('2. Hợp đồng gốc bất biến sau DRAFT (403), giữ nguyên giá trị vẫn OK, đơn nháp sửa được', async ({
    request
  }) => {
    const A = state.orders.A;

    const byDispatcher = await api(request, 'patch', `/orders/${A.id}`, 'dispatcher', {
      totalQuantity: 11
    });
    expect(byDispatcher.status).toBe(403);
    expect(String(byDispatcher.body?.message ?? '')).toMatch(/Hợp đồng gốc/);

    const byAdmin = await api(request, 'patch', `/orders/${A.id}`, 'admin', { totalWeight: 999 });
    expect(byAdmin.status).toBe(403);

    const byWarehouse = await api(request, 'patch', `/orders/${A.id}`, 'whHCM', { totalQuantity: 11 });
    expect(byWarehouse.status).toBe(403);

    const unchanged = await api(request, 'patch', `/orders/${A.id}`, 'dispatcher', {
      totalQuantity: 10
    });
    expect(unchanged.status, JSON.stringify(unchanged.body)).toBeLessThan(300);

    const draftEdit = await api(request, 'patch', `/orders/${state.orders.D.id}`, 'dispatcher', {
      totalQuantity: 4
    });
    expect(draftEdit.status, JSON.stringify(draftEdit.body)).toBeLessThan(300);
    expect(draftEdit.data.totalQuantity).toBe(4);
  });

  test('3. Super Admin điều chỉnh hợp đồng gốc: bắt buộc lý do, ghi phiếu DCH', async ({ request }) => {
    const A = state.orders.A;
    const url = `/orders/${A.id}/admin-override`;

    expect((await api(request, 'patch', url, 'dispatcher', { totalWeight: 125, auditReason: 'x' })).status).toBe(
      403
    );
    const noReason = await api(request, 'patch', url, 'admin', { totalWeight: 125 });
    expect([400, 422]).toContain(noReason.status);
    const noop = await api(request, 'patch', url, 'admin', { totalWeight: 120, auditReason: `${TAG} không đổi` });
    expect(noop.status).toBe(422);

    const ok = await api(request, 'patch', url, 'admin', {
      totalWeight: 125,
      auditReason: `${TAG} Cân lại tại kho, khách xác nhận 125 kg`
    });
    expect(ok.status, JSON.stringify(ok.body)).toBeLessThan(300);
    expect(Number(ok.data.totalWeight)).toBe(125);
    expect(ok.data.totalQuantity).toBe(10);

    const dch = (await ledger(request, A.id)).find((e) => e.type === 'ADJUSTMENT');
    expect(dch?.invoiceCode).toMatch(/^DCH/);
    expect(dch?.discrepancyReason).toContain('Cân lại tại kho');
    expect(dch?.notes).toContain('Khối lượng');
  });

  test('4. Kho HCM xuất luân chuyển 1 chuyến SD: phiếu PXK, trạm dừng theo kho', async ({ request }) => {
    const { A, B, C } = state.orders;
    const r = await api(request, 'post', '/warehouse/outbound/confirm', 'whHCM', {
      orderIds: [A.id, B.id, C.id],
      mode: 'TRANSFER',
      destinationHubId: HUB.HYN,
      licensePlate: `29H-${RUN.slice(-5)}`,
      driverName: `${TAG} Tài xế trung chuyển`
    });
    expect(r.status, JSON.stringify(r.body)).toBeLessThan(300);
    state.transferTripCode = r.data.tripCode;
    state.transferInvoice = r.data.invoiceCode;
    expect(state.transferTripCode).toMatch(/^SD\d+$/);
    expect(state.transferTripCode).not.toBe(state.intakeTripCode);
    expect(state.transferInvoice).toMatch(/^PXK/);

    const m = await manifest(request, state.transferTripCode!, 'whDAD');
    const stop = (hubId: number) => m.stops.find((s: Json) => s.hubId === hubId);
    expect(stop(HUB.HCM)?.status).toBe('COMPLETED');
    expect(stop(HUB.DAD)?.status).toBe('PENDING');
    expect(stop(HUB.HYN)?.status).toBe('PENDING');
    expect(m.currentHubId).toBe(HUB.DAD);
    expect(m.currentHubStatus).toBe('PENDING');
    expect(m.lines).toHaveLength(3);
    const line = (id: number) => m.lines.find((l: Json) => l.id === id);
    expect(line(A.id)?.isForCurrentHub).toBe(true);
    expect(line(B.id)?.isForCurrentHub).toBe(false);
    expect(line(C.id)?.isForCurrentHub).toBe(false);
    expect(line(A.id)?.inTransitQuantity).toBe(10);

    const trips = await api(request, 'get', '/warehouse/inbound-trips?limit=50', 'whDAD');
    expect(trips.status).toBe(200);
    const list: Json[] = Array.isArray(trips.data) ? trips.data : [];
    const t = list.find((x) => x.tripCode === state.transferTripCode);
    expect(t, 'transfer trip visible to Đà Nẵng').toBeTruthy();
    expect(t?.hubStatus ?? t?.status).toBe('PENDING');
  });

  test('5. Kho Đà Nẵng dỡ chọn lọc đơn A (9/10 kèm lý do), các đơn đi HY giữ trên xe', async ({ request }) => {
    const { A, B, C } = state.orders;
    const tripCode = state.transferTripCode!;

    const noReasonBody = {
      tripCode,
      licensePlate: `29H-${RUN.slice(-5)}`,
      targetStatus: 'INBOUND',
      orders: [
        {
          id: A.id,
          orderCode: A.orderCode,
          actualQuantity: 9,
          expectedQuantity: 10,
          discrepancyReason: `${TAG} Thiếu 1 kiện do rách bao bì`
        }
      ]
    };
    const r = await api(request, 'post', '/warehouse/inbound/confirm', 'whDAD', noReasonBody);
    expect(r.status, JSON.stringify(r.body)).toBeLessThan(300);
    expect(r.data.invoiceCode).toMatch(/^PNK/);

    const dup = await api(request, 'post', '/warehouse/inbound/confirm', 'whDAD', noReasonBody);
    expect(dup.status, 'duplicate receipt must be blocked').toBe(422);

    const pnkDAD = (await ledger(request, A.id)).find((e) => e.type === 'INBOUND' && e.hubId === HUB.DAD);
    expect(pnkDAD?.quantity).toBe(9);
    expect(pnkDAD?.expectedQuantity).toBe(10);
    expect(pnkDAD?.discrepancyQuantity).toBe(-1);
    expect(pnkDAD?.discrepancyReason).toContain('rách bao bì');
    expect(pnkDAD?.tripCode).toBe(tripCode);

    const orderA = await api(request, 'get', `/orders/${A.id}`, 'admin');
    expect(orderA.data.totalQuantity, 'contract quantity untouched').toBe(10);
    expect(orderA.data.currentHubId).toBe(HUB.DAD);

    const mDAD = await manifest(request, tripCode, 'whDAD');
    expect(mDAD.currentHubStatus).toBe('COMPLETED');
    expect(mDAD.lines.find((l: Json) => l.id === A.id)?.isReceivedHere).toBe(true);
    expect(mDAD.lines, 'other hubs lines are never removed').toHaveLength(3);

    const mHYN = await manifest(request, tripCode, 'whHYN');
    expect(mHYN.currentHubId).toBe(HUB.HYN);
    expect(mHYN.currentHubStatus).toBe('PENDING');
    for (const o of [B, C]) {
      const l = mHYN.lines.find((x: Json) => x.id === o.id);
      expect(l?.isForCurrentHub).toBe(true);
      expect(l?.isReceivedHere).toBe(false);
      expect(l?.inTransitQuantity).toBe(o.totalQuantity);
    }

    const rowDAD = await hubRow(request, 'whDAD', A.orderCode);
    expect(rowDAD?.hubStock).toBe(9);
  });

  test('6. Kho Hưng Yên dỡ B/C → HY Đã xử lý; tại HCM đơn B là "Đã xuất kho"', async ({ request }) => {
    const { B, C } = state.orders;
    const tripCode = state.transferTripCode!;
    const r = await api(request, 'post', '/warehouse/inbound/confirm', 'whHYN', {
      tripCode,
      licensePlate: `29H-${RUN.slice(-5)}`,
      targetStatus: 'INBOUND',
      orders: [B, C].map((o) => ({
        id: o.id,
        orderCode: o.orderCode,
        actualQuantity: o.totalQuantity,
        expectedQuantity: o.totalQuantity
      }))
    });
    expect(r.status, JSON.stringify(r.body)).toBeLessThan(300);

    const m = await manifest(request, tripCode, 'whHYN');
    expect(m.currentHubStatus).toBe('COMPLETED');
    expect(m.stops.every((s: Json) => s.status === 'COMPLETED')).toBe(true);

    const rowHYN = await hubRow(request, 'whHYN', B.orderCode);
    expect(rowHYN?.hubStock).toBe(B.totalQuantity);

    const rowHCM = await hubRow(request, 'whHCM', B.orderCode);
    if (rowHCM) {
      expect(rowHCM.hubStatus).toBe('COMPLETED_INBOUND');
      expect(rowHCM.hubStock ?? 0).toBe(0);
    }
  });

  test('7. UI chi tiết đơn: badge bất biến, nút điều chỉnh chỉ cho SUPER_ADMIN, dòng thời gian phiếu', async ({
    page
  }) => {
    test.setTimeout(90_000);
    const A = state.orders.A;
    const dispatcher = TEST_USERS.find((u) => u.role === 'DISPATCHER')!;
    const admin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
    await page.setViewportSize({ width: 1440, height: 900 });

    await clearSession(page);
    await loginAs(page, dispatcher);
    await page.goto(`/dashboard/orders/${A.id}`);
    await expect(page.getByText('HỢP ĐỒNG GỐC - BẤT BIẾN')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /Điều chỉnh hợp đồng gốc/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Sửa$/ })).toHaveCount(0);
    await expect(page.getByText(/PNK/).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/PXK/).first()).toBeVisible();
    await expect(page.getByText(/DCH/).first()).toBeVisible();
    await expect(page.getByText(/rách bao bì/).first()).toBeVisible();
    // Bộ đếm tồn kho tính theo kho hiện tại (Đà Nẵng nhận 9/10), không cộng dồn HCM 10 + ĐN 9
    await expect(page.getByTestId('hub-stock-hub')).toHaveText(/Đà Nẵng/);
    await expect(page.getByTestId('hub-stock-inbound')).toHaveText('9');
    await expect(page.getByTestId('hub-stock-outbound')).toHaveText('0');
    await expect(page.getByTestId('hub-stock-available')).toHaveText('9');
    await page.screenshot({ path: path.join(SHOT_DIR, '01-dispatcher-order-detail.png'), fullPage: true });

    await clearSession(page);
    await loginAs(page, admin);
    await page.goto(`/dashboard/orders/${A.id}`);
    const overrideBtn = page.getByRole('button', { name: /Điều chỉnh hợp đồng gốc/ });
    await expect(overrideBtn).toBeVisible({ timeout: 20_000 });
    await overrideBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: path.join(SHOT_DIR, '02-admin-override-dialog.png'), fullPage: true });
  });
});
