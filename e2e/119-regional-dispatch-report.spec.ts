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
  expect(requestUrl.searchParams.get('mode')).toBeNull();
  expect(requestUrl.searchParams.get('hubId')).toBe('ALL');
  const raw = await response.json();
  const report: RegionalReportApiResponse = raw.data ?? raw;
  expect(report.draftRegions).toBeDefined();
  expect(report.dailySeries.length).toBeGreaterThan(0);
  expect(report.onhandOrdersList.length).toBeGreaterThan(0);
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
  expect(Number(report.regions.south.incomingWeightKg)).toBeGreaterThan(0);
  const controls = page.getByRole('group', { name: 'Trạng thái đơn hàng', exact: true });
  await expect(controls.getByRole('button', { name: 'Đã xuất kho', exact: true })).toHaveCount(0);
  const weight = page.getByTestId('regional-weight-chart');
  const volume = page.getByTestId('regional-volume-chart');
  const weightTotal = weight.getByTestId('regional-weight-total');
  const volumeTotal = volume.getByTestId('regional-volume-total');
  // Báo cáo cũ "Số mã đơn theo miền" đã được loại bỏ khỏi màn hình.
  await expect(page.getByTestId('regional-order-count-chart')).toHaveCount(0);
  const cases = ['Lưu kho', 'Nháp'] as const;
  const totalsByStatus = new Map<string, { weight: string; volume: string }>();
  for (const label of cases) {
    await controls.getByRole('button', { name: label, exact: true }).dispatchEvent('click');
    await expect(weight).toBeVisible();
    await expect(volume).toBeVisible();
    await expect(weight).toContainText('Tổng:');
    await expect(volume).toContainText('Tổng:');
    await expect(controls.getByRole('button', { name: label, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    totalsByStatus.set(label, {
      weight: await weightTotal.innerText(),
      volume: await volumeTotal.innerText()
    });
  }
  await controls.getByRole('button', { name: 'Tất cả', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Tất cả', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  totalsByStatus.set('Tất cả', {
    weight: await weightTotal.innerText(),
    volume: await volumeTotal.innerText()
  });
  expect(new Set([...totalsByStatus.values()].map((totals) => totals.weight)).size).toBe(3);
  expect(new Set([...totalsByStatus.values()].map((totals) => totals.volume)).size).toBe(3);
  await expect(weight.getByText('Lưu kho', { exact: true })).toBeVisible();
  await expect(weight.getByText('Nháp', { exact: true })).toBeVisible();
  await expect(volume.getByText('Lưu kho', { exact: true })).toBeVisible();
  await expect(volume.getByText('Nháp', { exact: true })).toBeVisible();
  expect(await weight.locator('.recharts-bar-rectangle').count()).toBeGreaterThanOrEqual(4);
  expect(await volume.locator('.recharts-bar-rectangle').count()).toBeGreaterThanOrEqual(4);
  await weight.locator('.recharts-bar-rectangle').first().hover();
  const weightTooltip = weight.locator('.recharts-tooltip-wrapper');
  await expect(weightTooltip).toBeVisible();
  await expect(weightTooltip).toContainText('Lưu kho');
  await expect(weightTooltip).toContainText('Nháp');
  const bars = weight.locator('.recharts-bar-rectangle');
  let visibleBarsChecked = 0;
  for (let index = 0; index < (await bars.count()); index += 1) {
    const bar = bars.nth(index);
    const box = await bar.boundingBox();
    if (!box || box.width <= 1 || box.height <= 1) continue;
    await bar.hover();
    await expect(weightTooltip).toBeVisible();
    await expect(weightTooltip).not.toContainText('Đã xuất kho');
    visibleBarsChecked += 1;
  }
  expect(visibleBarsChecked).toBeGreaterThan(0);
  const volumeTooltip = volume.locator('.recharts-tooltip-wrapper');
  const volumeBars = volume.locator('.recharts-bar-rectangle');
  let visibleVolumeBarsChecked = 0;
  for (let index = 0; index < (await volumeBars.count()); index += 1) {
    const bar = volumeBars.nth(index);
    const box = await bar.boundingBox();
    if (!box || box.width <= 1 || box.height <= 1) continue;
    await bar.hover();
    await expect(volumeTooltip).toBeVisible();
    await expect(volumeTooltip).not.toContainText('Đã xuất kho');
    visibleVolumeBarsChecked += 1;
  }
  expect(visibleVolumeBarsChecked).toBeGreaterThan(0);
  await expect(page.getByRole('columnheader', { name: /Khu V/ })).toHaveCount(0);
  await expect(page.getByText('TỔNG CỘNG TOÀN QUỐC', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('parallel-slot-monthly-trends')).toHaveCount(0);
  await expect(page.getByTestId('parallel-slot-daily-stats')).toBeVisible();
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document
      .querySelectorAll('main, [data-slot="scroll-area-viewport"]')
      .forEach((element) => element.scrollTo(0, 0));
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  });
  await page.screenshot({
    path: 'e2e/screenshots/screenshot_regional_dispatch_tab_filters_verified.png',
    fullPage: true
  });
});

test('Lưu kho classifies Gửi kho/Lưu kho orders by the holding Hub region', async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, USER_ADMIN);

  const reportResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.status() === 200 &&
      url.pathname.endsWith('/admin/reports/regional-dispatch') &&
      url.searchParams.get('mode') === null
    );
  });
  await page.goto('/dashboard/admin/reports', {
    waitUntil: 'domcontentloaded'
  });
  const response = await reportResponse;
  const raw = await response.json();
  const report: RegionalReportApiResponse = raw.data ?? raw;
  const storageOrders = report.onhandOrdersList.filter((order) =>
    /^(gửi kho|lưu kho)$/i.test(order.province.trim())
  );
  expect(storageOrders.length).toBeGreaterThan(0);
  expect(
    storageOrders.every((order) => ['MIỀN BẮC', 'MIỀN TRUNG', 'MIỀN NAM'].includes(order.region))
  ).toBe(true);

  const controls = page.getByRole('group', { name: 'Trạng thái đơn hàng', exact: true });
  const weight = page.getByTestId('regional-weight-chart');
  await expect(weight).toBeVisible({ timeout: 45_000 });
  await controls.getByRole('button', { name: 'Lưu kho', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Lưu kho', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(weight.getByText('GỬI KHO', { exact: true })).toHaveCount(0);
  await expect(weight.getByText('LƯU KHO', { exact: true })).toHaveCount(0);
  await expect(weight.getByText('MIỀN BẮC', { exact: true })).toBeVisible();
  await expect(weight.getByText('MIỀN TRUNG', { exact: true })).toBeVisible();
  await expect(weight.getByText('MIỀN NAM', { exact: true })).toBeVisible();
  expect(await weight.locator('.recharts-bar-rectangle').count()).toBeGreaterThan(0);
});
