import { test, expect, type APIRequestContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import {
  loginAs,
  USER_ADMIN,
  USER_WAREHOUSE_HCM,
  type LoginCredentials
} from './helpers/auth';

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://backend-tms-core-dev.up.railway.app/api/v1';

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../feedbacks/feedback_task_116_outbound_calc_deleted_trips_excel_step0'
);

async function loginViaApi(
  request: APIRequestContext,
  creds: LoginCredentials,
  apiUrl: string
): Promise<{ token: string; user: any }> {
  const res = await request.post(`${apiUrl}/auth/email/login`, {
    data: {
      email: creds.username || creds.email,
      password: creds.password
    },
    timeout: 15000
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const payload = body?.data ?? body;
  return {
    token: payload?.token || payload?.accessToken,
    user: payload?.user
  };
}

test.describe.serial(
  'Task 116: Outbound Calculator Tam Suất, Super Admin Deleted Trips, Updated Receipt Dates, Excel Slide 2 & 3, and Order Detail Step 0 Draft Vehicle Tracking',
  () => {
    let hcmToken = '';
    let adminToken = '';
    let testOrderCode = '';
    let testOrderId = 0;
    let deletedOutboundTripCode = '';

    test.beforeAll(async ({ request }) => {
      if (!fs.existsSync(EVIDENCE_DIR)) {
        fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
      }

      const hcmAuth = await loginViaApi(request, USER_WAREHOUSE_HCM, API_URL);
      hcmToken = hcmAuth.token;
      expect(hcmToken).toBeTruthy();

      const adminAuth = await loginViaApi(request, USER_ADMIN, API_URL);
      adminToken = adminAuth.token;
      expect(adminToken).toBeTruthy();

      // Seed exact user scenario:
      // Xe 1: 100 kiện, 30 m3, 20 kg
      // Xe 2: 100 kiện, 20 m3, 15 kg
      // TỔNG: 200 kiện, 50 m3, 35 kg
      const uniqueSuffix = Date.now().toString().slice(-6);
      testOrderCode = `T116-${uniqueSuffix}`;
      const hubId = Number(hcmAuth.user?.hub?.id || hcmAuth.user?.hubId || 1);

      const createXe1Res = await request.post(`${API_URL}/warehouse/inbound/batch-create`, {
        headers: {
          Authorization: `Bearer ${hcmToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          licensePlate: `51C-${uniqueSuffix.slice(0, 3)}.01`,
          driverName: 'Tài Xế Xe 1',
          receiveDate: new Date().toISOString().split('T')[0],
          hubId,
          items: [
            {
              orderCode: testOrderCode,
              pickupAddress: 'Kho HCM',
              goodsDescription: `Hàng Test Tam Suất ${uniqueSuffix}`,
              totalQuantity: 100,
              totalVolume: 30,
              totalWeight: 20,
              deliveryMode: 'DIRECT_CUSTOMER',
              deliveryAddress: 'Quận 1, TP.HCM',
              province: 'Hồ Chí Minh',
              accompanyingDocs: 'HĐ-116',
              notes: 'Xe 1: 100 kiện, 30m3, 20kg',
              initialStatus: 'INBOUND'
            }
          ]
        },
        timeout: 15000
      });
      expect(createXe1Res.ok()).toBeTruthy();

      const createXe2Res = await request.post(`${API_URL}/warehouse/inbound/batch-create`, {
        headers: {
          Authorization: `Bearer ${hcmToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          licensePlate: `51C-${uniqueSuffix.slice(0, 3)}.02`,
          driverName: 'Tài Xế Xe 2',
          receiveDate: new Date().toISOString().split('T')[0],
          hubId,
          items: [
            {
              orderCode: testOrderCode,
              pickupAddress: 'Kho HCM',
              goodsDescription: `Hàng Test Tam Suất ${uniqueSuffix}`,
              totalQuantity: 100,
              totalVolume: 20,
              totalWeight: 15,
              deliveryMode: 'DIRECT_CUSTOMER',
              deliveryAddress: 'Quận 1, TP.HCM',
              province: 'Hồ Chí Minh',
              accompanyingDocs: 'HĐ-116',
              notes: 'Xe 2: 100 kiện, 20m3, 15kg',
              initialStatus: 'INBOUND'
            }
          ]
        },
        timeout: 15000
      });
      expect(createXe2Res.ok()).toBeTruthy();
      const createJson = await createXe2Res.json();
      const createdPayload = createJson?.data ?? createJson;
      const createdOrders =
        createdPayload?.orders || createdPayload?.items || createdPayload?.data || [];
      const createdOrderId = createdOrders[0]?.id || createdPayload?.id;
      expect(createdOrderId).toBeTruthy();
      testOrderId = Number(createdOrderId);

      // Create an outbound draft trip and immediately cancel/delete it so Super Admin has a guaranteed DELETED trip to inspect
      if (createdOrderId) {
        const draftRes = await request.post(`${API_URL}/warehouse/outbound/draft`, {
          headers: {
            Authorization: `Bearer ${hcmToken}`,
            'Content-Type': 'application/json'
          },
          data: {
            orderIds: [Number(createdOrderId)],
            licensePlate: `51D-${uniqueSuffix.slice(0, 3)}.99`,
            driverName: 'Tài Xế Nháp Xóa',
            dispatchDate: new Date().toISOString().split('T')[0],
            mode: 'CUSTOMER',
            items: [
              {
                orderId: Number(createdOrderId),
                quantityToExport: 10,
                weightToExport: 2,
                volumeToExport: 3,
                deliveryAddress: 'Quận 7, TP.HCM'
              }
            ]
          },
          timeout: 15000
        });
        expect(draftRes.ok()).toBeTruthy();
        const draftJson = await draftRes.json();
        const draftPayload = draftJson?.data ?? draftJson;
        deletedOutboundTripCode = draftPayload?.tripCode || '';
        expect(deletedOutboundTripCode).toBeTruthy();

        const delRes = await request.delete(
          `${API_URL}/warehouse/outbound/drafts/${encodeURIComponent(deletedOutboundTripCode)}`,
          {
            headers: {
              Authorization: `Bearer ${hcmToken}`
            },
            timeout: 15000
          }
        );
        expect(delRes.ok()).toBeTruthy();
      }
    });

    test('CASE-01: Outbound Quantity Input + Calculator Icon Button (Tam Suất XUẤT-1 -> XUẤT-2 Residual m3 & kg = 0)', async ({
      page,
      request
    }) => {
      await loginAs(page, USER_WAREHOUSE_HCM, BASE_URL);
      await page.goto(`${BASE_URL}/dashboard/warehouse/outbound`, {
        waitUntil: 'domcontentloaded'
      });

      await expect(page.getByRole('button', { name: /Tất cả/i }).first()).toBeVisible({
        timeout: 15000
      });

      const createNoteBtn = page
        .locator('main')
        .getByRole('button', { name: /^Xuất kho$/i })
        .first();
      await expect(createNoteBtn).toBeVisible({ timeout: 15000 });
      await createNoteBtn.click();

      // Enter testOrderCode into row 0 orderCode input and trigger search
      const orderInput = page.locator('table tbody tr').first().locator('input').first();
      if (!(await orderInput.isVisible({ timeout: 3000 }).catch(() => false))) {
        await createNoteBtn.click();
      }
      await expect(orderInput).toBeVisible({ timeout: 10000 });
      await orderInput.fill(testOrderCode);
      await orderInput.press('Enter');

      const qtyInput = page.getByTestId('input-quantity-0');
      const calcBtn = page.getByTestId('btn-calc-proportional-0');
      const weightInput = page.getByTestId('input-weight-0');
      const volumeInput = page.getByTestId('input-volume-0');

      await expect(qtyInput).toBeVisible({ timeout: 10000 });
      await expect(calcBtn).toBeVisible({ timeout: 10000 });

      // Wait until order lookup hydrates TỔNG = 200 kiện, volume = 50 m3, weight = 35 kg
      await expect(qtyInput).toHaveValue('200', { timeout: 10000 });
      await expect(volumeInput).toHaveValue('50');
      await expect(weightInput).toHaveValue('35');
      await expect(calcBtn).toHaveAttribute('data-active', 'false');

      // ── XUẤT-1: 50 kiện (< 200 availStock) ──
      // Calculator button lights up (data-active="true"), weight & volume remain 35 & 50 until clicked
      await qtyInput.fill('50');
      await expect(calcBtn).toHaveAttribute('data-active', 'true');
      await expect(volumeInput).toHaveValue('50');
      await expect(weightInput).toHaveValue('35');

      // Click the highlighted calculator button -> applies proportional formula:
      // 50/200 => volume = 50/4 = 12.5 m3, weight = 35/4 = 8.75 kg
      await calcBtn.click();
      await expect(volumeInput).toHaveValue('12.5');
      await expect(weightInput).toHaveValue('8.75');

      const calcScreenshot = path.join(EVIDENCE_DIR, 'screenshot_outbound_calc_verified.png');
      await page.screenshot({ path: calcScreenshot, fullPage: false });
      expect(fs.existsSync(calcScreenshot)).toBeTruthy();

      // Confirm XUẤT-1 (50 kiện, 12.5 m3, 8.75 kg) so remaining stock is 150 kiện, 37.5 m3 (50 - 50/4), 26.25 kg (35 - 35/4)
      const confirmXuat1Res = await request.post(`${API_URL}/warehouse/outbound/confirm`, {
        headers: {
          Authorization: `Bearer ${hcmToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          orderIds: [testOrderId],
          licensePlate: '51D-116.01',
          driverName: 'Tài Xế Xuất 1',
          dispatchDate: new Date().toISOString().split('T')[0],
          mode: 'CUSTOMER',
          items: [
            {
              orderId: testOrderId,
              quantityToExport: 50,
              volumeToExport: 12.5,
              weightToExport: 8.75,
              deliveryMode: 'DIRECT_CUSTOMER',
              deliveryAddress: 'Quận 1, TP.HCM'
            }
          ]
        },
        timeout: 15000
      });
      expect(confirmXuat1Res.ok()).toBeTruthy();

      // ── XUẤT-2: Open a fresh Outbound Note when 150 kiện remain ──
      // System MUST automatically subtract exported m3 & kg:
      // Remaining = 150 kiện, 37.5 m3 (50 - 12.5), 26.25 kg (35 - 8.75)
      await page.goto(`${BASE_URL}/dashboard/warehouse/outbound`, {
        waitUntil: 'domcontentloaded'
      });
      await expect(page.getByRole('button', { name: /Tất cả/i }).first()).toBeVisible({
        timeout: 15000
      });
      await expect(createNoteBtn).toBeVisible({ timeout: 15000 });
      await createNoteBtn.click();
      if (!(await orderInput.isVisible({ timeout: 3000 }).catch(() => false))) {
        await createNoteBtn.click();
      }
      await expect(orderInput).toBeVisible({ timeout: 10000 });
      await orderInput.fill(testOrderCode);
      await orderInput.press('Enter');

      await expect(qtyInput).toHaveValue('150', { timeout: 10000 });
      await expect(volumeInput).toHaveValue('37.5');
      await expect(weightInput).toHaveValue('26.25');
      await expect(calcBtn).toHaveAttribute('data-active', 'false');

      // Test typing partial quantity 50 out of 150 remaining and clicking Calculator -> 12.5 m3, 8.75 kg
      await qtyInput.fill('50');
      await expect(calcBtn).toHaveAttribute('data-active', 'true');
      await calcBtn.click();
      await expect(volumeInput).toHaveValue('12.5');
      await expect(weightInput).toHaveValue('8.75');

      // Test typing full remaining quantity 150 (= availStock) -> automatically restores exact remaining 37.5 m3 & 26.25 kg so remaining after XUẤT-2 is 0!
      await qtyInput.fill('150');
      await expect(calcBtn).toHaveAttribute('data-active', 'false');
      await expect(volumeInput).toHaveValue('37.5');
      await expect(weightInput).toHaveValue('26.25');
    });

    test('CASE-02: Super Admin Views Deleted Trips in Outbound & Inbound Boards + Updated Receipt Date', async ({
      page,
      request
    }) => {
      // Verify API returns deletedCount and DELETED status rows for SUPER_ADMIN
      const apiRes = await request.get(
        `${API_URL}/warehouse/outbound-trips?status=DELETED&limit=20`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          timeout: 15000
        }
      );
      expect(apiRes.ok()).toBeTruthy();
      const apiJson = await apiRes.json();
      const payload = apiJson?.meta ? apiJson : (apiJson?.data ?? apiJson);
      expect(payload?.meta?.deletedCount).toBeGreaterThan(0);

      // Verify receipt date endpoint returns updatedAt / confirmation date
      const receiptRes = await request.get(
        `${API_URL}/warehouse/inbound/receipt-data?orderCode=${encodeURIComponent(testOrderCode)}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          timeout: 15000
        }
      );
      expect(receiptRes.ok()).toBeTruthy();
      const receiptJson = await receiptRes.json();
      const receiptData = receiptJson?.data ?? receiptJson;
      expect(receiptData?.updatedAt || receiptData?.createdAt).toBeTruthy();

      await loginAs(page, USER_ADMIN, BASE_URL);
      await page.goto(`${BASE_URL}/dashboard/warehouse/outbound`, {
        waitUntil: 'domcontentloaded'
      });

      const deletedTab = page.getByTestId('outbound-status-tab-DELETED');
      await expect(deletedTab).toBeVisible({ timeout: 15000 });
      await expect(deletedTab).toContainText('Đã xóa');
      await deletedTab.click();

      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('table tbody')).toContainText('Đã xóa');
      if (deletedOutboundTripCode) {
        await expect(page.locator('table tbody')).toContainText(deletedOutboundTripCode);
      }

      // Verify enriched TripDateTooltip on the NGÀY column
      const firstDateTrigger = page
        .locator('table tbody tr')
        .first()
        .getByTestId('trip-date-tooltip-trigger');
      await firstDateTrigger.click();
      const tooltipContent = page.getByTestId('trip-date-tooltip-content');
      await expect(tooltipContent).toBeVisible({ timeout: 5000 });
      await expect(tooltipContent).toContainText('Người khởi tạo:');

      const deletedScreenshot = path.join(
        EVIDENCE_DIR,
        'screenshot_superadmin_deleted_trips_verified.png'
      );
      await page.screenshot({ path: deletedScreenshot, fullPage: false });
      expect(fs.existsSync(deletedScreenshot)).toBeTruthy();

      // Verify "Lịch sử tạo & chỉnh sửa chuyến xe" modal has NO "Nguyên nhân chuyến" alert banner
      const firstHistoryBtn = page
        .locator('[data-testid^="btn-trip-history-"]')
        .first();
      if (await firstHistoryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstHistoryBtn.click();
        const historyModal = page.getByTestId('trip-history-modal');
        await expect(historyModal).toBeVisible({ timeout: 10000 });
        await expect(historyModal).toContainText('Lịch sử tạo & chỉnh sửa chuyến xe');
        await expect(page.getByTestId('trip-history-blockers-alert')).toHaveCount(0);
        await expect(historyModal).not.toContainText('Nguyên nhân chuyến');
        await historyModal.getByRole('button', { name: 'Đóng' }).click();
      }

      // Also verify Inbound board has the "Đã xóa" tab for Super Admin
      await page.goto(`${BASE_URL}/dashboard/warehouse/inbound`, {
        waitUntil: 'domcontentloaded'
      });
      const inboundDeletedTab = page.getByTestId('inbound-status-tab-DELETED');
      await expect(inboundDeletedTab).toBeVisible({ timeout: 15000 });
      await expect(inboundDeletedTab).toContainText('Đã xóa');
    });

    test('CASE-03: Excel Export (Sheets 2 & 3 Daily Statistics) & Order Detail Step 0 Tracking Draft Vehicle', async ({
      page
    }) => {
      await loginAs(page, USER_WAREHOUSE_HCM, BASE_URL);
      await page.goto(`${BASE_URL}/dashboard/warehouse/orders`, {
        waitUntil: 'domcontentloaded'
      });

      // Wait until real data rows (with multiple <td> columns) finish loading
      await expect(page.locator('table tbody tr td:nth-child(3)').first()).toBeVisible({
        timeout: 15000
      });

      // 1) Trigger Excel Export and verify Sheet 1, Sheet 2 (Slide 2 - CBM Theo Ngày), Sheet 3 (Slide 3 - Khối & Tấn Theo Ngày)
      const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
      const exportBtn = page.getByTestId('export-stored-orders-excel-btn');
      await expect(exportBtn).toBeVisible({ timeout: 10000 });
      await exportBtn.click();
      const download = await downloadPromise;

      const excelPath = path.join(EVIDENCE_DIR, 'exported_orders_slides_2_3.xlsx');
      await download.saveAs(excelPath);
      expect(fs.existsSync(excelPath)).toBeTruthy();

      const workbook = XLSX.readFile(excelPath);
      expect(workbook.SheetNames.length).toBeGreaterThanOrEqual(3);
      expect(workbook.SheetNames).toContain('Slide 2 - CBM Theo Ngày');
      expect(workbook.SheetNames).toContain('Slide 3 - Khối & Tấn Theo Ngày');

      // Sheet 1 remains 100% compatible with existing header row rules
      const sheet1 = workbook.Sheets[workbook.SheetNames[0]];
      const rows1 = XLSX.utils.sheet_to_json<any[]>(sheet1, { header: 1, defval: '' });
      expect(rows1[0][0]).toBe('STT');
      expect(rows1[0][1]).toBe('MÃ VẬN ĐƠN');

      // Sheet 2: Daily CBM statistics
      const sheet2 = workbook.Sheets['Slide 2 - CBM Theo Ngày'];
      const rows2 = XLSX.utils.sheet_to_json<any[]>(sheet2, { header: 1, defval: '' });
      expect(rows2[0]).toEqual([
        'STT',
        'NGÀY CẬP NHẬT',
        'NGÀY TRONG THÁNG',
        'SỐ ĐƠN HÀNG',
        'TỔNG SỐ KIỆN',
        'SẢN LƯỢNG CBM (M³)',
        'KHỐI LƯỢNG (KG)'
      ]);
      const flat2 = rows2.map((r) => r.join(' ')).join('\n');
      expect(flat2).toContain('TỔNG SẢN LƯỢNG (CBM)');
      expect(flat2).toContain('TRUNG BÌNH CBM/NGÀY');

      // Sheet 3: Daily & Monthly CBM + Tons statistics
      const sheet3 = workbook.Sheets['Slide 3 - Khối & Tấn Theo Ngày'];
      const rows3 = XLSX.utils.sheet_to_json<any[]>(sheet3, { header: 1, defval: '' });
      expect(rows3[0]).toEqual([
        'STT',
        'NGÀY CẬP NHẬT',
        'THÁNG',
        'SỐ ĐƠN HÀNG',
        'TỔNG SỐ KIỆN',
        'SỐ KHỐI (CBM)',
        'SỐ TẤN (TẤN)',
        'KHỐI LƯỢNG (KG)'
      ]);
      const flat3 = rows3.map((r) => r.join(' ')).join('\n');
      expect(flat3).toContain('TỔNG CỘNG THEO NGÀY');
      expect(flat3).toContain('SỐ NGÀY PHÁT SINH');

      // 2) Open Order Detail Modal and verify Step 0 (Tracking xe nháp)
      const firstOrderCell = page.locator('table tbody tr td:nth-child(3)').first();
      await expect(firstOrderCell).toBeVisible({ timeout: 10000 });
      await firstOrderCell.click();

      const step0Block = page.getByTestId('waybill-timeline-step-0');
      await expect(step0Block).toBeVisible({ timeout: 10000 });
      await expect(step0Block).toContainText('Bước 0: Tracking xe nháp');

      // Geometry checklist verification (UI Spec Auditor / Visual Pen Matcher):
      // Verify "0" glyph is centered inside the 24x24 circle and coaxial with timeline header
      const step0Geometry = await step0Block.evaluate((el) => {
        const circle = el.querySelector('.rounded-full') as HTMLElement | null;
        const glyph = circle?.querySelector('span') as HTMLElement | null;
        const headerRow = el.querySelector('.min-h-6') as HTMLElement | null;
        if (!circle || !glyph || !headerRow) return null;
        const cRect = circle.getBoundingClientRect();
        const gRect = glyph.getBoundingClientRect();
        const hRect = headerRow.getBoundingClientRect();
        return {
          dxGlyph: Math.abs(cRect.left + cRect.width / 2 - (gRect.left + gRect.width / 2)),
          dyGlyph: Math.abs(cRect.top + cRect.height / 2 - (gRect.top + gRect.height / 2)),
          dyHeader: Math.abs(cRect.top + cRect.height / 2 - (hRect.top + hRect.height / 2))
        };
      });
      expect(step0Geometry).not.toBeNull();
      expect(step0Geometry!.dxGlyph).toBeLessThanOrEqual(1.5);
      expect(step0Geometry!.dyGlyph).toBeLessThanOrEqual(1.5);
      expect(step0Geometry!.dyHeader).toBeLessThanOrEqual(2);

      // Verify Activity Log badges use Vietnamese labels (not raw English enums)
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('Hủy chuyến nháp');
      await expect(dialog).toContainText('Xác nhận nhập kho');
      await expect(dialog).toContainText('(Quản lý kho)');
      await expect(dialog).not.toContainText('DRAFT_CANCELLED');
      await expect(dialog).not.toContainText('INBOUND_CONFIRMED');
      await expect(dialog).not.toContainText('(Warehouse Manager)');

      const step0Screenshot = path.join(EVIDENCE_DIR, 'screenshot_order_step0_verified.png');
      await page.screenshot({ path: step0Screenshot, fullPage: false });
      expect(fs.existsSync(step0Screenshot)).toBeTruthy();
    });
  }
);
