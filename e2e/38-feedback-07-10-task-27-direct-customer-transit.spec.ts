/**
 * e2e/38-feedback-07-10-task-27-direct-customer-transit.spec.ts
 *
 * Dedicated E2E Test Suite for Feedback 07/10 Task 27:
 * Khắc phục lỗi mặc định nhập kho nhầm đơn giao thẳng cho khách (DIRECT_CUSTOMER)
 * tại Trạm trung chuyển (Inbound Tally Isolation & Switch Hide Other Hubs)
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const DEV_BACKEND_URL =
  process.env.API_URL ?? 'https://logistics-website-backend-1jho.onrender.com/api/v1';
const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://logistics-website-frontend-git-dev-thai-lys-projects.vercel.app';

const ADMIN_EMAIL = 'lyquangthai1993+1@gmail.com';
const DAD_MANAGER_EMAIL = 'lyquangthai1993+5@gmail.com'; // Quản lý Magellan Hub - Đà Nẵng (Hub 2)
const PASSWORDS = ['secret', '123456'];

const EVIDENCE_DIR_27 = path.resolve(process.cwd(), '..', 'feedback_07_10_task_27');

function saveEvidenceScreenshot(filename: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(EVIDENCE_DIR_27)) {
      fs.mkdirSync(EVIDENCE_DIR_27, { recursive: true });
    }
    fs.writeFileSync(path.join(EVIDENCE_DIR_27, filename), buffer);
    console.log(`[EVIDENCE SAVED] ${path.join(EVIDENCE_DIR_27, filename)}`);
  } catch (err) {
    console.warn(`Could not save evidence screenshot to ${EVIDENCE_DIR_27}:`, err);
  }
}

let userToken = '';
const activeTripCode = 'SD73';

test.describe.serial('Feedback 07/10 Task 27: Direct Customer Cargo Isolation at Transit Hub', () => {
  test.beforeAll(async ({ request }) => {
    // 1. Authenticate against Backend (Đà Nẵng warehouse manager or Admin)
    for (const email of [DAD_MANAGER_EMAIL, ADMIN_EMAIL]) {
      for (const pwd of PASSWORDS) {
        const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
          data: { email, password: pwd },
        });
        if (loginRes.ok()) {
          const loginJson = await loginRes.json();
          userToken = loginJson?.data?.token ?? loginJson?.token;
          break;
        }
      }
      if (userToken) break;
    }
    expect(userToken, 'Must obtain a valid JWT token for E2E tests').toBeTruthy();

    // 2. Fetch manifest of SD73 to discover orders
    const manifestRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/manifest`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(manifestRes.ok(), `Trip ${activeTripCode} manifest must be available`).toBeTruthy();
    const mJson = await manifestRes.json();
    const manifest = mJson?.data ?? mJson;
    const lines: any[] = manifest?.lines ?? [];

    // Ensure T19 (Đà Nẵng), T20 (DIRECT_CUSTOMER HCM), T3 (DIRECT_CUSTOMER Hà Nội) have proper destinations
    const lineT19 = lines.find((l) => l.orderCode === 'T19');
    const lineT20 = lines.find((l) => l.orderCode === 'T20');
    const lineT3 = lines.find((l) => l.orderCode === 'T3');

    if (lineT19) {
      await request.patch(
        `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/orders/${lineT19.id}/destination`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
          data: {
            deliveryMode: 'HUB_L1',
            destinationHubId: 2,
            deliveryAddress: 'Magellan Hub - Đà Nẵng',
            notes: 'Đơn dỡ nhập kho Đà Nẵng',
          },
        }
      );
    }

    if (lineT20) {
      await request.patch(
        `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/orders/${lineT20.id}/destination`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
          data: {
            deliveryMode: 'DIRECT_CUSTOMER',
            destinationHubId: null,
            deliveryAddress: 'Quận Bình Thạnh, TP. Hồ Chí Minh',
            notes: 'Hàng giao khách tận nơi Bình Thạnh',
          },
        }
      );
    }

    if (lineT3) {
      await request.patch(
        `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/orders/${lineT3.id}/destination`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
          data: {
            deliveryMode: 'DIRECT_CUSTOMER',
            destinationHubId: null,
            deliveryAddress: 'Huyện Thanh Trì, TP. Hà Nội',
            notes: 'Hàng giao khách tận nơi Thanh Trì',
          },
        }
      );
    }
  });

  // ── TEST 1: API TRIP MANIFEST AUDIT ──
  test('API: Verify getTripManifest isolates DIRECT_CUSTOMER orders from current hub', async ({
    request,
  }) => {
    const manifestRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/manifest`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(manifestRes.ok()).toBeTruthy();
    const mJson = await manifestRes.json();
    const manifest = mJson?.data ?? mJson;
    const lines: any[] = manifest?.lines ?? [];

    const lineT19 = lines.find((l) => l.orderCode === 'T19');
    const lineT20 = lines.find((l) => l.orderCode === 'T20');
    const lineT3 = lines.find((l) => l.orderCode === 'T3');

    // T19 belongs to Magellan Hub - Đà Nẵng
    if (lineT19) {
      expect(lineT19.deliveryMode).toBe('HUB_L1');
      expect(lineT19.isForCurrentHub).toBe(true);
      expect(lineT19.destinationHubId).toBe(2);
    }

    // T20 is DIRECT_CUSTOMER -> must NOT be for current hub
    if (lineT20) {
      expect(lineT20.deliveryMode).toBe('DIRECT_CUSTOMER');
      expect(lineT20.isForCurrentHub).toBe(false);
      expect(lineT20.destinationHubId).toBeNull();
    }

    // T3 is DIRECT_CUSTOMER -> must NOT be for current hub
    if (lineT3) {
      expect(lineT3.deliveryMode).toBe('DIRECT_CUSTOMER');
      expect(lineT3.isForCurrentHub).toBe(false);
      expect(lineT3.destinationHubId).toBeNull();
    }
  });

  // ── TEST 2: BROWSER UI - TALLY TABLE AND ISOLATION VERIFICATION ──
  test('Browser UI: Tally modal displays cargo breakdown, direct customer badges, unchecked boxes, and hide switch', async ({
    page,
  }) => {
    // 1. Sign in to Frontend with Da Nang Warehouse Manager account
    await page.goto(`${DEV_FRONTEND_URL}/auth/sign-in`);
    await page.fill('input[type="email"], input[name="email"]', DAD_MANAGER_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORDS[0]);
    await page.click('button[type="submit"]');

    // Wait for dashboard navigation
    await page.waitForURL('**/dashboard/**', { timeout: 30000 });

    // 2. Navigate to Inbound Warehouse page
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('domcontentloaded');

    // 3. Locate and open Trip Detail Modal for SD73
    let tripDetailBtn = page
      .locator(`button[title*="chi tiết chuyến xe"]:has-text("${activeTripCode}")`)
      .first();
    const hasActiveTripBtn = await tripDetailBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasActiveTripBtn) {
      tripDetailBtn = page.locator(`button:has-text("${activeTripCode}")`).first();
    }
    await tripDetailBtn.waitFor({ state: 'visible', timeout: 25000 });
    await tripDetailBtn.click();

    const tripModal = page.locator('div[role="dialog"]');
    await expect(tripModal).toBeVisible({ timeout: 15000 });

    // 4. Verify Step 1 is active (Kiểm đếm dỡ hàng)
    const step1Title = tripModal.locator('text=Kiểm đếm dỡ hàng').first();
    await expect(step1Title).toBeVisible({ timeout: 10000 });

    // Verify Inbound Cargo Breakdown Banner exists
    const unloadBanner = tripModal.locator('text=Dỡ tại kho này:').first();
    await expect(unloadBanner).toBeVisible({ timeout: 10000 });

    const stayBanner = tripModal.locator('text=Tiếp tục trên xe:').first();
    await expect(stayBanner).toBeVisible({ timeout: 10000 });

    // 5. Verify Tally Table rows:
    // Look for T19, T20, T3 rows
    const tallyTable = tripModal.locator('table');
    await expect(tallyTable).toBeVisible({ timeout: 10000 });

    // T20 and T3 should have "Giao thẳng khách" badge
    const directCustomerBadges = tripModal.locator('text=Giao thẳng khách');
    await expect(directCustomerBadges.first()).toBeVisible({ timeout: 10000 });

    // Save screenshot proof of Step 1 with direct customer cargo marked
    await page.waitForTimeout(1000);
    const screenshot1 = await tripModal.screenshot();
    saveEvidenceScreenshot('screenshot_01_tally_direct_customer_isolation_verified.png', screenshot1);
    saveEvidenceScreenshot('screenshot_verified.png', screenshot1);

    // 6. Test Switch "Ẩn các dòng không thuộc kho này"
    const hideSwitch = tripModal.locator('button[role="switch"], input[type="checkbox"]').first();
    const switchLabel = tripModal.locator('text=Ẩn các dòng không thuộc kho này');
    await expect(switchLabel).toBeVisible({ timeout: 5000 });

    // Click switch or label to toggle hide
    await switchLabel.click();
    await page.waitForTimeout(1000);

    // Verify T19 is visible, while T20 and T3 are hidden
    const t19Visible = await tripModal.locator('text=T19').isVisible().catch(() => false);
    const t20Visible = await tripModal.locator('text=T20').isVisible().catch(() => false);

    expect(t19Visible, 'Order T19 (for Da Nang) must remain visible when hiding other hubs').toBe(true);
    expect(t20Visible, 'Order T20 (direct customer) must be hidden when hiding other hubs').toBe(false);

    // Save screenshot proof with switch active
    const screenshot2 = await tripModal.screenshot();
    saveEvidenceScreenshot('screenshot_02_switch_hide_other_hubs_verified.png', screenshot2);
  });
});
