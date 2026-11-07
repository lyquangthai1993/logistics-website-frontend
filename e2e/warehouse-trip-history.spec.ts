import { test, expect } from '@playwright/test';
import { loginAs, USER_WAREHOUSE_HCM, collectConsoleLogs } from './helpers/auth';

test.describe('Warehouse Trip History & Audit Timeline (Task 113)', () => {
  test('should open Trip History modal from Inbound and Outbound trip tables (Vị trí 1) and display timeline & blockers', async ({
    page
  }) => {
    const { getLogs } = collectConsoleLogs(page);
    await loginAs(page, USER_WAREHOUSE_HCM);

    // 1. Verify Inbound Trip History button at Vị trí 1 (SD1043 & SD1055)
    await page.goto('/dashboard/warehouse/inbound', { waitUntil: 'domcontentloaded' });
    const sd1043HistoryBtn = page.getByTestId('btn-trip-history-SD1043');
    await expect(sd1043HistoryBtn).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: 'test-results/screenshot_inbound_table_cta_verified.png',
      fullPage: false
    });

    await sd1043HistoryBtn.click();

    const modal = page.getByTestId('trip-history-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal).toContainText('Lịch sử tạo & chỉnh sửa chuyến xe');
    await expect(modal).toContainText('SD1043');
    await expect(modal).toContainText('Quảng Đại Hy');
    await expect(modal).toContainText('CHƯA CÓ TT');
    await expect(modal).toContainText('43H30703');
    await expect(modal).toContainText('152 kiện');
    await expect(modal).toContainText('139 kiện');

    await page.screenshot({
      path: 'test-results/screenshot_trip_history_SD1043_verified.png',
      fullPage: false
    });

    // Close modal
    await modal.getByRole('button', { name: 'Đóng' }).click();
    await expect(modal).toBeHidden();

    // Also verify SD1055
    const sd1055HistoryBtn = page.getByTestId('btn-trip-history-SD1055');
    if (await sd1055HistoryBtn.isVisible()) {
      await sd1055HistoryBtn.click();
      await expect(modal).toBeVisible({ timeout: 10000 });
      await expect(modal).toContainText('SD1055');
      await expect(modal).toContainText('Nguyễn Kim Như');
      await expect(modal).toContainText('43H20438');
      await page.screenshot({
        path: 'test-results/screenshot_trip_history_SD1055_verified.png',
        fullPage: false
      });
      await modal.getByRole('button', { name: 'Đóng' }).click();
      await expect(modal).toBeHidden();
    }

    // 2. Verify Outbound Trip History button at Vị trí 1 (SD1087) without any Blocker/Reason banner
    await page.goto('/dashboard/warehouse/outbound', { waitUntil: 'domcontentloaded' });
    const sd1087HistoryBtn = page.getByTestId('btn-trip-history-SD1087');
    await expect(sd1087HistoryBtn).toBeVisible({ timeout: 15000 });
    await sd1087HistoryBtn.click();

    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal).toContainText('SD1087');
    await expect(modal).toContainText('PHẠM PHÚ THÀNH');

    const blockerAlert = page.getByTestId('trip-history-blockers-alert');
    await expect(blockerAlert).toHaveCount(0);
    await expect(modal).not.toContainText('Nguyên nhân chuyến');

    await page.screenshot({
      path: 'test-results/screenshot_trip_history_SD1087_verified.png',
      fullPage: false
    });

    const logs = getLogs();
    const pageErrors = logs.filter((l) => l.type === 'pageerror');
    expect(pageErrors).toHaveLength(0);
  });
});
