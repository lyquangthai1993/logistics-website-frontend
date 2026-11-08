import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './helpers/auth';

test.describe('Tooltip Người thao tác (người tạo) trên cột Ngày (Click-to-open)', () => {
  test('Outbound & Inbound: click vào Ngày hiển thị popover người thao tác/tạo', async ({
    page
  }) => {
    test.setTimeout(60000);

    const userHcm = TEST_USERS.find((u) => u.username === 'warehouse_hcm')!;
    await loginAs(page, userHcm);

    // 1. Kiểm tra Outbound
    await page.goto('/dashboard/warehouse/outbound', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    const outboundDateTriggers = page.locator('[data-testid="trip-date-tooltip-trigger"]:visible');
    await expect(outboundDateTriggers.first()).toBeVisible({ timeout: 10000 });

    const outboundFirstTitle = await outboundDateTriggers.first().getAttribute('title');
    expect(outboundFirstTitle).toBeTruthy();
    expect(outboundFirstTitle).toContain('Người');

    // Click để kiểm tra popover mở ra
    await outboundDateTriggers.first().click();
    await expect(page.getByTestId('trip-date-tooltip-content')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/outbound-date-tooltip.png' });

    // 2. Kiểm tra Inbound
    await page.goto('/dashboard/warehouse/inbound', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    const inboundDateTriggers = page.locator('[data-testid="trip-date-tooltip-trigger"]:visible');
    await expect(inboundDateTriggers.first()).toBeVisible({ timeout: 10000 });

    const inboundFirstTitle = await inboundDateTriggers.first().getAttribute('title');
    expect(inboundFirstTitle).toBeTruthy();
    expect(inboundFirstTitle).toContain('Người');

    // Click để kiểm tra popover mở ra
    await inboundDateTriggers.first().click();
    await expect(page.getByTestId('trip-date-tooltip-content')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/inbound-date-tooltip.png' });
  });

  test('Mobile: Click vào Ngày kích hoạt Popover và không mở modal cha (stopPropagation)', async ({
    page
  }) => {
    test.setTimeout(60000);
    // Set mobile viewport (iPhone 12 / Galaxy)
    await page.setViewportSize({ width: 390, height: 844 });

    const userHcm = TEST_USERS.find((u) => u.username === 'warehouse_hcm')!;
    await loginAs(page, userHcm);

    await page.goto('/dashboard/warehouse/inbound', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Trên mobile, tìm trigger ngày trong mobile card (sử dụng :visible để bỏ qua phần tử của desktop table đang bị ẩn)
    const dateTrigger = page.locator('[data-testid="trip-date-tooltip-trigger"]:visible').first();
    await expect(dateTrigger).toBeVisible({ timeout: 15000 });

    // Click vào date trigger
    await dateTrigger.click();

    // Kiểm tra Popover mở ra
    const popoverContent = page.getByTestId('trip-date-tooltip-content');
    await expect(popoverContent).toBeVisible({ timeout: 5000 });
    const popoverText = await popoverContent.textContent();
    expect(popoverText).toContain('Người');

    // Kiểm tra Modal Chi tiết chuyến xe KHÔNG bị mở nhầm
    const modalDialog = page.locator('[role="dialog"]').filter({ hasText: 'Bảng kê chi tiết' });
    const isModalOpened = await modalDialog.isVisible().catch(() => false);
    expect(isModalOpened).toBeFalsy();

    await page.screenshot({ path: 'test-results/mobile-date-popover.png' });
  });
});
