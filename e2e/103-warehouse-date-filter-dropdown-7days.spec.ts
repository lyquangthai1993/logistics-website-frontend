import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM, waitForTableLoaded } from './helpers/auth';

function getExpectedSevenDaysRange() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return {
    fromDate: fmt(from),
    toDate: fmt(now)
  };
}

function getPastDaysDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test.describe('Task #110: Inbound & Outbound Date Filter Dropdown & 7-Day Default (Including Today)', () => {
  test('Inbound & Outbound default to 7 recent days (today - 6 -> today) and collapse date filter into an on-demand dropdown', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const { fromDate: expectedFrom, toDate: expectedTo } = getExpectedSevenDaysRange();

    // 1. Login as Warehouse Manager HCM (Andromeda Hub - HCM)
    await loginAs(page, USER_WAREHOUSE_HCM);

    // 2. Navigate to Inbound and capture initial API call query parameters
    const inboundReqPromise = page.waitForRequest(
      (req) => req.url().includes('/api/v1/warehouse/inbound-trips') && req.method() === 'GET',
      { timeout: 20000 }
    );
    await page.goto('/dashboard/warehouse/inbound');
    const inboundReq = await inboundReqPromise;
    const inboundUrl = new URL(inboundReq.url());
    expect(inboundUrl.searchParams.get('fromDate')).toBe(expectedFrom);
    expect(inboundUrl.searchParams.get('toDate')).toBe(expectedTo);

    await waitForTableLoaded(page);

    // 3. Verify date inputs are hidden by default and only the dropdown trigger is visible
    const dropdownTrigger = page.getByTestId('date-filter-dropdown-trigger');
    await expect(dropdownTrigger).toBeVisible();
    await expect(dropdownTrigger).toContainText('7 ngày gần nhất');

    const fromInput = page.locator('input[aria-label="Từ ngày"]');
    const toInput = page.locator('input[aria-label="Đến ngày"]');
    await expect(fromInput).toBeHidden();
    await expect(toInput).toBeHidden();

    // 4. Click dropdown trigger to open the date filter popover
    await dropdownTrigger.click();
    await expect(fromInput).toBeVisible();
    await expect(toInput).toBeVisible();
    await expect(fromInput).toHaveValue(expectedFrom);
    await expect(toInput).toHaveValue(expectedTo);

    // 5. Select a wider 30-day range to verify custom apply and ensure non-empty table rows
    const thirtyDaysAgo = getPastDaysDate(30);
    await fromInput.fill(thirtyDaysAgo);
    await expect(fromInput).toHaveValue(thirtyDaysAgo);

    const btnApply = page.getByRole('button', { name: 'Áp dụng', exact: true });
    await expect(btnApply).toBeVisible();

    const customInboundReqPromise = page.waitForRequest(
      (req) =>
        req.url().includes('/api/v1/warehouse/inbound-trips') &&
        req.url().includes(`fromDate=${thirtyDaysAgo}`),
      { timeout: 20000 }
    );
    await btnApply.click();
    await customInboundReqPromise;

    // Popover should close automatically after clicking "Áp dụng"
    await expect(fromInput).toBeHidden();
    await waitForTableLoaded(page);

    // Assert real non-empty trip rows in table
    const dataRows = page.locator('table tbody tr').filter({
      hasNotText: /Không có chuyến xe|Đang tải/i
    });
    await expect(dataRows.first()).toBeVisible({ timeout: 20000 });
    const count = await dataRows.count();
    expect(count).toBeGreaterThan(0);

    // 6. Click "Đặt lại" inside dropdown to reset back to 7-day default
    await dropdownTrigger.click();
    await expect(fromInput).toBeVisible();
    const btnReset = page.getByRole('button', { name: 'Đặt lại', exact: true });
    await expect(btnReset).toBeVisible();
    await btnReset.click();
    await expect(fromInput).toBeHidden();
    await expect(dropdownTrigger).toContainText('7 ngày gần nhất');
    await waitForTableLoaded(page);

    // 7. Re-open dropdown on 7-day default to capture verified visual evidence showing dropdown + real table data
    await dropdownTrigger.click();
    await expect(fromInput).toBeVisible();
    await expect(fromInput).toHaveValue(expectedFrom);
    await expect(toInput).toHaveValue(expectedTo);
    await page.waitForTimeout(300);

    const evidenceDir = path.resolve(
      process.cwd(),
      '..',
      'feedbacks',
      'feedback_01_11_task_110_date_filter_dropdown_7days'
    );
    fs.mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({
      path: path.join(evidenceDir, 'screenshot_01_verified.png'),
      fullPage: false
    });

    // 8. Navigate to Outbound and verify identical 7-day default & dropdown behavior
    const outboundReqPromise = page.waitForRequest(
      (req) => req.url().includes('/api/v1/warehouse/outbound-trips') && req.method() === 'GET',
      { timeout: 20000 }
    );
    await page.goto('/dashboard/warehouse/outbound');
    const outboundReq = await outboundReqPromise;
    const outboundUrl = new URL(outboundReq.url());
    expect(outboundUrl.searchParams.get('fromDate')).toBe(expectedFrom);
    expect(outboundUrl.searchParams.get('toDate')).toBe(expectedTo);

    await waitForTableLoaded(page);

    const outDropdownTrigger = page.getByTestId('date-filter-dropdown-trigger');
    await expect(outDropdownTrigger).toBeVisible();
    await expect(outDropdownTrigger).toContainText('7 ngày gần nhất');
    await expect(fromInput).toBeHidden();

    // Open Outbound date filter dropdown and verify default 7-day values
    await outDropdownTrigger.click();
    await expect(fromInput).toBeVisible();
    await expect(toInput).toBeVisible();
    await expect(fromInput).toHaveValue(expectedFrom);
    await expect(toInput).toHaveValue(expectedTo);

    // Apply 30-day range on Outbound and verify non-empty rows
    await fromInput.fill(thirtyDaysAgo);
    await btnApply.click();
    await expect(fromInput).toBeHidden();
    await waitForTableLoaded(page);

    const outDataRows = page.locator('table tbody tr').filter({
      hasNotText: /Không có chuyến xe|Đang tải/i
    });
    await expect(outDataRows.first()).toBeVisible({ timeout: 20000 });
    const outCount = await outDataRows.count();
    expect(outCount).toBeGreaterThan(0);
  });
});
