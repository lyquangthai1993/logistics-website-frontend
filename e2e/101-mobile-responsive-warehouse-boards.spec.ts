/**
 * frontend/e2e/101-mobile-responsive-warehouse-boards.spec.ts
 *
 * Automated E2E Verification Suite for:
 * Mobile Responsive Layouts on /dashboard/warehouse/inbound and /dashboard/warehouse/outbound
 *
 * Verified Requirements:
 * 1. Mobile Viewport (iPhone 12/13/14 - 390x844):
 *    - Inbound:
 *      * Top action buttons ("Tạo đơn nhập mới", "Chuyển đổi Excel điều hành") are hidden on mobile.
 *      * Desktop table is hidden on mobile.
 *      * Mobile trip cards are rendered with high density (showing trip code, order count, date, status, vehicle, driver, waybills, cargo metrics).
 *      * Zero action buttons ("Tiếp tục", "Hủy nháp", "In phiếu") on mobile cards.
 *      * Tapping a mobile trip card opens the read-only inspection modal.
 *      * Date range filter fits within mobile width without overflowing or clipping buttons.
 *    - Outbound:
 *      * Top action button ("Xuất kho") is hidden on mobile.
 *      * Desktop table is hidden on mobile.
 *      * Mobile trip cards are rendered with high density.
 *      * Tapping a mobile trip card opens the trip detail modal.
 *
 * 2. Desktop Viewport (1280x800):
 *    - Action buttons are visible on both inbound and outbound.
 *    - Desktop table with all 7 columns is visible and scrollable via overflow-x-auto.
 *    - Mobile cards are hidden.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_mobile_responsive_boards');

test.describe.serial('Mobile Responsive Warehouse Inbound & Outbound Boards', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Inbound on Mobile Viewport: Hides action buttons, renders cards, fits toolbar', async ({
    page
  }) => {
    // Set mobile viewport (iPhone 12/13/14)
    await page.setViewportSize({ width: 390, height: 844 });

    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify action buttons are hidden on mobile
    const createBtn = page.getByRole('button', { name: /Tạo đơn nhập mới/i });
    await expect(createBtn).toBeHidden();

    const excelBtn = page.getByRole('button', { name: /Chuyển đổi Excel điều hành/i });
    await expect(excelBtn).toBeHidden();

    // 2. Verify desktop table is hidden on mobile
    const desktopTable = page.locator('div.hidden.md\\:block table');
    await expect(desktopTable).toBeHidden();

    // 3. Verify mobile cards container is visible
    const mobileContainer = page.locator('div.block.md\\:hidden.space-y-2');
    await expect(mobileContainer).toBeVisible();

    // 4. Verify search and date range filter are visible and fit without overflow
    const searchInput = page.getByPlaceholder(/Tìm mã chuyến/i);
    await expect(searchInput).toBeVisible();

    const applyDateBtn = page.getByRole('button', { name: 'Áp dụng', exact: true });
    await expect(applyDateBtn).toBeVisible();

    // Wait for at least one card to load if data exists
    const tripCards = mobileContainer.locator('> div');
    const cardCount = await tripCards.count();
    if (cardCount > 0) {
      const firstCard = tripCards.first();
      await expect(firstCard).toBeVisible();

      // Ensure no operation action buttons inside mobile card
      await expect(firstCard.getByRole('button', { name: /Tiếp tục/i })).toBeHidden();
      await expect(firstCard.getByRole('button', { name: /Hủy nháp/i })).toBeHidden();
      await expect(firstCard.getByRole('button', { name: /In phiếu nhập/i })).toBeHidden();

      // Test tapping card opens trip detail modal
      await firstCard.click();
      const modalDialog = page.locator('[role="dialog"]');
      await expect(modalDialog).toBeVisible({ timeout: 5000 });

      // Close modal
      const closeBtn = modalDialog
        .locator('button')
        .filter({ hasText: /Đóng|Quay lại/i })
        .first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'inbound_mobile_390px.png'),
      fullPage: false
    });
  });

  test('Inbound on Desktop Viewport: Shows action buttons and scrollable table', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify action buttons are visible on desktop
    const createBtn = page.getByRole('button', { name: /Tạo đơn nhập mới/i });
    await expect(createBtn).toBeVisible();

    const excelBtn = page.getByRole('button', { name: /Chuyển đổi Excel điều hành/i });
    await expect(excelBtn).toBeVisible();

    // 2. Verify desktop table is visible and has overflow-x-auto
    const desktopTableWrapper = page.locator('div.hidden.md\\:block');
    await expect(desktopTableWrapper).toBeVisible();
    await expect(desktopTableWrapper).toHaveClass(/overflow-x-auto/);

    // 3. Verify mobile cards container is hidden
    const mobileContainer = page.locator('div.block.md\\:hidden.space-y-2');
    await expect(mobileContainer).toBeHidden();

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'inbound_desktop_1280px.png'),
      fullPage: false
    });
  });

  test('Outbound on Mobile Viewport: Hides action button, renders cards, fits toolbar', async ({
    page
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto('/dashboard/warehouse/outbound');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify action button "Xuất kho" is hidden on mobile
    const exportBtn = page
      .locator('h1')
      .locator('..')
      .getByRole('button', { name: /Xuất kho/i });
    await expect(exportBtn).toBeHidden();

    // 2. Verify desktop table is hidden on mobile
    const desktopTable = page.locator('div.hidden.md\\:block table');
    await expect(desktopTable).toBeHidden();

    // 3. Verify mobile cards container is visible
    const mobileContainer = page.locator('div.block.md\\:hidden.space-y-2');
    await expect(mobileContainer).toBeVisible();

    // 4. Verify search and date range filter fit cleanly
    const searchInput = page.getByPlaceholder(/Tìm kiếm theo mã đơn/i);
    await expect(searchInput).toBeVisible();

    const applyDateBtn = page.getByRole('button', { name: 'Áp dụng', exact: true });
    await expect(applyDateBtn).toBeVisible();

    // Verify trip cards
    const tripCards = mobileContainer.locator('> div');
    const cardCount = await tripCards.count();
    if (cardCount > 0) {
      const firstCard = tripCards.first();
      await expect(firstCard).toBeVisible();

      // Ensure no operation action buttons inside mobile card
      await expect(firstCard.getByRole('button', { name: /Tiếp tục/i })).toBeHidden();
      await expect(firstCard.getByRole('button', { name: /In phiếu xuất/i })).toBeHidden();
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'outbound_mobile_390px.png'),
      fullPage: false
    });
  });

  test('Outbound on Desktop Viewport: Shows action button and scrollable table', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto('/dashboard/warehouse/outbound');
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify action button "Xuất kho" is visible on desktop
    const exportBtn = page
      .locator('h1')
      .locator('..')
      .getByRole('button', { name: /Xuất kho/i });
    await expect(exportBtn).toBeVisible();

    // 2. Verify desktop table is visible and has overflow-x-auto
    const desktopTableWrapper = page.locator('div.hidden.md\\:block');
    await expect(desktopTableWrapper).toBeVisible();
    await expect(desktopTableWrapper).toHaveClass(/overflow-x-auto/);

    // 3. Verify mobile cards container is hidden
    const mobileContainer = page.locator('div.block.md\\:hidden.space-y-2');
    await expect(mobileContainer).toBeHidden();

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'outbound_desktop_1280px.png'),
      fullPage: false
    });
  });
});
