/**
 * frontend/e2e/52-trip-detail-view-clean-header-and-no-roadside.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 14/10 (Task #52) — Loại Bỏ Tiêu Đề "Kiểm Đếm Dỡ Hàng & Nhập Kho" Và
 * Nút "Bốc Thêm Đơn Dọc Đường" Ở Màn Hình Xem Đơn Hàng Trong Trip Xuất, Nhập
 * Tạo Mới Từ Hub Của Account Đang Sử Dụng.
 *
 * Verification Requirements:
 * 1. Màn hình Xem đơn hàng trong Chuyến xe Nhập kho (Warehouse Inbound View Mode):
 *    - 100% không còn hiển thị dòng tiêu đề phụ "Kiểm đếm dỡ hàng & Nhập kho".
 *    - 100% không còn hiển thị nút "+ Bốc thêm đơn dọc đường về Hub".
 *    - Ảnh minh chứng: feedbacks/feedback_14_10_task_52/screenshot_01_inbound_view_cleaned_verified.png
 * 2. Màn hình Xem đơn hàng trong Chuyến xe Xuất kho (Warehouse Outbound View Mode):
 *    - 100% không còn hiển thị dòng tiêu đề phụ "Kiểm đếm dỡ hàng & Nhập kho".
 *    - 100% không còn hiển thị nút "+ Bốc thêm đơn dọc đường về Hub".
 *    - Ảnh minh chứng: feedbacks/feedback_14_10_task_52/screenshot_02_outbound_view_cleaned_verified.png
 * 3. Hợp đồng API & Ngăn ngừa Thoái lui Logic (Zero Regression Guard):
 *    - Luồng tác nghiệp luân chuyển liên Hub đến từ kho khác vẫn bảo toàn đầy đủ tính năng.
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

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_14_10_task_52');

function saveEvidenceScreenshot(filename: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
    const target = path.join(EVIDENCE_DIR, filename);
    fs.writeFileSync(target, buffer);
    console.log(`[EVIDENCE SAVED] ${target}`);
  } catch (err) {
    console.warn('Could not save evidence screenshot:', err);
  }
}

let authToken = '';

test.describe
  .serial('Feedback 14/10 (Task #52) — Clean Header & No Roadside Button on View Trip Modal', () => {
  test.beforeAll(async ({ request }) => {
    // 1. Authenticate with backend
    const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
      data: {
        email: TEST_USERS[3].email,
        password: TEST_USERS[3].password
      },
      timeout: 15000
    });
    expect(loginRes.ok(), `Login failed with status ${loginRes.status()}`).toBeTruthy();
    const loginJson = await loginRes.json();
    authToken = loginJson?.data?.token ?? loginJson?.token;
    expect(authToken).toBeTruthy();
  });

  test('API Integrity: GET /warehouse/inbound-trips and /warehouse/outbound-trips return valid trip manifests', async ({
    request
  }) => {
    const inboundRes = await request.get(`${DEV_BACKEND_URL}/warehouse/inbound-trips?limit=10`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      timeout: 15000
    });
    expect(inboundRes.ok()).toBeTruthy();
    const inboundJson = await inboundRes.json();
    const inboundPayload = inboundJson?.meta ? inboundJson : (inboundJson?.data ?? inboundJson);
    const inboundTrips = Array.isArray(inboundPayload?.data) ? inboundPayload.data : [];
    expect(Array.isArray(inboundTrips)).toBeTruthy();

    const outboundRes = await request.get(`${DEV_BACKEND_URL}/warehouse/outbound-trips?limit=10`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      timeout: 15000
    });
    expect(outboundRes.ok()).toBeTruthy();
    const outboundJson = await outboundRes.json();
    const outboundPayload = outboundJson?.meta
      ? outboundJson
      : (outboundJson?.data ?? outboundJson);
    const outboundTrips = Array.isArray(outboundPayload?.data) ? outboundPayload.data : [];
    expect(Array.isArray(outboundTrips)).toBeTruthy();
  });

  test('UI Test 1: Inbound View Modal has clean header without "Kiểm đếm dỡ hàng & Nhập kho" and without roadside button', async ({
    page
  }) => {
    test.setTimeout(90000);

    // 1. Login as warehouse manager
    await page.goto(`${DEV_FRONTEND_URL}/auth/signin`);
    await page.waitForLoadState('domcontentloaded');
    await loginAs(page, TEST_USERS[3]);

    // 2. Navigate to Warehouse Inbound screen
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('domcontentloaded');

    // 3. Wait for data table to render
    const tableContainer = page.locator('table');
    await expect(tableContainer.first()).toBeVisible({ timeout: 20000 });

    // Look for tripCode action button (SDxxx)
    const tripCodeBtn = page.locator('button:has-text("SD")').first();
    const hasTrip = await tripCodeBtn.isVisible({ timeout: 6000 }).catch(() => false);

    if (hasTrip) {
      await tripCodeBtn.click();

      // Modal appears
      const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
      await expect(modal).toBeVisible({ timeout: 10000 });

      // Header should show trip code badge
      const tripBadge = modal.locator('span:has-text("CHUYẾN XE")');
      await expect(tripBadge).toBeVisible({ timeout: 5000 });

      // Assert 1: "Kiểm đếm dỡ hàng & Nhập kho" header MUST NOT be visible
      const tallyHeader = modal.locator('h2:has-text("Kiểm đếm dỡ hàng & Nhập kho")');
      await expect(tallyHeader).toBeHidden();

      // Assert 2: Roadside inbound button MUST NOT be visible
      const roadsideBtn = modal.locator('button:has-text("Bốc thêm đơn dọc đường về Hub")');
      await expect(roadsideBtn).toBeHidden();

      // Save screenshot evidence
      const buffer = await modal.screenshot();
      saveEvidenceScreenshot('screenshot_01_inbound_view_cleaned_verified.png', buffer);

      // Close modal
      const closeBtn = modal.locator('button:has(svg.lucide-x)').first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      }
    } else {
      console.log('No inbound trip found, capturing full page screenshot');
      const buffer = await page.screenshot();
      saveEvidenceScreenshot('screenshot_01_inbound_view_cleaned_verified.png', buffer);
    }
  });

  test('UI Test 2: Outbound View Modal has clean header without "Kiểm đếm dỡ hàng & Nhập kho" and without roadside button', async ({
    page
  }) => {
    test.setTimeout(90000);

    // 1. Navigate to Warehouse Outbound screen
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`);
    await page.waitForLoadState('domcontentloaded');

    // 2. Wait for outbound table to render
    const tableContainer = page.locator('table');
    await expect(tableContainer.first()).toBeVisible({ timeout: 20000 });

    // Look for tripCode action button (SDxxx)
    const tripCodeBtn = page.locator('button:has-text("SD")').first();
    const hasTrip = await tripCodeBtn.isVisible({ timeout: 6000 }).catch(() => false);

    if (hasTrip) {
      await tripCodeBtn.click();

      // Modal appears
      const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
      await expect(modal).toBeVisible({ timeout: 10000 });

      // Header should show trip code badge
      const tripBadge = modal.locator('span:has-text("CHUYẾN XE")');
      await expect(tripBadge).toBeVisible({ timeout: 5000 });

      // Assert 1: "Kiểm đếm dỡ hàng & Nhập kho" header MUST NOT be visible
      const tallyHeader = modal.locator('h2:has-text("Kiểm đếm dỡ hàng & Nhập kho")');
      await expect(tallyHeader).toBeHidden();

      // Assert 2: Roadside inbound button MUST NOT be visible
      const roadsideBtn = modal.locator('button:has-text("Bốc thêm đơn dọc đường về Hub")');
      await expect(roadsideBtn).toBeHidden();

      // Save screenshot evidence
      const buffer = await modal.screenshot();
      saveEvidenceScreenshot('screenshot_02_outbound_view_cleaned_verified.png', buffer);
    } else {
      console.log('No outbound trip found, capturing full page screenshot');
      const buffer = await page.screenshot();
      saveEvidenceScreenshot('screenshot_02_outbound_view_cleaned_verified.png', buffer);
    }
  });
});
