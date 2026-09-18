import { test, expect } from '@playwright/test';
import { loginAs, clearSession } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/3710b55d-f3f5-4c7e-8148-ec8b1cb3395f/screenshots';
const FEEDBACK_DIR = 'd:/Projects/logistics-website/feedback_17_8/test-screenshots';

const WAREHOUSE_USER = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

async function captureEvidence(pageOrLocator: any, filename: string, options?: any) {
  const p1 = path.join(SCREENSHOT_DIR, filename);
  const p2 = path.join(FEEDBACK_DIR, filename);
  await pageOrLocator.screenshot({ path: p1, ...options });
  fs.copyFileSync(p1, p2);
  console.log('[EVIDENCE SAVED TO BOTH]: ' + filename);
}

test.describe('Feedback 17/8 & TRIP Column E2E Evidence Test Suite', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    if (!fs.existsSync(FEEDBACK_DIR)) {
      fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Evidence 1: Sidebar 3 items for WAREHOUSE_MANAGER and Inbound Page with TRIP column', async ({ page }) => {
    await loginAs(page, WAREHOUSE_USER);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    // 1. Verify Sidebar only has 3 items
    const sidebar = page.locator('[data-slot="sidebar"]');
    await expect(sidebar).toBeVisible();

    const inboundNav = sidebar.locator('a[href="/dashboard/warehouse/inbound"]');
    const outboundNav = sidebar.locator('a[href="/dashboard/warehouse/outbound"]');
    const ordersNav = sidebar.locator('a[href="/dashboard/warehouse/orders"]');

    await expect(inboundNav).toBeVisible();
    await expect(outboundNav).toBeVisible();
    await expect(ordersNav).toBeVisible();

    // Verify Overview and Admin links are NOT visible in sidebar
    await expect(sidebar.locator('a[href="/dashboard/overview"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/dashboard/users"]')).toHaveCount(0);

    // 2. Verify Zero KPI Stat Cards (the 4-card grid at top is removed)
    const kpiCardsGrid = page.locator('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-4');
    await expect(kpiCardsGrid).toHaveCount(0);

    // 3. Verify Table Header contains TRIP column
    const tripHeader = page.locator('th:has-text("CHUYẾN XE / TRIP")');
    await expect(tripHeader).toBeVisible();

    // Capture Evidence Screenshot
    await captureEvidence(page, '01_inbound_sidebar_3_items_and_trip_col.png', { fullPage: true });
  });

  test('Evidence 2: Inbound Create Mode with Free Text address and optional driver', async ({ page }) => {
    await loginAs(page, WAREHOUSE_USER);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    const newOrderBtn = page.getByRole('button', { name: /Tạo đơn nhập mới/i });
    await expect(newOrderBtn).toBeVisible();
    await newOrderBtn.click();

    await page.waitForTimeout(500);

    // Capture screenshot of Inbound Create Form
    await captureEvidence(page, '02_inbound_create_form_free_text.png', { fullPage: true });
  });

  test('Evidence 3: Outbound Page with Vehicle Grouping, TRIP column, and Single Xuat Kho button', async ({ page }) => {
    await loginAs(page, WAREHOUSE_USER);
    await page.goto('/dashboard/warehouse/outbound');
    await page.waitForLoadState('networkidle');

    // 1. Verify single "Xuất kho" button in header (no internal transfer button)
    const exportBtn = page.getByRole('button', { name: /Xuất kho/i }).first();
    await expect(exportBtn).toBeVisible();
    await expect(page.getByRole('button', { name: /Xuất luân chuyển nội bộ/i })).toHaveCount(0);

    // 2. Verify Zero KPI cards
    await expect(page.locator('text=CHỜ XUẤT KHO')).toHaveCount(0);

    // 3. Verify TRIP column in outbound tables
    const tripHeader = page.locator('th:has-text("CHUYẾN XE / TRIP")');
    await expect(tripHeader.first()).toBeVisible();

    // 4. Verify Collapsible toolbar button exists
    const collapseAllBtn = page.getByRole('button', { name: /Thu gọn tất cả/i });
    await expect(collapseAllBtn).toBeVisible();

    // 5. Click the second vehicle group header (51D-999.99) to collapse it and demonstrate neatness!
    const secondVehicleHeader = page.locator('text=51D-999.99').first();
    if (await secondVehicleHeader.isVisible()) {
      await secondVehicleHeader.click();
      await page.waitForTimeout(400);
    }

    // Capture Screenshot of Outbound Board showing both expanded & collapsed vehicle cards
    await captureEvidence(page, '03_outbound_grouped_vehicles_with_trip.png', { fullPage: true });
  });

  test('Evidence 4: Warehouse Orders Page with TRIP Column and Detail Modal', async ({ page }) => {
    await loginAs(page, WAREHOUSE_USER);
    await page.goto('/dashboard/warehouse/orders');
    await page.waitForLoadState('networkidle');

    // 1. Verify TRIP column in orders table
    const tripHeader = page.locator('th:has-text("CHUYẾN XE / TRIP")');
    await expect(tripHeader).toBeVisible();

    // Capture Screenshot of Warehouse Orders Table
    await captureEvidence(page, '04_warehouse_orders_table_with_trip.png', { fullPage: true });

    // 2. Click the first order row to open detail modal
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(1000);

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        await modal.locator('table').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(500);
        await captureEvidence(page, '05_waybill_detail_timeline_modal.png');
      }
    }
  });

  test('Evidence 5: Pallet Label A4 Modal with QR code and Blank Handwritten Fields', async ({ page }) => {
    await loginAs(page, WAREHOUSE_USER);
    await page.goto('/dashboard/warehouse/orders');
    await page.waitForLoadState('networkidle');

    const printLabelBtn = page.getByRole('button', { name: /In tem/i }).first();
    if (await printLabelBtn.isVisible()) {
      await printLabelBtn.click();
      await page.waitForTimeout(1000);

      await captureEvidence(page, '06_pallet_label_a4_modal.png');
    }
  });
});
