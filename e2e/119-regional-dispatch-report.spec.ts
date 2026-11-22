import { test, expect } from '@playwright/test';
import type { Response as PlaywrightResponse } from '@playwright/test';
import { loginAs, USER_ADMIN } from './helpers/auth';
import type { RegionalReportApiResponse } from '../src/features/admin-reports/components/super-admin-regional-dispatch-table';

test.use({ viewport: { width: 1920, height: 1080 } });

test('regional charts filter stored and draft orders while keeping both metrics visible', async ({
  page
}) => {
  test.setTimeout(120_000);
  await loginAs(page, USER_ADMIN);
  const regionalResponses: PlaywrightResponse[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/admin/reports/regional-dispatch?') && response.status() === 200) {
      regionalResponses.push(response);
    }
  });
  await page.goto('/dashboard/admin/reports', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Tình hình hàng hóa/ })).toBeVisible();
  await expect(page.getByTestId('regional-weight-chart')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('regional-volume-chart')).toBeVisible();
  const response = regionalResponses.at(-1);
  expect(response).toBeDefined();
  if (!response) throw new Error('No regional report response captured');
  const requestUrl = new URL(response.url());
  const initialUrl = new URL(page.url());
  const fromDate = initialUrl.searchParams.get('fromDate');
  const toDate = initialUrl.searchParams.get('toDate');
  const expectedFromDate =
    fromDate ??
    (() => {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    })();
  const expectedToDate =
    toDate ??
    (() => {
      const today = new Date();
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    })();
  expect(requestUrl.searchParams.get('fromDate')).toBe(expectedFromDate);
  expect(requestUrl.searchParams.get('toDate')).toBe(expectedToDate);
  expect(requestUrl.searchParams.get('hubId')).toBeTruthy();
  const raw = await response.json();
  const report: RegionalReportApiResponse = raw.data ?? raw;
  expect(report.draftRegions).toBeDefined();
  expect(report.dailySeries.length).toBeGreaterThan(0);
  expect(report.onhandOrdersList.length).toBeGreaterThan(0);
  expect(report.regions.na.onhandOrderCodes.length).toBeGreaterThan(0);
  expect(report.regions.na.onhandOrderCodes).toBeDefined();
  expect(
    report.provinceAudit?.orders.some(
      (order) => order.province?.trim().toLocaleLowerCase() === 'ký gửi kho'
    )
  ).not.toBe(true);

  // Regression guard: a waybill dispatched after an earlier daily snapshot
  // must not remain in the current range's draft code list.
  const dispatchedAfterSnapshotCode = 'NMT2611-0081.B';
  const draftCodesInReport = Object.values(report.draftRegions).flatMap(
    (region) => region.orderCodes
  );
  expect(draftCodesInReport).not.toContain(dispatchedAfterSnapshotCode);

  const ordersPage = await page.context().newPage();
  await ordersPage.goto(
    `/dashboard/warehouse/orders?search=${encodeURIComponent(dispatchedAfterSnapshotCode)}`
  );
  await expect(ordersPage.getByText(/ĐÃ XUẤT KHO|Đã xuất kho/).first()).toBeVisible({
    timeout: 15_000
  });
  await ordersPage.close();
  const regions = ['north', 'central', 'south', 'na'] as const;
  for (const key of regions) {
    expect(Array.isArray(report.regions[key].onhandOrderCodes)).toBe(true);
    expect(Array.isArray(report.regions[key].draftOrderCodes)).toBe(true);
    expect(Array.isArray(report.draftRegions[key].orderCodes)).toBe(true);
  }
  const controls = page.getByRole('group', { name: 'Trạng thái đơn hàng', exact: true });
  const weight = page.getByTestId('regional-weight-chart');
  const volume = page.getByTestId('regional-volume-chart');
  const orderCount = page.getByTestId('regional-order-count-chart');
  await expect(orderCount).toBeVisible();
  await expect(orderCount).toContainText('Số mã đơn theo miền');
  const orderSearchLinks = page.locator('a[href^="/dashboard/warehouse/orders?search="]');
  if ((await orderSearchLinks.count()) > 0) {
    await expect(orderSearchLinks.first()).toHaveAttribute('target', '_blank');
  }
  const cases = ['Lưu kho', 'Đơn nháp'] as const;
  await expect(controls.getByRole('button', { name: cases[0], exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  for (const label of cases) {
    await controls.getByRole('button', { name: label, exact: true }).click();
    await expect(weight).toBeVisible();
    await expect(volume).toBeVisible();
    await expect(weight).toContainText('Tổng:');
    await expect(volume).toContainText('Tổng:');
    await expect(controls.getByRole('button', { name: label, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  }
  await expect(page.getByRole('columnheader', { name: /Khu V/ })).toHaveCount(0);
  await expect(page.getByText('TỔNG CỘNG TOÀN QUỐC', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('parallel-slot-monthly-trends')).toHaveCount(0);
  await expect(page.getByTestId('parallel-slot-daily-stats')).toBeVisible();
  const regionColors = await weight
    .locator('.rounded-r-md')
    .evaluateAll((bars) => bars.slice(0, 3).map((bar) => getComputedStyle(bar).backgroundColor));
  expect(new Set(regionColors).size).toBe(3);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document
      .querySelectorAll('main, [data-slot="scroll-area-viewport"]')
      .forEach((element) => element.scrollTo(0, 0));
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  });
  await page.screenshot({
    path: 'e2e/screenshots/screenshot_regional_dispatch_range_verified.png',
    fullPage: true
  });

  await page.getByTestId('report-date-range-picker').click();
  await expect(page.getByText('Chọn khoảng ngày báo cáo', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  const quickRangeResponse = page.waitForResponse((nextResponse) => {
    const url = new URL(nextResponse.url());
    return (
      nextResponse.status() === 200 &&
      url.pathname.endsWith('/admin/reports/regional-dispatch') &&
      url.searchParams.has('fromDate')
    );
  });
  await page.getByTestId('report-quick-range-select').click();
  await page.getByRole('option', { name: 'Tháng trước', exact: true }).click();
  await page.getByTestId('report-apply-date-range-btn').click();
  const quickRangeResponseResult = await quickRangeResponse;
  expect(quickRangeResponseResult.status()).toBe(200);
  const updatedUrl = new URL(page.url());
  expect(updatedUrl.searchParams.get('fromDate')).not.toBe(expectedFromDate);
  expect(updatedUrl.searchParams.get('toDate')).not.toBe(expectedToDate);
});

test('Lưu kho classifies Gửi kho/Lưu kho orders by the holding Hub region', async ({
  page
}) => {
  test.setTimeout(120_000);
  await loginAs(page, USER_ADMIN);

  const reportResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.status() === 200 &&
      url.pathname.endsWith('/admin/reports/regional-dispatch') &&
      url.searchParams.get('fromDate') === '2026-11-01' &&
      url.searchParams.get('toDate') === '2026-11-30'
    );
  });
  await page.goto('/dashboard/admin/reports?fromDate=2026-11-01&toDate=2026-11-30', {
    waitUntil: 'domcontentloaded'
  });
  const response = await reportResponse;
  const raw = await response.json();
  const report: RegionalReportApiResponse = raw.data ?? raw;
  const storageOrders = report.onhandOrdersList.filter((order) =>
    /^(gửi kho|lưu kho)$/i.test(order.province.trim()),
  );
  expect(storageOrders.length).toBeGreaterThan(0);
  expect(storageOrders.every((order) =>
    ['MIỀN BẮC', 'MIỀN TRUNG', 'MIỀN NAM'].includes(order.region),
  )).toBe(true);

  const controls = page.getByRole('group', { name: 'Trạng thái đơn hàng', exact: true });
  const weight = page.getByTestId('regional-weight-chart');
  const volume = page.getByTestId('regional-volume-chart');
  const orderCount = page.getByTestId('regional-order-count-chart');
  await expect(weight).toBeVisible({ timeout: 45_000 });
  await controls.getByRole('button', { name: 'Lưu kho', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Lưu kho', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(weight.getByText('GỬI KHO', { exact: true })).toHaveCount(0);
  await expect(weight.getByText('LƯU KHO', { exact: true })).toHaveCount(0);
  await expect(weight.getByText('MIỀN BẮC', { exact: true })).toBeVisible();
  await expect(weight.getByText('MIỀN TRUNG', { exact: true })).toBeVisible();
  await expect(weight.getByText('MIỀN NAM', { exact: true })).toBeVisible();
  expect(await weight.locator('.rounded-r-md').count()).toBe(4);
});
