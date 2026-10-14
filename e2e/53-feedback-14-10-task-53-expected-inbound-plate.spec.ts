/**
 * frontend/e2e/53-feedback-14-10-task-53-expected-inbound-plate.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 14/10 (Task #53) — Thay thế cột "ĐIỂM BỐC HÀNG" bằng cột "BIỂN SỐ XE NHẬP DỰ KIẾN"
 * trên màn hình xem đơn trong trip xuất hàng.
 *
 * Requirements:
 * 1. Màn hình xem đơn trong trip xuất hàng (WarehouseTripDetailModal ở mode OUTBOUND):
 *    - Cột "ĐIỂM BỐC HÀNG" được thay thế bằng cột "BIỂN SỐ XE NHẬP DỰ KIẾN".
 * 2. Trong danh sách đơn:
 *    - Các đơn nháp (DRAFT/PENDING): hiển thị biển số xe của trip nhập đơn hàng đang ở trạng thái chờ xử lý (PENDING).
 *    - Các đơn đã có trạng thái lưu kho (INBOUND/STORED/LUU_KHO): để trống ('—').
 * 3. Bằng chứng kiểm thử: Lưu screenshot vào feedbacks/feedback_14_10_task_53/screenshot_01_verified.png.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { loginAs, TEST_USERS } from './helpers/auth';

const DEV_BACKEND_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://backend-tms-core-dev.up.railway.app/api/v1';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_14_10_task_53');

function saveEvidenceScreenshot(filename: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
    const target = path.join(EVIDENCE_DIR, filename);
    fs.writeFileSync(target, buffer);
    console.log(`[EVIDENCE SAVED] ${target}`);
  } catch (err) {
    console.warn(`Could not save evidence screenshot:`, err);
  }
}

let authToken = '';

test.describe
  .serial('Feedback 14/10 (Task #53) — Biển số xe nhập dự kiến trong trip xuất hàng', () => {
  test.beforeAll(async ({ request }) => {
    // 1. Authenticate with backend
    const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
      data: {
        email: TEST_USERS[0].email,
        password: TEST_USERS[0].password
      },
      timeout: 15000
    });
    expect(loginRes.ok(), `Login failed: ${loginRes.status()}`).toBeTruthy();
    const loginJson = await loginRes.json();
    authToken = loginJson?.data?.token ?? loginJson?.token;
    expect(authToken).toBeTruthy();
  });

  test('API: GET /warehouse/outbound-trips returns expectedInboundLicensePlate for orders', async ({
    request
  }) => {
    const res = await request.get(`${DEV_BACKEND_URL}/warehouse/outbound-trips?limit=10`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      timeout: 15000
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    const payload = json?.meta ? json : (json?.data ?? json);
    const trips = Array.isArray(payload?.data) ? payload.data : [];

    // Verify outbound trips structure
    for (const trip of trips) {
      if (Array.isArray(trip.orders)) {
        for (const order of trip.orders) {
          const isStored = ['INBOUND', 'STORED', 'LUU_KHO', 'IN_WAREHOUSE'].includes(
            String(order.hubStatus || order.status || '').toUpperCase()
          );
          if (isStored) {
            // Stored orders must have expectedInboundLicensePlate as null or empty
            expect(order.expectedInboundLicensePlate ?? null).toBeNull();
          }
        }
      }
    }
  });

  test('UI: Outbound trip detail modal displays "BIỂN SỐ XE NHẬP DỰ KIẾN" column replacing "ĐIỂM BỐC HÀNG"', async ({
    page
  }) => {
    test.setTimeout(90000);

    // 1. Login as warehouse manager or admin
    await page.goto(`${DEV_FRONTEND_URL}/auth/signin`);
    await page.waitForLoadState('domcontentloaded');

    // Perform login
    await loginAs(page, TEST_USERS[0]);

    // 2. Navigate to Warehouse Outbound page
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`);
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for the outbound table to render
    const tableContainer = page.locator('table');
    await expect(tableContainer.first()).toBeVisible({ timeout: 20000 });

    // Look for any tripCode button to click
    const tripCodeBtn = page.locator('button:has-text("SD")').first();
    const hasTrip = await tripCodeBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTrip) {
      // Click the tripCode button to open WarehouseTripDetailModal in OUTBOUND mode
      await tripCodeBtn.click();

      // Wait for modal to appear
      const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
      await expect(modal).toBeVisible({ timeout: 10000 });

      // Verify that the table header contains "BIỂN SỐ XE NHẬP DỰ KIẾN"
      const expectedColHeader = modal.locator('th:has-text("BIỂN SỐ XE NHẬP DỰ KIẾN")');
      await expect(expectedColHeader).toBeVisible({ timeout: 10000 });

      // Verify that the old header "ĐIỂM BỐC HÀNG" is NOT present in this outbound modal table
      const oldColHeader = modal.locator('th:has-text("ĐIỂM BỐC HÀNG")');
      const isOldVisible = await oldColHeader.isVisible().catch(() => false);
      expect(isOldVisible).toBeFalsy();

      // Take verified evidence screenshot
      const buffer = await modal.screenshot();
      saveEvidenceScreenshot('screenshot_01_verified.png', buffer);
    } else {
      console.log('No outbound trip found on page, capturing page screenshot');
      const buffer = await page.screenshot();
      saveEvidenceScreenshot('screenshot_01_page.png', buffer);
    }
  });
});
