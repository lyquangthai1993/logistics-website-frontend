import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './helpers/auth';

test.describe('Waybill Detail Modal - Draft Order & Status Verification', () => {
  test('NMT2611-0036 draft order should have clean header, no redundant footer status, and no fake inbound transaction', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // 1. Login as warehouse_hcm (Andromeda Hub) or admin
    const userHcm = TEST_USERS.find((u) => u.username === 'warehouse_hcm') || TEST_USERS[0];
    await loginAs(page, userHcm);

    // 2. Navigate to warehouse orders page
    await page.goto('/dashboard/warehouse/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // 3. Search for NMT2611-0036
    const searchInput = page.locator('input[placeholder*="Tìm mã vận đơn"], input[placeholder*="Tìm kiếm"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('NMT2611-0036');
      await page.waitForTimeout(1000);
    }

    // 4. Click row for NMT2611-0036 to open modal
    const orderCell = page.locator('text=NMT2611-0036').first();
    await expect(orderCell).toBeVisible({ timeout: 15_000 });
    await orderCell.click();

    // 5. Verify modal opened
    const modalHeader = page.locator('h2:has-text("Chi tiết đơn hàng tiếp nhận kho")');
    await expect(modalHeader).toBeVisible({ timeout: 10_000 });

    // 6. Header should have status badge "ĐƠN NHÁP"
    const headerStatusBadge = modalHeader.locator('xpath=ancestor::div[contains(@class,"bg-[#0F3D62]")]').locator('text=ĐƠN NHÁP');
    await expect(headerStatusBadge).toBeVisible();

    // 7. Footer: should NOT have "Trạng thái vận đơn: ĐƠN NHÁP"
    const redundantFooterStatus = page.locator('text=Trạng thái vận đơn:');
    await expect(redundantFooterStatus).toHaveCount(0);

    // 8. Action buttons in footer should be visible
    const printButton = page.locator('button:has-text("In tem Pallet A4")');
    const closeButton = page.locator('button:has-text("Đóng")').last();
    await expect(printButton).toBeVisible();
    await expect(closeButton).toBeVisible();

    // 9. Timeline: should NOT contain fake "Tiếp nhận nhập kho ban đầu"
    const fakeInboundStep = page.locator('span:has-text("Tiếp nhận nhập kho ban đầu")');
    await expect(fakeInboundStep).toHaveCount(0);

    // 10. Timeline: should show clear draft order status
    const draftStatusNotice = page.locator('text=Đơn hàng đang ở trạng thái Đơn nháp · Chưa xác nhận nhập kho');
    await expect(draftStatusNotice).toBeVisible();

    // 11. Should NOT show "Đang lưu kho an toàn tại ... - Tồn khả dụng sẵn sàng xuất 0 kiện"
    const fakeSafeStorageNotice = page.locator('text=Đang lưu kho an toàn tại');
    await expect(fakeSafeStorageNotice).toHaveCount(0);

    // 12. Capture screenshot as visual evidence
    await page.screenshot({ path: 'e2e/screenshots/nmt2611_0036_draft_verified.png' });
  });
});
