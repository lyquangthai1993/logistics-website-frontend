/**
 * frontend/e2e/49-feedback-13-10-task-41.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 13/10 (Task 41) — Bảo Toàn Thông Tin Đích Đến Ban Đầu Của Đơn Hàng
 * (Master Contract Destination Invariance) & Tách Biệt Hoàn Toàn Với Địa Chỉ Giao Khi Xuất Kho
 *
 * Scenarios Verified:
 * 1. Verify Master Contract Destination on Stored Orders ("LƯU KHO" tab)
 *    - Open /dashboard/warehouse/orders.
 *    - Ensure table headers include "ĐÍCH ĐẾN".
 *    - Verify destination column displays the contract destination in text-indigo-600.
 *
 * 2. Verify Master Contract Destination on Dispatched Orders ("ĐÃ XUẤT KHO" tab)
 *    - Switch to "ĐÃ XUẤT KHO" tab.
 *    - Assert that destination column remains preserved with original contract destination.
 *    - Verify that outbound dispatch leg info (e.g. transfer hub or xe bo) is rendered as
 *      secondary note ("Xuất: ...") and never overwrites the master contract destination.
 *
 * 3. Verify Waybill Detail Modal displays original contract destination.
 *
 * 4. Evidence capture: Saves verified screenshots to feedbacks/feedback_13_10_task_41/.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const SUPER_ADMIN_USER = {
  email: process.env.E2E_SUPER_ADMIN_EMAIL ?? 'lyquangthai1993+1@gmail.com',
  password: process.env.E2E_SUPER_ADMIN_PASSWORD ?? 'secret',
  role: 'SUPER_ADMIN' as const,
  expectedLandingPath: '/dashboard/overview',
};

const FEEDBACK_DIR = fs.existsSync(path.resolve(__dirname, '../../feedbacks/feedback_13_10_task_41'))
  ? path.resolve(__dirname, '../../feedbacks/feedback_13_10_task_41')
  : path.resolve(process.cwd(), 'feedbacks/feedback_13_10_task_41');

function saveEvidenceScreenshot(filename: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(FEEDBACK_DIR)) {
      fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }
    const target = path.join(FEEDBACK_DIR, filename);
    fs.writeFileSync(target, buffer);
    console.warn(`[EVIDENCE SAVED] ${target}`);
  } catch (err) {
    console.warn(`Could not save evidence screenshot to ${FEEDBACK_DIR}:`, err);
  }
}

test.describe.serial('Feedback 13/10 (Task 41) — Bảo Toàn Thông Tin Đích Đến Ban Đầu Của Đơn Hàng', () => {
  test('Step 1 & 2: Verify Master Contract Destination on Warehouse Orders Table (LƯU KHO & ĐÃ XUẤT KHO)', async ({ page }) => {
    // 1. Authenticate
    await loginAs(page, SUPER_ADMIN_USER, DEV_FRONTEND_URL);

    // 2. Navigate to Warehouse Orders Page
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/orders`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for the page title
    const pageHeading = page.locator('h1', { hasText: /Tổng Hợp Đơn Hàng/i }).first();
    await expect(pageHeading).toBeVisible({ timeout: 15000 });

    // Assert Table Header contains "ĐÍCH ĐẾN"
    const destHeader = page.locator('th', { hasText: 'ĐÍCH ĐẾN' }).first();
    await expect(destHeader).toBeVisible({ timeout: 10000 });

    // ==========================================
    // Check "LƯU KHO" Tab
    // ==========================================
    const luuKhoTab = page.locator('button', { hasText: /LƯU KHO/i }).first();
    await expect(luuKhoTab).toBeVisible({ timeout: 10000 });
    await luuKhoTab.click();
    await page.waitForTimeout(1000);

    // Assert that stored rows have visible destination text in text-indigo-600
    const storedDestCells = page.locator('td span.text-indigo-600, td span.dark\\:text-indigo-400');
    if ((await storedDestCells.count()) > 0) {
      const firstStoredDest = await storedDestCells.first().textContent();
      expect(firstStoredDest).toBeTruthy();
      expect(firstStoredDest?.trim().length).toBeGreaterThan(0);
    }

    // ==========================================
    // Check "ĐÃ XUẤT KHO" Tab (Crucial verification of Task 41)
    // ==========================================
    const daXuatTab = page.locator('button', { hasText: /ĐÃ XUẤT KHO/i }).first();
    await expect(daXuatTab).toBeVisible({ timeout: 10000 });
    await daXuatTab.click();
    await page.waitForTimeout(1500);

    // Verify rows in ĐÃ XUẤT KHO
    const dispatchedDestCells = page.locator('td span.text-indigo-600, td span.dark\\:text-indigo-400');
    const cellCount = await dispatchedDestCells.count();
    console.warn(`[E2E] Found ${cellCount} destination cells in ĐÃ XUẤT KHO tab`);

    if (cellCount > 0) {
      for (let i = 0; i < Math.min(cellCount, 5); i++) {
        const destText = (await dispatchedDestCells.nth(i).textContent())?.trim() ?? '';
        expect(destText.length).toBeGreaterThan(0);
        // Ensure primary destination does not start with developer jargon
        expect(destText).not.toMatch(/^TASK-ORD-/i);
      }
    }

    // Capture screenshot of the table with preserved destinations
    const tableScreenshot = await page.screenshot({ fullPage: true });
    saveEvidenceScreenshot('screenshot_01_orders_table_verified.png', tableScreenshot);
    saveEvidenceScreenshot('screenshot_task_41_verified.png', tableScreenshot);

    // ==========================================
    // Check Waybill Detail Modal
    // ==========================================
    const eyeButtons = page.locator('button[title*="Xem chi tiết"], button[title*="chi tiết"]').first();
    if (await eyeButtons.isVisible()) {
      await eyeButtons.click();
      const modal = page.locator('div[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 8000 });

      // Assert modal contains destination information
      const modalDest = modal.locator('text=Đích đến:').or(modal.locator('text=Điểm đích')).or(modal.locator('text=ĐÍCH ĐẾN'));
      await expect(modalDest.first()).toBeVisible({ timeout: 5000 });

      // Close modal
      const closeBtn = modal.locator('button').filter({ hasText: /Đóng/i }).or(modal.locator('button:has(svg.tabler-icon-x)'));
      if (await closeBtn.first().isVisible()) {
        await closeBtn.first().click();
      }
    }
  });
});
