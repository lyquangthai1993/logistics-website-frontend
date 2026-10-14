/**
 * frontend/e2e/71-feedback-14-10-task-71-mobile-trip-sticky-and-readonly.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 14/10 (Task #71) — Mobile Sticky Columns & Read-only Operations
 * in Warehouse Trip Manifests & Inbound/Outbound Workflows.
 *
 * Verification Requirements:
 * 1. Mobile Viewport (375x667):
 *    - Sticky column positioning: STT (left-0), MÃ VẬN ĐƠN (sticky left with shadow/border-r).
 * 2. Mobile Read-only Gate:
 *    - Khóa hoàn toàn inline editing (không có ô nhập số kiện input[type="number"]).
 *    - Không hiển thị nút "Bốc thêm đơn dọc đường về Hub" trên mobile.
 *    - Không hiển thị nút "Thêm đơn xuất từ kho lên xe" trên mobile.
 *    - Không hiển thị nút "Thay đổi địa chỉ (Điều chuyển)" trên mobile.
 * 3. Bảo toàn tính năng In tem Pallet A4:
 *    - Nút "In tất cả tem" trên header modal.
 *    - Nút "In tem" từng dòng hàng trong bảng.
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

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_14_10_task_71');

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
  .serial('Feedback 14/10 (Task #71) — Mobile Sticky Columns & Read-only Manifest Operations', () => {
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

  test('Mobile Inbound Modal: Verify Sticky Columns, Read-only Lock & Pallet Label Printing', async ({
    page
  }) => {
    // 1. Set mobile viewport (iPhone SE / Compact Mobile standard)
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('domcontentloaded');

    // Ensure page loaded
    await expect(page.locator('h1, h2, span').filter({ hasText: /nhập kho/i }).first()).toBeVisible({
      timeout: 15000
    });

    // 2. Open first trip modal and assert trips exist
    const tripCodeButtons = page.locator('button.font-mono.font-bold, button span.font-mono.font-bold');
    await tripCodeButtons.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const tripCount = await tripCodeButtons.count();
    expect(tripCount).toBeGreaterThan(0);

    await tripCodeButtons.first().click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // 3. Verify Mobile Read-only Gate:
    // "Bốc thêm đơn dọc đường về Hub" must NOT be visible on mobile
    const roadsideBtn = page.getByRole('button', { name: /bốc thêm đơn dọc đường/i });
    await expect(roadsideBtn).toHaveCount(0);

    // "Thêm đơn xuất từ kho lên xe" must NOT be visible on mobile
    const addCargoBtn = page.getByRole('button', { name: /thêm đơn xuất từ kho lên xe/i });
    await expect(addCargoBtn).toHaveCount(0);

    // "Thay đổi địa chỉ (Điều chuyển)" must NOT be visible on mobile
    const changeDestBtn = page.getByRole('button', { name: /thay đổi địa chỉ/i });
    await expect(changeDestBtn).toHaveCount(0);

    // Inline quantity inputs must NOT be editable on mobile
    const quantityInputs = modal.locator('table input[type="number"]');
    await expect(quantityInputs).toHaveCount(0);

    // 4. Verify Sticky Table Columns (STT & MÃ VẬN ĐƠN)
    const sttHeader = modal.locator('th').filter({ hasText: /^STT$/i }).first();
    await expect(sttHeader).toBeVisible();
    const sttPosition = await sttHeader.evaluate((el) => window.getComputedStyle(el).position);
    expect(sttPosition).toBe('sticky');

    const waybillHeader = modal.locator('th').filter({ hasText: /mã vận đơn/i }).first();
    await expect(waybillHeader).toBeVisible();
    const waybillPosition = await waybillHeader.evaluate((el) => window.getComputedStyle(el).position);
    expect(waybillPosition).toBe('sticky');

    // 5. Verify Pallet A4 Label Printing Buttons
    const printAllBtn = modal.getByRole('button', { name: /in tất cả tem/i });
    await expect(printAllBtn).toBeVisible();

    const rowPrintButtons = modal.locator('button').filter({ hasText: /in tem/i });
    const rowPrintCount = await rowPrintButtons.count();
    expect(rowPrintCount).toBeGreaterThan(0);

    // 6. Capture mobile evidence screenshot
    const screenshot = await page.screenshot({ fullPage: true });
    saveEvidenceScreenshot('screenshot_01_mobile_sticky_readonly_verified.png', screenshot);

    // Close modal
    const closeBtn = page.getByRole('button', { name: /đóng/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('Mobile Outbound Modal: Verify Sticky Columns & Read-only Invariants', async ({
    page
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1, h2, span').filter({ hasText: /xuất kho/i }).first()).toBeVisible({
      timeout: 15000
    });

    const tripCodeButtons = page.locator('button.font-mono.font-bold, button span.font-mono.font-bold');
    await tripCodeButtons.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const tripCount = await tripCodeButtons.count();
    expect(tripCount).toBeGreaterThan(0);

    await tripCodeButtons.first().click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Verify roadside button is hidden on mobile
    const roadsideBtn = page.getByRole('button', { name: /bốc thêm đơn dọc đường/i });
    await expect(roadsideBtn).toHaveCount(0);

    // Verify Sticky Table Columns (STT & MÃ VẬN ĐƠN)
    const sttHeader = modal.locator('th').filter({ hasText: /^STT$/i }).first();
    await expect(sttHeader).toBeVisible();
    const sttPosition = await sttHeader.evaluate((el) => window.getComputedStyle(el).position);
    expect(sttPosition).toBe('sticky');

    const waybillHeader = modal.locator('th').filter({ hasText: /mã vận đơn/i }).first();
    await expect(waybillHeader).toBeVisible();
    const waybillPosition = await waybillHeader.evaluate((el) => window.getComputedStyle(el).position);
    expect(waybillPosition).toBe('sticky');

    // Capture screenshot
    const screenshot = await page.screenshot({ fullPage: true });
    saveEvidenceScreenshot('screenshot_02_mobile_outbound_modal_verified.png', screenshot);

    const closeBtn = page.getByRole('button', { name: /đóng/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });
});
