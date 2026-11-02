import { test, expect } from '@playwright/test';
import { loginAs, USER_WAREHOUSE_HYN } from './helpers/auth';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../feedbacks/feedback_02_11_task_113_inbound_two_tier_destination_and_province'
);

test.describe('Task 113 - Inbound Two-Tier Destination & Province Display', () => {
  test.beforeAll(() => {
    process.env.PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';
    process.env.API_URL = process.env.API_URL || 'http://localhost:4001/api/v1';
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('should display two-tier unloading vs stay breakdown and province correctly for Polaris Hub - Hưng Yên', async ({
    page
  }) => {
    page.on('console', msg => {
      if (msg.text().includes('DEBUG')) console.log('BROWSER LOG:', msg.text());
    });
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';

    // 1. Login as Hưng Yên warehouse manager
    await loginAs(page, USER_WAREHOUSE_HYN);

    // 2. Navigate directly to Inbound page with date range covering SD537 (26/10/2026) and search=537
    await page.goto(`${baseUrl}/dashboard/warehouse/inbound?fromDate=2026-10-01&toDate=2026-11-05&search=537`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // 3. Verify trip SD537 row in Inbound table
    const tripRow = page.locator('tr').filter({ hasText: 'SD537' }).first();
    await expect(tripRow).toBeVisible({ timeout: 15_000 });

    // Verify the quantity cell shows: 448 kiện and breakdown (Dỡ: 315 • Lưu xe: 133)
    await expect(tripRow).toContainText('448 kiện');
    await expect(tripRow).toContainText('Dỡ: 315');
    await expect(tripRow).toContainText('Lưu xe: 133');

    // 4. Open Trip Detail / Edit Modal by clicking "Tiếp tục" or trip code
    const openBtn = tripRow.locator('button:has-text("Tiếp tục")').or(tripRow.locator('button:has-text("SD537")')).first();
    await openBtn.click();
    await page.waitForTimeout(2000);

    // 5. Verify modal is visible
    const modal = page.locator('[role="dialog"]').filter({ hasText: 'SD537' }).first();
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal).toContainText('SD537');

    // 6. Verify Summary Header Breakdown in Modal
    await expect(modal).toContainText('Dỡ tại kho này');
    await expect(modal).toContainText('315 kiện');
    await expect(modal).toContainText('Tiếp tục trên xe');
    await expect(modal).toContainText('133 kiện');

    // 7. Verify cargo lines show badges and proper customer provinces:
    const greenBadges1 = modal.locator('text=Dỡ kho Polaris Hub - Hưng Yên (Luân chuyển)');
    console.log('COUNT ON 1ST OPEN:', await greenBadges1.count());
    await expect(greenBadges1).toHaveCount(3);
    const greyBadges1 = modal.locator('text=Lưu xe (Không dỡ)');
    await expect(greyBadges1).toHaveCount(2);

    // 8. Close Modal
    const closeBtn = modal.locator('button:has-text("Đóng")').first();
    await closeBtn.click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // 9. Open Modal 2nd time
    await openBtn.click();
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(2000);

    // Log the entire inner text of table in modal on 2nd open:
    const tableText = await modal.locator('table').innerText().catch(() => 'NO TABLE FOUND');
    console.log('TABLE TEXT ON 2ND OPEN:\n', tableText);

    const greenBadges2 = modal.locator('text=Dỡ kho Polaris Hub - Hưng Yên (Luân chuyển)');
    console.log('COUNT ON 2ND OPEN:', await greenBadges2.count());
    await expect(greenBadges2).toHaveCount(3);
    await expect(modal.locator('text=Lưu xe (Không dỡ)')).toHaveCount(2);

    // 10. Capture verified screenshot evidence
    const screenshotPath = path.join(EVIDENCE_DIR, 'screenshot_01_verified.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });
});
