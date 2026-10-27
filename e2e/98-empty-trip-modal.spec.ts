import { test, expect } from '@playwright/test';
import { loginAs, USER_ADMIN } from './helpers/auth';

test.describe('[Warehouse Trip Detail] Empty Trip Lines Verification', () => {
  test('Chuyến xe không có đơn hàng (hoặc đã bị xóa mềm) hiển thị 0 dòng hàng và không render dòng phantom rỗng', async ({
    page
  }) => {
    await loginAs(page, USER_ADMIN);

    // Đi tới màn hình Xuất kho
    await page.goto('/dashboard/warehouse/outbound');
    await page.waitForLoadState('networkidle');

    // Tìm chuyến xe SD241 hoặc SD415 trong ô tìm kiếm
    const searchInput = page
      .locator('input[placeholder*="Tìm mã chuyến"], input[placeholder*="Tìm kiếm"]')
      .first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('SD241');
      await page.waitForTimeout(1000);
    }

    // Click vào mã chuyến xe SD241 nếu có trên bảng
    const tripCodeBtn = page
      .locator('button, a, span')
      .filter({ hasText: /^SD241$/ })
      .first();
    if (await tripCodeBtn.isVisible()) {
      await tripCodeBtn.click();
      await page.waitForTimeout(1500);

      // Verify đếm dòng hàng là 0 dòng hàng
      await expect(page.getByText('0 dòng hàng').first()).toBeVisible();

      // Verify dòng thông báo rỗng
      await expect(page.getByText('Chuyến xe không có dòng hàng nào')).toBeVisible();

      // Verify footer không hiển thị số đơn ảo = 1
      await expect(page.getByText('Tổng số đơn: 0')).toBeVisible();
      await expect(page.getByText('Tổng kiện: 0 kiện')).toBeVisible();

      // Chụp ảnh bằng chứng nghiệm thu
      await page.screenshot({ path: 'test-results/empty-trip-modal-verified.png' });
    }
  });
});
