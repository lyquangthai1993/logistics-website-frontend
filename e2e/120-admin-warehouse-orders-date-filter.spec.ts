import { test, expect } from '@playwright/test';
import { loginAs, USER_ADMIN } from './helpers/auth';

test('admin warehouse orders applies the current-month date filter', async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, USER_ADMIN);
  await page.goto('/dashboard/warehouse/orders');
  await expect(page.getByTestId('admin-orders-date-filter')).toBeVisible({ timeout: 15_000 });

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
  const expectedFromDate = `${year}-${month}-01`;
  const expectedToDate = `${year}-${month}-${lastDay}`;

  const ordersResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.status() === 200 &&
      url.pathname.endsWith('/warehouse/orders') &&
      url.searchParams.get('fromDate') === expectedFromDate &&
      url.searchParams.get('toDate') === expectedToDate
    );
  });

  await page
    .getByTestId('admin-orders-date-filter')
    .getByRole('combobox', { name: 'Lọc nhanh theo thời gian' })
    .selectOption('THIS_MONTH');
  await ordersResponse;

  const dateFilter = page.getByTestId('admin-orders-date-filter');
  await expect(dateFilter.locator('input[aria-label="Từ ngày"]')).toHaveValue(expectedFromDate);
  await expect(dateFilter.locator('input[aria-label="Đến ngày"]')).toHaveValue(expectedToDate);
  await expect(dateFilter.getByRole('combobox', { name: 'Lọc nhanh theo thời gian' })).toHaveValue(
    'THIS_MONTH'
  );
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.searchParams.get('fromDate')}|${url.searchParams.get('toDate')}`;
    })
    .toBe(`${expectedFromDate}|${expectedToDate}`);
  await expect(page.getByTestId('admin-orders-metrics-boxes')).toBeVisible();
  await expect(page.locator('table')).toBeVisible();
  await page.screenshot({
    path: 'e2e/screenshots/screenshot_admin_orders_this_month_verified.png',
    fullPage: false
  });
});
