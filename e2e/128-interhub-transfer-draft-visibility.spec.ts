import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  loginAs,
  USER_ADMIN,
  USER_WAREHOUSE_HCM,
  USER_WAREHOUSE_HYN
} from './helpers/auth';

const FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4000';
const API_URL = process.env.API_URL ?? 'http://localhost:4001/api/v1';
const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../feedbacks/feedback_11_28_task_128_interhub_draft_visibility'
);

async function login(
  request: import('@playwright/test').APIRequestContext,
  email: string
) {
  const response = await request.post(`${API_URL}/auth/email/login`, {
    data: { email, password: 'secret' },
    timeout: 15_000
  });
  expect(response.ok(), `Login ${email}: ${response.status()}`).toBeTruthy();
  const json = await response.json();
  return json?.data?.token ?? json?.token;
}

test('Hub nhận chỉ thấy trip luân chuyển sau khi Hub nguồn xác nhận xuất', async ({
  page,
  request
}) => {
  test.setTimeout(90_000);
  const hcmToken = await login(request, USER_WAREHOUSE_HCM.email);
  const hynToken = await login(request, USER_WAREHOUSE_HYN.email);
  const adminToken = await login(request, USER_ADMIN.email);
  const unique = Date.now().toString().slice(-8);
  let tripCode: string | null = null;
  let orderId: number | null = null;
  let confirmed = false;

  try {
    const intake = await request.post(`${API_URL}/warehouse/inbound/batch-create`, {
      headers: { Authorization: `Bearer ${hcmToken}` },
      timeout: 15_000,
      data: {
        licensePlate: `51C-${unique}`,
        driverName: 'Tài xế E2E liên Hub',
        receiveDate: new Date().toISOString().slice(0, 10),
        items: [
          {
            orderCode: `E2E-INTERHUB-${unique}`,
            goodsDescription: 'Kiện kiểm thử trip luân chuyển',
            totalQuantity: 1,
            totalWeight: 1,
            totalVolume: 0.1,
            pickupAddress: 'Andromeda Hub - HCM',
            deliveryAddress: 'Polaris Hub - Hưng Yên',
            province: 'Hưng Yên',
            initialStatus: 'INBOUND'
          }
        ]
      }
    });
    expect(intake.ok(), `Create HCM stock: ${intake.status()}`).toBeTruthy();
    const intakeJson = await intake.json();
    const intakeData = intakeJson?.data ?? intakeJson;
    orderId = Number(intakeData?.orders?.[0]?.id ?? intakeData?.items?.[0]?.id);
    expect(orderId).toBeGreaterThan(0);

    const saveDraft = await request.post(`${API_URL}/warehouse/outbound/draft`, {
      headers: { Authorization: `Bearer ${hcmToken}` },
      timeout: 15_000,
      data: {
        orderIds: [orderId],
        items: [
          {
            orderId,
            quantityToExport: 1,
            destinationHubId: 3,
            deliveryMode: 'HUB_L1',
            deliveryAddress: 'Polaris Hub - Hưng Yên',
            province: 'Hưng Yên'
          }
        ],
        mode: 'CUSTOMER',
        licensePlate: `51H-INTERHUB-DRAFT-${unique}`,
        driverName: 'Tài xế E2E liên Hub'
      }
    });
    expect(saveDraft.ok(), `Save transfer draft: ${saveDraft.status()}`).toBeTruthy();
    const draftJson = await saveDraft.json();
    tripCode = (draftJson?.data ?? draftJson)?.tripCode ?? null;
    expect(tripCode).toMatch(/^SD\d+$/);

    const beforeConfirm = await request.get(
      `${API_URL}/warehouse/inbound-trips?search=${encodeURIComponent(tripCode!)}`,
      { headers: { Authorization: `Bearer ${hynToken}` }, timeout: 15_000 }
    );
    expect(beforeConfirm.ok()).toBeTruthy();
    const beforeJson = await beforeConfirm.json();
    const beforeRows = beforeJson?.data ?? beforeJson;
    expect(
      (Array.isArray(beforeRows) ? beforeRows : []).some(
        (row: any) => row.tripCode === tripCode
      ),
      'Hưng Yên không được thấy trip khi HCM mới lưu nháp'
    ).toBe(false);

    const confirm = await request.post(`${API_URL}/warehouse/outbound/confirm`, {
      headers: { Authorization: `Bearer ${hcmToken}` },
      timeout: 15_000,
      data: {
        draftTripCode: tripCode,
        mode: 'CUSTOMER',
        licensePlate: `51H-INTERHUB-CONFIRM-${unique}`,
        driverName: 'Tài xế E2E liên Hub',
        items: [
          {
            orderId,
            quantityToExport: 1,
            destinationHubId: 3,
            deliveryMode: 'HUB_L1',
            deliveryAddress: 'Polaris Hub - Hưng Yên',
            province: 'Hưng Yên'
          }
        ]
      }
    });
    expect(confirm.ok(), `Confirm HCM dispatch: ${confirm.status()}`).toBeTruthy();
    confirmed = true;

    const afterConfirm = await request.get(
      `${API_URL}/warehouse/inbound-trips?search=${encodeURIComponent(tripCode!)}`,
      { headers: { Authorization: `Bearer ${hynToken}` }, timeout: 15_000 }
    );
    expect(afterConfirm.ok()).toBeTruthy();
    const afterJson = await afterConfirm.json();
    const afterRows = afterJson?.data ?? afterJson;
    const visibleTrip = (Array.isArray(afterRows) ? afterRows : []).find(
      (row: any) => row.tripCode === tripCode
    );
    expect(visibleTrip, 'Trip phải được trả về cho Hub Hưng Yên sau xác nhận').toBeDefined();
    expect(visibleTrip.status).toBe('PENDING');

    await loginAs(page, USER_WAREHOUSE_HYN, FRONTEND_URL);
    await page.goto(`${FRONTEND_URL}/dashboard/warehouse/inbound`, {
      waitUntil: 'domcontentloaded'
    });
    const tripSearch = page.getByPlaceholder('Tìm mã chuyến, xe, tài xế, mã đơn...');
    await expect(tripSearch).toBeVisible();
    await tripSearch.fill(tripCode!);
    await tripSearch.press('Enter');
    const tripRow = page.locator('table tbody tr').filter({ hasText: tripCode! });
    await expect(tripRow).toHaveCount(1, { timeout: 15_000 });
    await expect(tripRow.first()).toContainText(tripCode!);
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'screenshot_01_hyn_confirmed_trip_verified.png'),
      fullPage: true
    });
  } finally {
    if (tripCode && confirmed) {
      const rollback = await request.post(
        `${API_URL}/warehouse/trips/${encodeURIComponent(tripCode)}/rollback`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          timeout: 15_000,
          data: { reason: 'Dọn dữ liệu E2E inter-hub visibility' }
        }
      );
      expect(rollback.ok(), `Rollback test trip: ${rollback.status()}`).toBeTruthy();
    } else if (tripCode) {
      const cancel = await request.delete(
        `${API_URL}/warehouse/outbound/drafts/${encodeURIComponent(tripCode)}`,
        { headers: { Authorization: `Bearer ${hcmToken}` }, timeout: 15_000 }
      );
      expect(cancel.ok(), `Cancel test draft: ${cancel.status()}`).toBeTruthy();
    }
    if (orderId) {
      const removeOrder = await request.delete(`${API_URL}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        timeout: 15_000
      });
      expect(removeOrder.status() === 204 || removeOrder.ok()).toBeTruthy();
    }
  }
});
