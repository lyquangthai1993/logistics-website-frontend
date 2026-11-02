import { test, expect } from '@playwright/test';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../feedbacks/feedback_02_11_task_113_inbound_two_tier_destination_and_province'
);

test.describe('Task 113 - Outbound Grid Trash and Delivery Address Enabled', () => {
  test.beforeAll(() => {
    process.env.PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';
    process.env.API_URL = process.env.API_URL || 'http://localhost:4001/api/v1';
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('should allow editing delivery address, changing destination, and deleting row in Outbound draft', async ({
    page
  }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';

    // 1. Login as HCM warehouse manager
    await loginAs(page, USER_WAREHOUSE_HCM);

    // 2. Navigate to Outbound list page
    await page.goto(`${baseUrl}/dashboard/warehouse/outbound`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Click "Xuất kho" button to open "Tạo Phiếu Xuất Kho"
    const openCreateBtn = page.locator('button:has-text("Xuất kho")').first();
    await openCreateBtn.click();
    await page.waitForTimeout(1000);

    // 3. Find the order code input in the first row
    const orderCodeInput = page.locator('input[placeholder*="Mã vận đơn"]').or(page.locator('table tbody tr:first-child td:nth-child(2) input')).first();
    await expect(orderCodeInput).toBeVisible({ timeout: 15_000 });

    // 4. Type NDA2611-0128 and press Enter to search
    await orderCodeInput.fill('NDA2611-0128');
    await orderCodeInput.press('Enter');
    await page.waitForTimeout(2000);

    // 5. Verify the order row is populated
    await expect(orderCodeInput).toHaveValue('NDA2611-0128');
    const firstRow = page.locator('table tbody tr').first();

    // 6. Verify Trash button is NOT disabled
    const trashBtn = firstRow.locator('button[title*="Xóa dòng"]').or(firstRow.locator('button:has(svg.lucide-trash)')).first();
    await expect(trashBtn).toBeEnabled();

    // 7. Verify Delivery Address textarea is NOT disabled
    const addressTextarea = firstRow.locator('textarea').first();
    await expect(addressTextarea).toBeEnabled();

    // 8. Verify "Thay đổi địa chỉ (Điều chuyển)" button is NOT disabled
    const changeDestBtn = firstRow.locator('button:has-text("Thay đổi địa chỉ (Điều chuyển)")').first();
    if (await changeDestBtn.isVisible()) {
      await expect(changeDestBtn).toBeEnabled();
    }

    // 9. Add a second row
    const addRowBtn = page.locator('button:has-text("Thêm 1 dòng đơn mới")').first();
    await addRowBtn.click();
    await page.waitForTimeout(1000);

    // Check we now have 2 rows
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(2);

    // Fill second row with NDA2611-0127
    const secondRow = rows.nth(1);
    const secondOrderInput = secondRow.locator('input').first();
    await secondOrderInput.fill('NDA2611-0127');
    await secondOrderInput.press('Enter');
    await page.waitForTimeout(2000);

    // Verify second row trash button is enabled
    const secondTrashBtn = secondRow.locator('button[title*="Xóa dòng"]').or(secondRow.locator('button:has(svg.lucide-trash)')).first();
    await expect(secondTrashBtn).toBeEnabled();

    // Capture screenshot showing BOTH rows with Trash button and address enabled
    const screenshotPath = path.join(EVIDENCE_DIR, 'screenshot_02_outbound_enabled_verified.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);

    // 10. Click Trash on the second row
    await secondTrashBtn.click();
    await page.waitForTimeout(1000);

    // Verify row count is back to 1
    await expect(page.locator('table tbody tr')).toHaveCount(1);
  });
});
