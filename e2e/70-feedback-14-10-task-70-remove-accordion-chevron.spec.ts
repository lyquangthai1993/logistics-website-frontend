/**
 * frontend/e2e/70-feedback-14-10-task-70-remove-accordion-chevron.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 14/10 (Task #70) — Loại bỏ nút mũi tên (>) mở rộng accordion bảng con
 * ở cột CHUYẾN XE / TRIP trong màn hình Xuất kho & Nhập kho.
 *
 * Verification Requirements:
 * 1. Bảng điều hành Nhập kho (/dashboard/warehouse/inbound):
 *    - 100% không còn nút chevron (>) mở rộng accordion ở cột CHUYẾN XE / TRIP.
 *    - 100% không còn nút "Mở rộng tất cả / Thu gọn tất cả" trên thanh công cụ toolbar.
 *    - Click trực tiếp mã chuyến xe mở Modal Chi tiết Chuyến xe (WarehouseTripDetailModal).
 * 2. Bảng điều hành Xuất kho (/dashboard/warehouse/outbound):
 *    - 100% không còn nút chevron (>) mở rộng accordion ở cột CHUYẾN XE / TRIP.
 *    - 100% không còn nút "Mở rộng tất cả / Thu gọn tất cả" trên thanh công cụ toolbar.
 *    - Click trực tiếp mã chuyến xe mở Modal Chi tiết Chuyến xe (WarehouseTripDetailModal).
 * 3. Modal Chi tiết Chuyến xe là Single Source of Truth cho danh sách đơn & in tem.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const DEV_BACKEND_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://backend-tms-core-dev.up.railway.app/api/v1';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_14_10_task_70');

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
  .serial('Feedback 14/10 (Task #70) — Remove Accordion Chevron & Sub-tables from Trip Boards', () => {
  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post(`${DEV_BACKEND_URL}/auth/email/login`, {
      data: {
        email: USER_WAREHOUSE_HCM.email,
        password: USER_WAREHOUSE_HCM.password
      },
      timeout: 15000
    });
    expect(loginRes.ok(), `Login failed with status ${loginRes.status()}`).toBeTruthy();
    const loginJson = await loginRes.json();
    authToken = loginJson?.data?.token ?? loginJson?.token;
    expect(authToken).toBeTruthy();
  });

  test('Outbound & Inbound API Manifest Endpoints respond successfully', async ({ request }) => {
    const [inboundRes, outboundRes] = await Promise.all([
      request.get(`${DEV_BACKEND_URL}/warehouse/inbound-trips?limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 15000
      }),
      request.get(`${DEV_BACKEND_URL}/warehouse/outbound-trips?limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 15000
      })
    ]);

    expect(inboundRes.ok()).toBeTruthy();
    expect(outboundRes.ok()).toBeTruthy();
  });

  test('UI Outbound: No chevron buttons or expand-all toolbar, clicking tripCode opens modal', async ({
    page
  }) => {
    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`);
    await page.waitForLoadState('domcontentloaded');

    // Ensure page title is visible
    await expect(page.locator('h1, h2, span').filter({ hasText: /xuất kho/i }).first()).toBeVisible({
      timeout: 15000
    });

    // 1. Verify "Mở rộng/Thu gọn tất cả" button does NOT exist
    const expandAllBtn = page.getByRole('button', { name: /mở rộng tất cả|thu gọn tất cả/i });
    await expect(expandAllBtn).toHaveCount(0);

    // 2. Verify no accordion toggle chevrons inside the table
    const accordionToggleChevrons = page.locator('button[aria-label*="Mở rộng chuyến xe"], button[title*="Mở rộng chuyến xe"]');
    await expect(accordionToggleChevrons).toHaveCount(0);

    // 3. Find trip rows and assert trips exist
    const tripCodeButtons = page.locator('button.font-mono.font-bold, button span.font-mono.font-bold');
    await tripCodeButtons.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const tripCount = await tripCodeButtons.count();
    expect(tripCount).toBeGreaterThan(0);

    const firstTripBtn = tripCodeButtons.first();
    await firstTripBtn.click();

    // Trip Inspection Modal must open
    const modal = page.locator('[role="dialog"], [data-testid="trip-detail-modal"], .fixed.inset-0').filter({
      hasText: /thông tin chuyến xe|chi tiết chuyến xe|bảng kê chuyến xe/i
    }).first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Save screenshot evidence
    const screenshot = await page.screenshot({ fullPage: true });
    saveEvidenceScreenshot('screenshot_01_outbound_no_chevron_verified.png', screenshot);

    // Close modal
    const closeBtn = page.getByRole('button', { name: /đóng/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('UI Inbound: No chevron buttons or expand-all toolbar, clicking tripCode opens modal', async ({
    page
  }) => {
    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('domcontentloaded');

    // Ensure page title is visible
    await expect(page.locator('h1, h2, span').filter({ hasText: /nhập kho/i }).first()).toBeVisible({
      timeout: 15000
    });

    // 1. Verify "Mở rộng/Thu gọn tất cả" button does NOT exist
    const expandAllBtn = page.getByRole('button', { name: /mở rộng tất cả|thu gọn tất cả/i });
    await expect(expandAllBtn).toHaveCount(0);

    // 2. Verify no accordion toggle chevrons inside the table
    const accordionToggleChevrons = page.locator('button[aria-label*="Mở rộng chuyến xe"], button[title*="Mở rộng chuyến xe"]');
    await expect(accordionToggleChevrons).toHaveCount(0);

    // 3. Find trip rows and assert trips exist
    const tripCodeButtons = page.locator('button.font-mono.font-bold, button span.font-mono.font-bold');
    await tripCodeButtons.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const tripCount = await tripCodeButtons.count();
    expect(tripCount).toBeGreaterThan(0);

    const firstTripBtn = tripCodeButtons.first();
    await firstTripBtn.click();

    // Trip Inspection Modal must open
    const modal = page.locator('[role="dialog"], [data-testid="trip-detail-modal"], .fixed.inset-0').filter({
      hasText: /thông tin chuyến xe|chi tiết chuyến xe|bảng kê chuyến xe/i
    }).first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Save screenshot evidence
    const screenshot = await page.screenshot({ fullPage: true });
    saveEvidenceScreenshot('screenshot_02_inbound_no_chevron_verified.png', screenshot);

    // Close modal
    const closeBtn = page.getByRole('button', { name: /đóng/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });
});
