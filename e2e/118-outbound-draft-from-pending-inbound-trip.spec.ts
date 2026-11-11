import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';
import { availableOutboundStock } from '../src/features/warehouse/lib/outbound-stock';

const FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'http://localhost:4000';

const API_BASE_URL =
  process.env.API_URL ?? 'http://localhost:4001/api/v1';

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../feedbacks/feedback_11_11_task_118_outbound_draft_pending_inbound'
);

test.describe.serial(
  'Task #118 — Cho phép Tạo Đơn Nháp Xuất cho Mã Vận Đơn Đang Trong Trip Nhập Nháp (Khóa Xác Nhận Xuất)',
  () => {
    test.beforeAll(() => {
      if (!fs.existsSync(EVIDENCE_DIR)) {
        fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
      }
    });

    test('CASE-01: availableOutboundStock tính đúng số kiện khả dụng cho đơn thuộc trip nhập nháp và đơn nhập nhiều đợt', () => {
      // 1. Đơn mới hoàn toàn nằm trong trip nhập nháp (remainingQuantity = 0, effectiveHubStock = 0, totalQuantity = 3)
      const purePendingInboundDraft = {
        orderCode: 'LTV2611-0215',
        totalQuantity: 3,
        inboundQuantity: 0,
        outboundQuantity: 0,
        remainingQuantity: 0,
        hubStock: 0,
        effectiveHubStock: 0,
        status: 'DRAFT',
        hubStatus: 'DRAFT',
        pendingInboundQuantity: 3,
        pendingInboundTripCodes: ['SD1383'],
        hasPendingInboundTrip: true,
        pendingOutboundQuantity: 0,
        pendingOutboundTripCodes: []
      };
      expect(availableOutboundStock(purePendingInboundDraft)).toBe(3);

      // 2. Sau khi đã xếp đủ 3 kiện vào 1 chuyến nháp xuất khác -> không cho phép xếp trùng lần 2
      const alreadyAllocatedOutboundDraft = {
        ...purePendingInboundDraft,
        pendingOutboundQuantity: 3,
        pendingOutboundTripCodes: ['SD1400']
      };
      expect(availableOutboundStock(alreadyAllocatedOutboundDraft)).toBe(0);

      // 3. Đơn về nhiều đợt: 19 kiện đã nhập kho thực tế + 12 kiện đang nằm ở trip nhập nháp -> cho phép lập nháp xuất tối đa 31 kiện
      const multiBatchOrder = {
        orderCode: 'LTV2611-MULTI',
        totalQuantity: 31,
        inboundQuantity: 19,
        outboundQuantity: 0,
        remainingQuantity: 19,
        hubStock: 19,
        effectiveHubStock: 19,
        status: 'INBOUND',
        hubStatus: 'INBOUND',
        pendingInboundQuantity: 12,
        pendingInboundTripCodes: ['SD1384'],
        hasPendingInboundTrip: true,
        pendingOutboundQuantity: 0,
        pendingOutboundTripCodes: []
      };
      expect(availableOutboundStock(multiBatchOrder)).toBe(31);
    });

    test('CASE-02: Giao diện Xuất Kho (Andromeda Hub - HCM) cho phép Lưu nháp đơn đang trong trip nhập nháp và chặn Xác nhận xuất kho', async ({
      page,
      request
    }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width: 1440, height: 900 });

      const uniqueSuffix = String(Date.now()).slice(-5);
      const testOrderCode = `LTV2611-${uniqueSuffix}`;
      let createdOrderId: number | null = null;
      let inboundDraftTripCode: string | null = null;
      let outboundDraftTripCode: string | null = null;
      let accessToken: string | null = null;

      try {
        // 1. Đăng nhập tài khoản Thủ kho Andromeda Hub - HCM
        await loginAs(page, USER_WAREHOUSE_HCM, FRONTEND_URL);

        accessToken = await page.evaluate(() => {
          return (
            window.localStorage.getItem('access_token') ||
            document.cookie.match(/(?:^|; )access_token=([^;]*)/)?.[1] ||
            null
          );
        });
        expect(Boolean(accessToken)).toBe(true);

        // 2. Tạo 1 chuyến nhập nháp (PENDING INBOUND) trên DB thực tế với mã vận đơn mới (3 kiện)
        const createInboundDraftRes = await request.post(
          `${API_BASE_URL}/warehouse/inbound/batch-create`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            data: {
              licensePlate: '51C-118.99',
              driverName: 'Tài xế Test 118',
              receiveDate: new Date().toISOString().split('T')[0],
              items: [
                {
                  orderCode: testOrderCode,
                  goodsDescription: 'Vải cuộn kiểm thử nháp xuất',
                  totalQuantity: 3,
                  totalWeight: 45,
                  totalVolume: 0.6,
                  pickupAddress: 'Tân Bình, TP.HCM',
                  deliveryAddress: 'Biên Hòa, Đồng Nai',
                  province: 'Đồng Nai',
                  initialStatus: 'DRAFT'
                }
              ]
            },
            timeout: 15000
          }
        );
        expect(createInboundDraftRes.ok()).toBe(true);
        const inboundDraftJson = await createInboundDraftRes.json();
        const inboundPayload = inboundDraftJson?.data ?? inboundDraftJson;
        inboundDraftTripCode = inboundPayload?.tripCode ?? null;
        createdOrderId =
          inboundPayload?.orders?.[0]?.id ?? inboundPayload?.items?.[0]?.id ?? null;
        expect(Boolean(inboundDraftTripCode)).toBe(true);
        expect(Number(createdOrderId)).toBeGreaterThan(0);

        // 3. Mở trang Xuất Kho (/dashboard/warehouse/outbound) và đợi client React hydrate hoàn tất
        await page.goto(`${FRONTEND_URL}/dashboard/warehouse/outbound`, {
          waitUntil: 'domcontentloaded'
        });

        await expect(
          page.getByRole('heading', { name: /Andromeda Hub/i })
        ).toBeVisible({ timeout: 15000 });

        const createOutboundBtn = page
          .getByRole('main')
          .getByRole('button', { name: 'Xuất kho', exact: true });
        await expect(createOutboundBtn).toBeVisible({ timeout: 10000 });

        await expect(async () => {
          if (
            await page
              .locator('input[placeholder*="29C-123.45"]')
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            return;
          }
          await createOutboundBtn.click();
          await expect(
            page.locator('input[placeholder*="29C-123.45"]').first()
          ).toBeVisible({ timeout: 3000 });
        }).toPass({ timeout: 15000 });

        // 4. Nhập Biển số xe và gõ mã vận đơn đang nằm trong trip nhập nháp
        const plateInput = page.locator('input[placeholder*="29C-123.45"]').first();
        await plateInput.fill('51D-888.18');

        const codeInput = page
          .locator('tbody tr')
          .first()
          .locator('td')
          .nth(1)
          .locator('input');
        await expect(codeInput).toBeVisible({ timeout: 10000 });
        await codeInput.fill(testOrderCode);
        await codeInput.press('Enter');

        // 5. Kiểm tra cảnh báo hiển thị, số kiện tự động nhận đúng 3 kiện (không bị rơi về 0), nút Xác nhận xuất kho bị khóa
        await expect(page.locator('text=Chỉ được Lưu nháp').first()).toBeVisible({
          timeout: 15000
        });
        await expect(page.locator('tbody tr').first().locator('text=Tồn: 3')).toBeVisible({
          timeout: 10000
        });
        await expect(page.locator('button:has-text("Xác nhận xuất kho")').first()).toBeDisabled();

        const saveDraftBtn = page
          .locator('button:has-text("Lưu nháp (Chờ xử lý)")')
          .first();
        await expect(page.locator('button:has-text("Lưu nháp (Chờ xử lý)")').first()).toBeEnabled();

        // Chụp ảnh minh chứng trước khi bấm Lưu nháp
        const step1Screenshot = path.join(
          EVIDENCE_DIR,
          'screenshot_01_outbound_draft_ready_verified.png'
        );
        await page.screenshot({ path: step1Screenshot });
        expect(fs.existsSync(step1Screenshot)).toBe(true);

        // 6. Bấm "Lưu nháp (Chờ xử lý)" và xác minh API trả về 200/201 thành công (KHÔNG bị lỗi 0/0 kiện)
        const [draftResponse] = await Promise.all([
          page.waitForResponse(
            (res) =>
              res.url().includes('/api/v1/warehouse/outbound/draft') &&
              res.request().method() === 'POST',
            { timeout: 15000 }
          ),
          saveDraftBtn.click()
        ]);

        expect(draftResponse.status()).toBeLessThan(300);
        const draftResBody = await draftResponse.json();
        const draftData = draftResBody?.data ?? draftResBody;
        outboundDraftTripCode = draftData?.tripCode ?? null;
        expect(Boolean(outboundDraftTripCode)).toBe(true);

        // Xác minh chuyến nháp xuất mới xuất hiện trực tiếp trong bảng danh sách Chờ xử lý
        await expect(
          page.locator('table tbody tr').filter({ hasText: String(outboundDraftTripCode) }).first()
        ).toBeVisible({
          timeout: 15000
        });

        const step2Screenshot = path.join(
          EVIDENCE_DIR,
          'screenshot_02_outbound_draft_saved_verified.png'
        );
        await page.screenshot({ path: step2Screenshot });
        expect(fs.existsSync(step2Screenshot)).toBe(true);

        // 7. Xác minh chốt chặn Backend: Gọi thẳng API confirmOutbound khi trip nhập vẫn đang PENDING phải bị chặn (400)
        const blockedConfirmRes = await request.post(
          `${API_BASE_URL}/warehouse/outbound/confirm`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            data: {
              orderIds: [createdOrderId],
              items: [
                {
                  orderId: createdOrderId,
                  quantityToExport: 3,
                  deliveryMode: 'DIRECT_CUSTOMER',
                  deliveryAddress: 'Biên Hòa, Đồng Nai'
                }
              ],
              mode: 'CUSTOMER',
              licensePlate: '51D-888.18',
              draftTripCode: outboundDraftTripCode
            },
            timeout: 15000
          }
        );
        expect(blockedConfirmRes.status()).toBeGreaterThanOrEqual(400);
        expect(blockedConfirmRes.status()).toBeLessThan(500);
      } finally {
        // Dọn dẹp dữ liệu kiểm thử sạch sẽ
        if (accessToken && outboundDraftTripCode) {
          await request
            .delete(
              `${API_BASE_URL}/warehouse/outbound/drafts/${encodeURIComponent(outboundDraftTripCode)}`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 10000
              }
            )
            .catch(() => null);
        }
        if (accessToken && inboundDraftTripCode) {
          await request
            .delete(
              `${API_BASE_URL}/warehouse/inbound/drafts/${encodeURIComponent(inboundDraftTripCode)}`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 10000
              }
            )
            .catch(() => null);
        }
      }
    });
  }
);
