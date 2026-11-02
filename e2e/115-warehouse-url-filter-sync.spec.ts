import { test, expect } from '@playwright/test';
import { loginAs, USER_WAREHOUSE_HYN, USER_WAREHOUSE_HCM } from './helpers/auth';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../feedbacks/feedback_02_11_task_115_warehouse_url_filter_sync'
);

test.describe('Task 115 - Warehouse Inbound & Outbound URL Query Filter Sync', () => {
  test.beforeAll(() => {
    process.env.PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';
    process.env.API_URL = process.env.API_URL || 'http://localhost:4001/api/v1';
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('should sync search bar and date range to URL on Inbound page', async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';

    // 1. Login as Hưng Yên warehouse
    await loginAs(page, USER_WAREHOUSE_HYN);

    // 2. Navigate to Inbound page
    await page.goto(`${baseUrl}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify URL initially includes fromDate & toDate
    expect(page.url()).toContain('fromDate=');
    expect(page.url()).toContain('toDate=');

    // 3. Type into Search bar and press Enter
    const searchInput = page.locator('input[placeholder*="Tìm mã chuyến, xe"]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill('SD537');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    // Verify URL has search=SD537
    expect(page.url()).toContain('search=SD537');

    // 4. Clear search via X button
    const clearSearchBtn = page.locator('button[title="Xóa tìm kiếm"]');
    await expect(clearSearchBtn).toBeVisible({ timeout: 5_000 });
    await clearSearchBtn.click();
    await page.waitForTimeout(1000);

    // Verify search is removed from URL
    expect(page.url()).not.toContain('search=');
    await expect(searchInput).toHaveValue('');

    // 5. TEST USER REQUIREMENT: Type search text 'sd573' (without pressing Enter), then click "Áp dụng" in date filter
    await searchInput.fill('sd573');
    const dateFilterTrigger = page.locator('[data-testid="date-filter-dropdown-trigger"]');
    await dateFilterTrigger.click();
    await page.waitForTimeout(500);

    const fromDateInput = page.locator('input[type="date"]').first();
    const toDateInput = page.locator('input[type="date"]').nth(1);
    await fromDateInput.fill('2026-10-01');
    await toDateInput.fill('2026-11-02');

    const applyDateBtn = page.locator('button').filter({ hasText: 'Áp dụng' });
    await applyDateBtn.click();
    await page.waitForTimeout(1000);

    // Verify BOTH the date range AND the search text 'sd573' were applied together to the URL!
    expect(page.url()).toContain('search=sd573');
    expect(page.url()).toContain('fromDate=2026-10-01');
    expect(page.url()).toContain('toDate=2026-11-02');

    // 6. Test direct URL hydration
    await page.goto(`${baseUrl}/dashboard/warehouse/inbound?search=SD537&fromDate=2026-10-20&toDate=2026-10-31`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify input hydrated with SD537
    await expect(searchInput).toHaveValue('SD537');
    // Verify date range button reflects hydrated dates
    const dateBtn = page.locator('[data-testid="date-filter-dropdown-trigger"]');
    await expect(dateBtn).toBeVisible({ timeout: 10_000 });
    await expect(dateBtn).toContainText('20/10/2026');
    await expect(dateBtn).toContainText('31/10/2026');

    // Capture screenshot evidence
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'screenshot_01_inbound_url_sync_verified.png'),
      fullPage: true
    });
  });

  test('should sync search bar and date range to URL on Outbound page', async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';

    // 1. Login as HCM warehouse
    await loginAs(page, USER_WAREHOUSE_HCM);

    // 2. Navigate to Outbound page
    await page.goto(`${baseUrl}/dashboard/warehouse/outbound`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify URL initially includes fromDate & toDate
    expect(page.url()).toContain('fromDate=');
    expect(page.url()).toContain('toDate=');

    // 3. Type into Search bar and press Enter
    const searchInput = page.locator('input[placeholder*="Tìm mã đơn, xe"]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill('SD537');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    // Verify URL has search=SD537
    expect(page.url()).toContain('search=SD537');

    // 4. Clear search via X button
    const clearSearchBtn = page.locator('button[title="Xóa tìm kiếm"]');
    await expect(clearSearchBtn).toBeVisible({ timeout: 5_000 });
    await clearSearchBtn.click();
    await page.waitForTimeout(1000);

    // Verify search is removed from URL
    expect(page.url()).not.toContain('search=');
    await expect(searchInput).toHaveValue('');

    // 5. TEST USER REQUIREMENT: Type search text 'sd573' (without pressing Enter), then click "Áp dụng" in date filter
    await searchInput.fill('sd573');
    const dateFilterTrigger = page.locator('[data-testid="date-filter-dropdown-trigger"]');
    await dateFilterTrigger.click();
    await page.waitForTimeout(500);

    const fromDateInput = page.locator('input[type="date"]').first();
    const toDateInput = page.locator('input[type="date"]').nth(1);
    await fromDateInput.fill('2026-10-01');
    await toDateInput.fill('2026-11-02');

    const applyDateBtn = page.locator('button').filter({ hasText: 'Áp dụng' });
    await applyDateBtn.click();
    await page.waitForTimeout(1000);

    // Verify BOTH the date range AND the search text 'sd573' were applied together to the URL!
    expect(page.url()).toContain('search=sd573');
    expect(page.url()).toContain('fromDate=2026-10-01');
    expect(page.url()).toContain('toDate=2026-11-02');

    // 6. Test direct URL hydration
    await page.goto(`${baseUrl}/dashboard/warehouse/outbound?search=SD537&fromDate=2026-10-20&toDate=2026-10-31`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify input hydrated with SD537
    await expect(searchInput).toHaveValue('SD537');
    const dateBtn = page.locator('[data-testid="date-filter-dropdown-trigger"]');
    await expect(dateBtn).toBeVisible({ timeout: 10_000 });
    await expect(dateBtn).toContainText('20/10/2026');
    await expect(dateBtn).toContainText('31/10/2026');

    // Capture screenshot evidence
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'screenshot_02_outbound_url_sync_verified.png'),
      fullPage: true
    });
  });
});
