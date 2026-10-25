import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './helpers/auth';

test.describe('Tooltip Người thao tác (người tạo) trên cột Ngày', () => {
  test('Outbound & Inbound: hover vào Ngày hiển thị tooltip người thao tác/tạo', async ({
    page
  }) => {
    test.setTimeout(60000);

    const userHcm = TEST_USERS.find((u) => u.username === 'warehouse_hcm')!;
    await loginAs(page, userHcm);

    // 1. Kiểm tra Outbound
    await page.goto('/dashboard/warehouse/outbound', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    const outboundDateTriggers = page.locator('[data-testid="trip-date-tooltip-trigger"]');
    await expect(outboundDateTriggers.first()).toBeVisible({ timeout: 10000 });

    const outboundFirstTitle = await outboundDateTriggers.first().getAttribute('title');
    console.log('Outbound First Date Title:', outboundFirstTitle);
    expect(outboundFirstTitle).toBeTruthy();
    expect(outboundFirstTitle).toContain('Người');

    // Hover để kiểm tra tooltip popover
    await outboundDateTriggers.first().hover();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/outbound-date-tooltip.png' });

    // 2. Kiểm tra Inbound
    await page.goto('/dashboard/warehouse/inbound', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    const inboundDateTriggers = page.locator('[data-testid="trip-date-tooltip-trigger"]');
    await expect(inboundDateTriggers.first()).toBeVisible({ timeout: 10000 });

    const inboundFirstTitle = await inboundDateTriggers.first().getAttribute('title');
    console.log('Inbound First Date Title:', inboundFirstTitle);
    expect(inboundFirstTitle).toBeTruthy();
    expect(inboundFirstTitle).toContain('Người');

    // Hover để kiểm tra tooltip popover
    await inboundDateTriggers.first().hover();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/inbound-date-tooltip.png' });
  });
});
