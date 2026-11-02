import { test, expect } from '@playwright/test';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../feedbacks/feedback_02_11_task_113_inbound_two_tier_destination_and_province'
);

test.describe('Task 113 - Outbound Grid Trash and Delivery Address Enabled & Waybill Identity Locked', () => {
  test.beforeAll(() => {
    process.env.PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';
    process.env.API_URL = process.env.API_URL || 'http://localhost:4001/api/v1';
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('should lock waybill identity (orderCode, pickup, goods, docs, notes) but keep delivery address and trash button enabled', async ({
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
    const firstRow = page.locator('table tbody tr').first();
    const orderCodeInput = firstRow.locator('input[placeholder*="Mã vận đơn"]').or(firstRow.locator('td:nth-child(2) input')).first();
    await expect(orderCodeInput).toBeVisible({ timeout: 15_000 });

    // 4. Type NDA2611-0128 and press Enter to search
    await orderCodeInput.fill('NDA2611-0128');
    await orderCodeInput.press('Enter');
    await page.waitForTimeout(2000);

    // 5. Verify the order row is populated
    await expect(orderCodeInput).toHaveValue('NDA2611-0128');

    // 6. Verify LOCKED columns (Identity of selected waybill):
    // - Mã vận đơn (col 2): LOCKED (disabled)
    await expect(orderCodeInput).toBeDisabled();
    // - Địa chỉ nhận (col 3): LOCKED (disabled)
    const pickupTextarea = firstRow.locator('td:nth-child(3) textarea').first();
    await expect(pickupTextarea).toBeDisabled();
    // - Tên hàng (col 4): LOCKED (disabled)
    const goodsInput = firstRow.locator('td:nth-child(4) input').first();
    await expect(goodsInput).toBeDisabled();
    // - Chứng từ (col 9): LOCKED (disabled)
    const docsInput = firstRow.locator('td:nth-child(9) input').first();
    await expect(docsInput).toBeDisabled();
    // - Ghi chú (col 10): LOCKED (disabled)
    const notesTextarea = firstRow.locator('td:nth-child(10) textarea').first();
    await expect(notesTextarea).toBeDisabled();

    // 7. Verify UNLOCKED columns (Operation actions):
    // - Số kiện (col 5): ENABLED (cho phép xuất 1 phần)
    const qtyInput = firstRow.locator('td:nth-child(5) input').first();
    await expect(qtyInput).toBeEnabled();
    // - Địa chỉ giao (col 8): ENABLED (cho phép sửa hoặc đổi Hub điều chuyển)
    const deliveryTextarea = firstRow.locator('td:nth-child(8) textarea').first();
    await expect(deliveryTextarea).toBeEnabled();
    const changeDestBtn = firstRow.locator('button:has-text("Thay đổi địa chỉ (Điều chuyển)")').first();
    if (await changeDestBtn.isVisible()) {
      await expect(changeDestBtn).toBeEnabled();
    }
    // - Nút Xóa dòng / Thùng rác (col 11): ENABLED
    const trashBtn = firstRow.locator('button[title*="Xóa dòng"]').or(firstRow.locator('button:has(svg.lucide-trash)')).first();
    await expect(trashBtn).toBeEnabled();

    // 8. Add a second row
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

    // Verify second row order code is locked
    await expect(secondOrderInput).toBeDisabled();

    // Verify second row trash button is enabled
    const secondTrashBtn = secondRow.locator('button[title*="Xóa dòng"]').or(secondRow.locator('button:has(svg.lucide-trash)')).first();
    await expect(secondTrashBtn).toBeEnabled();

    // Capture screenshot showing BOTH rows with properly locked identity and enabled trash/delivery address
    const screenshotPath = path.join(EVIDENCE_DIR, 'screenshot_02_outbound_enabled_verified.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);

    // 9. Click Trash on the second row
    await secondTrashBtn.click();
    await page.waitForTimeout(1000);

    // Verify row count is back to 1
    await expect(page.locator('table tbody tr')).toHaveCount(1);
  });
});
