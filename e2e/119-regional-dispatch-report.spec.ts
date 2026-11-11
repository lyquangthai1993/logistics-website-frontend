import { test, expect } from '@playwright/test';
import { loginAs, USER_ADMIN } from './helpers/auth';

test.describe('[Task 119] Regional Dispatch Report with Horizontal Bar Charts', () => {
  test('Should render integrated regional dispatch table with horizontal bar charts on /dashboard/admin/reports', async ({ page }) => {
    // 1. Login as Super Admin
    await loginAs(page, USER_ADMIN);

    // 2. Navigate to /dashboard/admin/reports
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';
    await page.goto(`${baseUrl}/dashboard/admin/reports`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // 3. Verify page header
    const pageHeading = page.locator('h1, h2, h3').filter({ hasText: /báo cáo/i }).first();
    await expect(pageHeading).toBeVisible({ timeout: 15_000 });

    // 4. Verify Monthly Operational Trends is NOT hidden
    const monthlyTrendsTitle = page.locator('text=BÁO CÁO KẾT QUẢ HOẠT ĐỘNG VẬN HÀNH — XU HƯỚNG THEO THÁNG');
    await expect(monthlyTrendsTitle).toBeVisible({ timeout: 15_000 });

    // 5. Verify Regional Dispatch Table exists on this page
    const regionalReportTitle = page.locator('text=Cân Đối Tải Trọng Đội Xe Theo Miền');
    await expect(regionalReportTitle).toBeVisible({ timeout: 15_000 });

    // 6. Verify Visual Horizontal Bar Chart Section
    const horizontalChartTitle = page.locator('text=BIỂU ĐỒ THANH NGANG SO SÁNH TỶ TRỌNG CÂN ĐỐI THEO VÙNG MIỀN');
    await expect(horizontalChartTitle).toBeVisible({ timeout: 15_000 });

    // 7. Verify regions in table
    await expect(page.locator('text=MIỀN BẮC').first()).toBeVisible();
    await expect(page.locator('text=MIỀN TRUNG').first()).toBeVisible();
    await expect(page.locator('text=MIỀN NAM').first()).toBeVisible();
    await expect(page.locator('text=CHƯA PHÂN MIỀN (N/A)').first()).toBeVisible();

    // 8. Capture visual evidence screenshots
    await page.screenshot({
      path: 'e2e/screenshots/regional-dispatch-horizontal-bars.png',
      fullPage: false
    });

    // Scroll to table and capture
    await page.locator('table').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'e2e/screenshots/regional-dispatch-table-full.png',
      fullPage: false
    });

    // Scroll to Monthly Trends chart and capture
    await monthlyTrendsTitle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'e2e/screenshots/monthly-trends-chart.png',
      fullPage: false
    });
  });
});
