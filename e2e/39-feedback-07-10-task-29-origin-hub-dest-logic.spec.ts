/**
 * e2e/39-feedback-07-10-task-29-origin-hub-dest-logic.spec.ts
 *
 * Dedicated E2E Test Suite for Feedback 07/10 Task 29:
 * Chuẩn Hóa Logic Mặc Định Nhập Kho Hub Cấp 1 & Bảo Toàn Thông Tin Đơn Hàng
 * Giữ Nguyên Địa Chỉ Giao Ban Đầu Tại Các Trạm Trung Chuyển
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
const DAD_MANAGER_EMAIL = 'lyquangthai1993+5@gmail.com'; // Magellan Hub - Đà Nẵng (Hub 2)
const PASSWORDS = ['secret', '123456'];

const EVIDENCE_DIR_29 = path.resolve(process.cwd(), '..', 'feedback_07_10_task_29');

function saveEvidenceScreenshot(filename: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(EVIDENCE_DIR_29)) {
      fs.mkdirSync(EVIDENCE_DIR_29, { recursive: true });
    }
    fs.writeFileSync(path.join(EVIDENCE_DIR_29, filename), buffer);
    console.log(`[EVIDENCE SAVED] ${path.join(EVIDENCE_DIR_29, filename)}`);
  } catch (err) {
    console.warn(`Could not save evidence screenshot to ${EVIDENCE_DIR_29}:`, err);
  }
}

let userToken = '';
const activeTripCode = 'SD73';

test.describe.serial('Feedback 07/10 Task 29: Origin Hub Destination Logic & Customer Address Preservation', () => {
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

    // 2. Fetch manifest of SD73 to inspect orders
    const manifestRes = await request.get(
      `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/manifest`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(manifestRes.ok(), `Trip ${activeTripCode} manifest must be available`).toBeTruthy();
    const mJson = await manifestRes.json();
    const manifest = mJson?.data ?? mJson;
    const lines: any[] = manifest?.lines ?? [];

    const lineT19 = lines.find((l) => l.orderCode === 'T19');
    const lineT10 = lines.find((l) => l.orderCode === 'T10');
    const lineT3 = lines.find((l) => l.orderCode === 'T3');
    const lineT20 = lines.find((l) => l.orderCode === 'T20');

    // Setup destinations according to business scenario:
    // T19: Hub Cấp 1 Đà Nẵng (ID = 2)
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

    // T10: Hub Cấp 1 Hưng Yên (ID = 3)
    if (lineT10) {
      await request.patch(
        `${DEV_BACKEND_URL}/warehouse/trips/${encodeURIComponent(activeTripCode)}/orders/${lineT10.id}/destination`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
          data: {
            deliveryMode: 'HUB_L1',
            destinationHubId: 3,
            deliveryAddress: 'Polaris Hub - Hưng Yên',
            notes: 'Đơn luân chuyển đi Hưng Yên',
          },
        }
      );
    }

    // T3: Giữ nguyên địa chỉ giao ban đầu (DIRECT_CUSTOMER: Huyện Thanh Trì, TP. Hà Nội)
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

    // T20: Giữ nguyên địa chỉ giao ban đầu (DIRECT_CUSTOMER: Quận Bình Thạnh, TP. Hồ Chí Minh)
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
  });

  // ── TEST 1: API MANIFEST AUDIT AT TRANSIT HUB (ĐÀ NẴNG, viewerHubId = 2) ──
  test('API: Verify Da Nang hub view isolates Hub L1 Da Nang vs Direct Customer & Other Hubs', async ({
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
    const lineT10 = lines.find((l) => l.orderCode === 'T10');
    const lineT3 = lines.find((l) => l.orderCode === 'T3');
    const lineT20 = lines.find((l) => l.orderCode === 'T20');

    // 1. T19: Selected Hub Cấp 1 Da Nang -> isForCurrentHub MUST be true
    if (lineT19) {
      expect(lineT19.deliveryMode).toBe('HUB_L1');
      expect(lineT19.isForCurrentHub).toBe(true);
      expect(lineT19.destinationHubId).toBe(2);
    }

    // 2. T10: Selected Hub Cấp 1 Hung Yen -> isForCurrentHub MUST be false at Da Nang
    if (lineT10) {
      expect(lineT10.deliveryMode).toBe('HUB_L1');
      expect(lineT10.isForCurrentHub).toBe(false);
      expect(lineT10.destinationHubId).toBe(3);
    }

    // 3. T3: Original Customer Delivery -> isForCurrentHub MUST be false, Address preserved
    if (lineT3) {
      expect(lineT3.deliveryMode).toBe('DIRECT_CUSTOMER');
      expect(lineT3.isForCurrentHub).toBe(false);
      expect(lineT3.destinationHubId).toBeNull();
      const addr = lineT3.deliveryAddress || lineT3.originalDeliveryAddress || lineT3.destinationHub;
      expect(addr).not.toContain('Magellan Hub - Đà Nẵng');
    }

    // 4. T20: Original Customer Delivery -> isForCurrentHub MUST be false, Address preserved
    if (lineT20) {
      expect(lineT20.deliveryMode).toBe('DIRECT_CUSTOMER');
      expect(lineT20.isForCurrentHub).toBe(false);
      expect(lineT20.destinationHubId).toBeNull();
      const addr = lineT20.deliveryAddress || lineT20.originalDeliveryAddress || lineT20.destinationHub;
      expect(addr).not.toContain('Magellan Hub - Đà Nẵng');
    }
  });

  // ── TEST 2: BROWSER UI AUDIT - INBOUND TALLY & PRESERVED ADDRESSES ──
  test('Browser UI: Inbound Tally preserves initial customer address, applies correct defaults, and filters correctly', async ({
    page,
  }) => {
    // 1. Sign in to Frontend with Da Nang Warehouse Manager account
    await page.goto(`${DEV_FRONTEND_URL}/auth/sign-in`);
    await page.fill('input[type="email"], input[name="email"]', DAD_MANAGER_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORDS[0]);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard/**', { timeout: 30000 });

    // 2. Open Inbound Warehouse page
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('domcontentloaded');

    // 3. Open Trip Detail Modal for SD73
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

    // 4. Verify Inbound Cargo Breakdown Banner
    const unloadBanner = tripModal.locator('text=Dỡ tại kho này:').first();
    await expect(unloadBanner).toBeVisible({ timeout: 10000 });

    const stayBanner = tripModal.locator('text=Tiếp tục trên xe:').first();
    await expect(stayBanner).toBeVisible({ timeout: 10000 });

    // 5. Verify Table Rows and Direct Customer Badges
    const tallyTable = tripModal.locator('table');
    await expect(tallyTable).toBeVisible({ timeout: 10000 });

    // Direct customer badge must be visible
    const directCustBadge = tripModal.locator('text=Giao thẳng khách').first();
    await expect(directCustBadge).toBeVisible({ timeout: 10000 });

    // Save initial screenshot proof
    await page.waitForTimeout(1000);
    const screenshot1 = await tripModal.screenshot();
    saveEvidenceScreenshot('screenshot_01_origin_hub_dest_logic_verified.png', screenshot1);
    saveEvidenceScreenshot('screenshot_verified.png', screenshot1);

    // 6. Test Switch "Ẩn các dòng không thuộc kho này"
    const switchLabel = tripModal.locator('text=Ẩn các dòng không thuộc kho này');
    await expect(switchLabel).toBeVisible({ timeout: 5000 });

    await switchLabel.click();
    await page.waitForTimeout(1000);

    // Order for Da Nang (T19) remains visible
    const t19Visible = await tripModal.locator('text=T19').isVisible().catch(() => false);
    expect(t19Visible, 'Order T19 (for Da Nang) must remain visible').toBe(true);

    // Direct customer order (T20) must be hidden
    const t20Visible = await tripModal.locator('text=T20').isVisible().catch(() => false);
    expect(t20Visible, 'Direct customer order T20 must be hidden when switch is on').toBe(false);

    // Save screenshot proof with switch active
    const screenshot2 = await tripModal.screenshot();
    saveEvidenceScreenshot('screenshot_02_switch_filtered_verified.png', screenshot2);
  });
});
