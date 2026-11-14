import { test, expect } from '@playwright/test';
import { loginAs, USER_ADMIN } from './helpers/auth';
import { formatNumber } from '../src/lib/utils';
import type { RegionalReportApiResponse } from '../src/features/admin-reports/components/super-admin-regional-dispatch-table';

test.use({ viewport: { width: 1920, height: 1080 } });

test('regional charts filter stored and draft orders while keeping both metrics visible', async ({
  page
}) => {
  test.setTimeout(120_000);
  await loginAs(page, USER_ADMIN);
  const regionalResponses: Response[] = [];
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
  const fromDate = await page.getByTestId('report-from-date-input').inputValue();
  const toDate = await page.getByTestId('report-to-date-input').inputValue();
  expect(requestUrl.searchParams.get('fromDate')).toBe(fromDate);
  expect(requestUrl.searchParams.get('toDate')).toBe(toDate);
  expect(requestUrl.searchParams.get('hubId')).toBeTruthy();
  const raw = await response.json();
  const report: RegionalReportApiResponse = raw.data ?? raw;
  expect(report.draftRegions).toBeDefined();
  expect(report.dailySeries.length).toBeGreaterThan(0);
  expect(report.onhandOrdersList.length).toBeGreaterThan(0);
  const regions = ['north', 'central', 'south', 'na'] as const;
  const storedWeight = regions.reduce((sum, key) => sum + report.regions[key].onhandWeightKg, 0);
  const storedVolume = regions.reduce((sum, key) => sum + report.regions[key].onhandVolumeCbm, 0);
  const draftWeight = regions.reduce((sum, key) => sum + report.draftRegions[key].weightKg, 0);
  const draftVolume = regions.reduce((sum, key) => sum + report.draftRegions[key].volumeCbm, 0);
  for (const key of regions) {
    expect(Array.isArray(report.regions[key].onhandOrderCodes)).toBe(true);
    expect(Array.isArray(report.regions[key].draftOrderCodes)).toBe(true);
    expect(Array.isArray(report.draftRegions[key].orderCodes)).toBe(true);
  }
  const controls = page.getByRole('group', { name: 'Trạng thái đơn hàng', exact: true });
  const weight = page.getByTestId('regional-weight-chart');
  const volume = page.getByTestId('regional-volume-chart');
  const cases = [
    ['Tổng hợp', storedWeight + draftWeight, storedVolume + draftVolume],
    ['Lưu kho', storedWeight, storedVolume],
    ['Đơn nháp', draftWeight, draftVolume],
    ['Tổng hợp', storedWeight + draftWeight, storedVolume + draftVolume]
  ] as const;
  await expect(controls.getByRole('button', { name: cases[0][0], exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  for (const [label, kg, cbm] of cases) {
    await controls.getByRole('button', { name: label, exact: true }).click();
    await expect(weight).toBeVisible();
    await expect(volume).toBeVisible();
    await expect(weight).toContainText(`Tổng: ${formatNumber(kg)} kg`);
    await expect(volume).toContainText(`Tổng: ${formatNumber(cbm)} m³`);
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

  const changedFromDate = '2026-11-03';
  const rangeResponsePromise = page.waitForResponse((nextResponse) => {
    const url = new URL(nextResponse.url());
    return (
      nextResponse.status() === 200 &&
      url.pathname.endsWith('/admin/reports/regional-dispatch') &&
      url.searchParams.get('fromDate') === changedFromDate
    );
  });
  await page.getByTestId('report-from-date-input').fill(changedFromDate);
  await expect(page.getByTestId('report-apply-date-range-btn')).toBeVisible();
  await page.getByTestId('report-apply-date-range-btn').click();
  const rangeResponse = await rangeResponsePromise;
  const updatedRaw = await rangeResponse.json();
  const updatedReport: RegionalReportApiResponse = updatedRaw.data ?? updatedRaw;
  expect(updatedReport.range.fromDate).toBe(changedFromDate);
  expect(updatedReport.range.toDate).toBe(toDate);
});
