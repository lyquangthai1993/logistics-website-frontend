/**
 * e2e/14-warehouse-inbound-modal-transfer-flow.spec.ts
 *
 * Nhập kho luân chuyển nội bộ (2 bước) trên dữ liệu thật:
 *  - Chuẩn bị (API): Kho HCM nhập 2 đơn (X → Hưng Yên, Y → Đà Nẵng) rồi xuất luân chuyển trên 1 chuyến SD.
 *  - UI (Kho Hưng Yên): Bước 1 chọn đúng chuyến → Bước 2 bảng kê chuyến:
 *      · dòng của kho này tự tick, dòng đi kho khác không tick và ẩn được bằng công tắc;
 *      · số liệu hợp đồng chỉ xem, nhập số thực nhận; chênh lệch bắt buộc lý do;
 *      · xác nhận chỉ gửi dòng đã tick.
 *  - Kiểm tra (API): trạm dừng Hưng Yên = Đã xử lý, Đà Nẵng vẫn Chờ xử lý; phiếu PNK ghi chênh lệch; đơn Y vẫn trên xe.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { loginAs, clearSession } from './helpers/auth';

const API = `${process.env.API_URL ?? 'http://localhost:4001'}/api/v1`;
const SHOT_DIR = path.resolve(__dirname, 'screenshots/14-inbound-transfer');
const HUB = { HCM: 1, DAD: 2, HYN: 3 };
const WH_HCM = 'lyquangthai1993+6@gmail.com';
const WH_HYN = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const
};
const RUN = Date.now().toString().slice(-6);
const TAG = `E2E-LC-${RUN}`;

const unwrap = (j: any) => (j && typeof j === 'object' && 'data' in j ? j.data : j);

async function token(request: APIRequestContext, email: string) {
  const r = await request.post(`${API}/auth/email/login`, { data: { email, password: 'secret' } });
  expect(r.ok()).toBeTruthy();
  return unwrap(await r.json()).token as string;
}

async function call(request: APIRequestContext, t: string, method: 'get' | 'post', url: string, data?: unknown) {
  const r = await request[method](`${API}${url}`, { headers: { Authorization: `Bearer ${t}` }, data });
  const body = await r.json().catch(() => ({}));
  expect(r.status(), `${method.toUpperCase()} ${url}: ${JSON.stringify(body)}`).toBeLessThan(300);
  return unwrap(body);
}

test.describe('Nhập kho luân chuyển nội bộ — bảng kê chuyến & kiểm đếm chọn lọc (dữ liệu thật)', () => {
  test.describe.configure({ retries: 0 });

  test('Kho Hưng Yên dỡ đúng dòng của kho, nhập thực nhận có chênh lệch, dòng đi Đà Nẵng giữ trên xe', async ({
    page,
    request
  }) => {
    test.setTimeout(120_000);
    fs.mkdirSync(SHOT_DIR, { recursive: true });

    // ── Chuẩn bị chuyến luân chuyển HCM → Hưng Yên / Đà Nẵng ──
    const tHCM = await token(request, WH_HCM);
    const tHYN = await token(request, WH_HYN.email);
    const mk = (label: string, dest: number, qty: number) =>
      call(request, tHCM, 'post', '/warehouse/inbound/quick-create', {
        goodsDescription: `${TAG} ${label}`,
        totalQuantity: qty,
        totalWeight: qty * 10,
        totalVolume: qty / 10,
        deliveryMode: 'HUB_L1',
        destinationHubId: dest,
        initialStatus: 'INBOUND',
        licensePlate: `51C-${RUN.slice(-5)}`
      });
    const X = await mk('Đơn X đi Hưng Yên', HUB.HYN, 6);
    const Y = await mk('Đơn Y đi Đà Nẵng', HUB.DAD, 4);
    const transfer = await call(request, tHCM, 'post', '/warehouse/outbound/confirm', {
      orderIds: [X.id, Y.id],
      mode: 'TRANSFER',
      destinationHubId: HUB.DAD,
      licensePlate: `29H-${RUN.slice(-5)}`,
      driverName: `${TAG} Tài xế`
    });
    const tripCode: string = transfer.tripCode;
    expect(tripCode).toMatch(/^SD\d+$/);

    // ── UI: Kho Hưng Yên ──
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, WH_HYN);
    await page.goto('/dashboard/warehouse/inbound');
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Nhận luân chuyển nội bộ' }).click();

    // Bước 1 / 2: chọn chuyến đang đến kho
    await expect(page.getByText(/Bước 1 \/ 2: Chọn chuyến đang đến kho/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/WH_CASE|dd8X5/)).toHaveCount(0);
    await page.locator('input[placeholder*="mã chuyến"]').fill(tripCode);
    const tripCard = page
      .locator('.fixed.inset-0 div.rounded-lg.overflow-hidden.flex.transition-all')
      .filter({ has: page.locator('div.font-mono', { hasText: new RegExp(`^${tripCode}$`) }) });
    await expect(tripCard).toHaveCount(1, { timeout: 15_000 });
    await expect(tripCard.getByText('Chờ xử lý')).toBeVisible();
    await page.screenshot({ path: path.join(SHOT_DIR, '01-chon-chuyen.png') });
    await tripCard.getByRole('button', { name: 'Chọn chuyến' }).click();

    // Bước 2: bảng kê chuyến
    await expect(page.getByText('Lộ trình:')).toBeVisible({ timeout: 15_000 });
    const rowX = page.locator('tbody tr').filter({ hasText: X.orderCode });
    const rowY = page.locator('tbody tr').filter({ hasText: Y.orderCode });
    await expect(rowX).toHaveCount(1);
    await expect(rowY).toHaveCount(1);
    await expect(page.getByLabel(`Dỡ đơn ${X.orderCode} tại kho này`)).toBeChecked();
    await expect(page.getByLabel(`Dỡ đơn ${Y.orderCode} tại kho này`)).not.toBeChecked();
    await expect(rowY.getByText('Đi kho khác')).toBeVisible();

    // Ẩn dòng không thuộc kho này
    await page.getByRole('switch', { name: 'Ẩn các dòng không thuộc kho này' }).click();
    await expect(rowY).toHaveCount(0);
    await page.getByRole('switch', { name: 'Ẩn các dòng không thuộc kho này' }).click();
    await expect(rowY).toHaveCount(1);

    // Thực nhận 5/6 → bắt buộc lý do
    await page.getByLabel(`Số kiện thực nhận đơn ${X.orderCode}`).fill('5');
    const reason = page.getByLabel(`Lý do chênh lệch đơn ${X.orderCode}`);
    await expect(reason).toBeVisible();
    const submit = page.getByRole('button', { name: /Xác nhận nhập kho \(1 dòng\)/ });
    await submit.click();
    await expect(page.getByText(/Vui lòng nhập lý do chênh lệch/).first()).toBeVisible({ timeout: 5_000 });

    await reason.fill(`${TAG} Thiếu 1 kiện khi dỡ xe`);
    await page.screenshot({ path: path.join(SHOT_DIR, '02-kiem-dem.png'), fullPage: true });
    const confirmResp = page.waitForResponse(
      (r) => r.url().includes('/warehouse/inbound/confirm') && r.request().method() === 'POST'
    );
    await submit.click();
    const resp = await confirmResp;
    expect(resp.status()).toBeLessThan(300);
    const sent = resp.request().postDataJSON();
    expect(sent.tripCode).toBe(tripCode);
    expect(sent.orders).toHaveLength(1);
    expect(sent.orders[0]).toMatchObject({ id: X.id, actualQuantity: 5, expectedQuantity: 6 });
    expect(sent.orders[0].totalQuantity, 'locked contract never sent').toBeUndefined();

    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: path.join(SHOT_DIR, '03-sau-xac-nhan.png'), fullPage: true });

    // ── Kiểm tra dữ liệu sau nhập ──
    const mHYN = await call(request, tHYN, 'get', `/warehouse/trips/${tripCode}/manifest`);
    expect(mHYN.currentHubStatus).toBe('COMPLETED');
    expect(mHYN.stops.find((s: any) => s.hubId === HUB.DAD)?.status).toBe('PENDING');
    const lineY = mHYN.lines.find((l: any) => l.id === Y.id);
    expect(lineY?.inTransitQuantity, 'Đơn Y vẫn trên xe').toBe(4);

    const ledX = await call(request, tHYN, 'get', `/orders/${X.id}/ledger`);
    const pnk = ledX.find((e: any) => e.type === 'INBOUND' && e.hubId === HUB.HYN);
    expect(pnk?.quantity).toBe(5);
    expect(pnk?.discrepancyQuantity).toBe(-1);
    expect(pnk?.discrepancyReason).toContain('Thiếu 1 kiện');
  });
});
