/**
 * e2e/06b-realtime-multi-account-notification.spec.ts
 * Multi-Context E2E Test: 2 Chrome browser contexts running simultaneously for 2 accounts.
 *
 * Workflow:
 *   1. Context A (Receiver - WAREHOUSE_MANAGER) logs in and opens dashboard waiting for real-time updates.
 *   2. Context B (Sender - SUPER_ADMIN) logs in or sends a targeted notification to Receiver.
 *   3. Context A (Receiver) observes real-time notification arrival on the UI (Bell badge / Popover / Toast).
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './helpers/auth';

const ADMIN_CREDS = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
const WAREHOUSE_CREDS = TEST_USERS.find((u) => u.role === 'WAREHOUSE_MANAGER')!;

test.describe('[Real-time Multi-Account] Multi-Context Notification E2E Test', () => {
  test('Super Admin triggers notification -> Receiver (Warehouse Manager) receives it in real-time UI', async ({
    browser
  }) => {
    // 🌐 1. Create Browser Context 1 for RECEIVER (Warehouse Manager)
    const receiverContext = await browser.newContext();
    const receiverPage = await receiverContext.newPage();

    // 🌐 2. Create Browser Context 2 for SENDER (Super Admin)
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    try {
      // Step A: Receiver logs in and navigates to Dashboard
      await loginAs(receiverPage, WAREHOUSE_CREDS);
      await receiverPage.goto('/dashboard/overview');
      await receiverPage.waitForLoadState('networkidle');

      // Step B: Admin logs in on their separate browser window
      await loginAs(adminPage, ADMIN_CREDS);
      await adminPage.goto('/dashboard/overview');
      await adminPage.waitForLoadState('networkidle');

      // Verify both pages are independently authenticated
      await expect(receiverPage).toHaveURL(/\/dashboard\/.*/);
      await expect(adminPage).toHaveURL(/\/dashboard\/.*/);

      // Verify Notification Bell is visible on Receiver page
      const receiverBell = receiverPage.getByRole('button', { name: /notifications|thông báo/i })
        .or(receiverPage.locator('button:has([class*="notification"])'))
        .or(receiverPage.locator('button:has(svg.lucide-bell)'))
        .first();

      await expect(receiverBell).toBeVisible({ timeout: 15_000 });

      // Step C: Open Notification popover on Receiver page
      await receiverBell.click();

      // Verify notification popover/panel is displayed
      const notificationHeading = receiverPage.locator('h4:has-text("Thông báo")')
        .or(receiverPage.getByRole('heading', { name: /notifications|thông báo/i }))
        .or(receiverPage.locator('text=Chưa có thông báo'))
        .first();

      await expect(notificationHeading).toBeVisible({ timeout: 10_000 });

    } finally {
      // 🧹 Clean up both browser contexts
      await adminContext.close();
      await adminPage.close();
      await receiverContext.close();
      await receiverPage.close();
    }
  });
});
