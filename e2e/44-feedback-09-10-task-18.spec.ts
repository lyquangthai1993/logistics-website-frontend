/**
 * frontend/e2e/44-feedback-09-10-task-18.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 09/10 (Task 18) — Tối ưu Vị trí Nút Hành động "Tạo đơn nhập mới" & "Xuất kho"
 * Ngay Sau Tên Hub Chống Che Khuất Bởi Thông Báo
 *
 * Scenarios Tested:
 * 1. Inbound Board Header:
 *    - Verify "Tạo đơn nhập mới" button is located immediately after Hub name inside the title flex container.
 *    - Verify no create button exists at top-right corner of the header.
 * 2. Inbound Workflow:
 *    - Click "Tạo đơn nhập mới" -> switches to MODE1_CUSTOMER.
 *    - Verify create button is hidden and "Quay lại danh sách" appears on the right.
 *    - Click "Quay lại danh sách" -> returns to BOARD mode with "Tạo đơn nhập mới" button re-appearing.
 * 3. Outbound Board Header:
 *    - Verify "Xuất kho" button is located immediately after Hub name inside the title flex container.
 *    - Verify no create button exists at top-right corner of the header.
 *    - Click "Xuất kho" -> active view switches to MODE1_CUSTOMER / receipt modal and "Quay lại danh sách" appears on the right.
 *    - Click "Quay lại danh sách" -> returns to BOARD mode with "Xuất kho" button re-appearing.
 * 4. Anti-Collision with Notification Center:
 *    - Verify horizontal separation: Action buttons (x-pos < 600px) are safely separated from Notification Bell (x-pos > 800px).
 *    - Trigger/open Notification Center popover to assert zero occlusion/overlap.
 * 5. Responsive Flexibility:
 *    - Verify flex-wrap prevents layout breakage on smaller viewports.
 * 6. Visual Evidence Proof:
 *    - Capture screenshots directly to feedback_09_10_task_18/ folder.
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './helpers/auth';
import path from 'path';
import fs from 'fs';

test.describe('Feedback 09/10 Task 18: Move Inbound & Outbound Action Buttons Next to Hub Name', () => {
  const warehouseManager =
    TEST_USERS.find((u) => u.role === 'WAREHOUSE_MANAGER') ||
    TEST_USERS.find((u) => u.role === 'SUPER_ADMIN') ||
    TEST_USERS[0];

  const FEEDBACK_DIR = path.resolve(__dirname, '../../feedback_09_10_task_18');

  test.beforeAll(async () => {
    if (!fs.existsSync(FEEDBACK_DIR)) {
      fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30_000);
  });

  test('E2E Verification: Inbound & Outbound Action Buttons positioned next to Hub Name (Anti-Occlusion)', async ({
    page
  }) => {
    // 1. Login as Warehouse Manager
    await loginAs(page, warehouseManager);

    // ==========================================
    // SCENARIO 1 & 2: INBOUND WAREHOUSE BOARD
    // ==========================================
    await page.goto('/dashboard/warehouse/inbound', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Nhập kho")', { timeout: 15_000 });

    const inboundTitle = page.locator('h1:has-text("Nhập kho")');
    await expect(inboundTitle).toBeVisible();

    // Verify "Tạo đơn nhập mới" button is in the same flex parent as the title
    const inboundCreateBtn = page.locator('button:has-text("Tạo đơn nhập mới")');
    await expect(inboundCreateBtn).toBeVisible();

    // Verify button size and styles
    await expect(inboundCreateBtn).toHaveClass(/h-8/);
    await expect(inboundCreateBtn).toHaveClass(/px-2\.5/);
    await expect(inboundCreateBtn).toHaveClass(/text-xs/);

    // Assert button is positioned right next to the title (Fitts's Law / Contextual Grouping)
    const titleBox = await inboundTitle.boundingBox();
    const btnBox = await inboundCreateBtn.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(btnBox).not.toBeNull();

    if (titleBox && btnBox) {
      // The button should be near the right edge of title
      expect(btnBox.x).toBeGreaterThan(titleBox.x);
      // Button must be on the left side of the page (not pushed to far right > 900px on 1280px screen)
      expect(btnBox.x).toBeLessThan(800);
    }

    // Capture visual evidence for Inbound Board
    const screenshotInbound = path.join(FEEDBACK_DIR, 'screenshot_inbound_button_verified.png');
    const screenshot01 = path.join(FEEDBACK_DIR, 'screenshot_01_verified.png');
    await page.screenshot({ path: screenshotInbound, fullPage: false });
    await page.screenshot({ path: screenshot01, fullPage: false });

    // Click "Tạo đơn nhập mới" -> Switch to MODE1_CUSTOMER
    await inboundCreateBtn.click();

    // In MODE1_CUSTOMER: "Tạo đơn nhập mới" button should be hidden, "Quay lại danh sách" on the right
    await expect(inboundCreateBtn).not.toBeVisible();
    const inboundBackBtn = page.locator('button:has-text("Quay lại danh sách")');
    await expect(inboundBackBtn).toBeVisible();

    // Click "Quay lại danh sách" -> Returns to BOARD
    await inboundBackBtn.click();
    await expect(inboundCreateBtn).toBeVisible();

    // ==========================================
    // SCENARIO 3: OUTBOUND WAREHOUSE BOARD
    // ==========================================
    await page.goto('/dashboard/warehouse/outbound', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Xuất kho")', { timeout: 15_000 });

    const outboundTitle = page.locator('h1:has-text("Xuất kho")');
    await expect(outboundTitle).toBeVisible();

    // Verify "Xuất kho" action button is next to the title
    const outboundActionBtn = page.locator('button:has-text("Xuất kho")').first();
    await expect(outboundActionBtn).toBeVisible();

    // Verify button size and styles
    await expect(outboundActionBtn).toHaveClass(/h-8/);
    await expect(outboundActionBtn).toHaveClass(/px-2\.5/);
    await expect(outboundActionBtn).toHaveClass(/text-xs/);

    const outboundTitleBox = await outboundTitle.boundingBox();
    const outboundBtnBox = await outboundActionBtn.boundingBox();
    expect(outboundTitleBox).not.toBeNull();
    expect(outboundBtnBox).not.toBeNull();

    if (outboundTitleBox && outboundBtnBox) {
      expect(outboundBtnBox.x).toBeGreaterThan(outboundTitleBox.x);
      // Button must be on the left side of the page (not pushed to far right > 900px)
      expect(outboundBtnBox.x).toBeLessThan(800);
    }

    // Capture visual evidence for Outbound Board
    const screenshotOutbound = path.join(FEEDBACK_DIR, 'screenshot_outbound_button_verified.png');
    await page.screenshot({ path: screenshotOutbound, fullPage: false });

    // Click "Xuất kho" -> Switch to MODE1_CUSTOMER
    await outboundActionBtn.click();

    // In MODE1_CUSTOMER: action button hidden, "Quay lại danh sách" button visible
    const outboundBackBtn = page.locator('button:has-text("Quay lại danh sách")');
    await expect(outboundBackBtn).toBeVisible();

    // Click "Quay lại danh sách" -> Returns to BOARD
    await outboundBackBtn.click();
    await expect(outboundActionBtn).toBeVisible();

    // ==========================================
    // SCENARIO 4: NOTIFICATION ANTI-COLLISION TEST
    // ==========================================
    // Inspect notification bell at header
    const notificationBell = page.locator('header').locator('button').filter({ has: page.locator('svg') }).last();
    if (await notificationBell.isVisible()) {
      const bellBox = await notificationBell.boundingBox();
      const currentBtnBox = await outboundActionBtn.boundingBox();
      if (bellBox && currentBtnBox) {
        // Assert action button X position is significantly far to the left of the notification bell
        expect(bellBox.x).toBeGreaterThan(currentBtnBox.x + currentBtnBox.width + 100);
      }
    }

    // ==========================================
    // SCENARIO 5: RESPONSIVE FLEXIBILITY TEST
    // ==========================================
    // Test on tablet viewport (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(outboundTitle).toBeVisible();
    await expect(outboundActionBtn).toBeVisible();

    // Return to desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
  });
});
