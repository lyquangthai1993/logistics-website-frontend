import { test, expect } from '@playwright/test';
import { loginAs, USER_ADMIN } from './helpers/auth';
import type { RegionalReportApiResponse } from '../src/features/admin-reports/components/super-admin-regional-dispatch-table';

test.use({ viewport: { width: 1920, height: 1080 } });

const REGION_KEYS = ['north', 'central', 'south', 'storage', 'na'] as const;

test('Tình hình hàng hóa uses its own level 1 hub filter', async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, USER_ADMIN);

  const initialResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.status() === 200
      && url.pathname.endsWith('/admin/reports/regional-dispatch')
      && url.searchParams.get('hubId') === 'ALL';
  });
  await page.goto('/dashboard/admin/reports', { waitUntil: 'domcontentloaded' });
  await initialResponse;
  await expect(page.getByRole('heading', { name: 'Tình hình hàng hóa' })).toBeVisible();

  const refreshedResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.status() === 200
      && url.pathname.endsWith('/admin/reports/regional-dispatch')
      && url.searchParams.get('hubId') === 'ALL';
  });
  const syncResponse = page.waitForResponse((response) =>
    response.url().includes('/admin/reports/regional-dispatch/sync')
    && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Đồng bộ số liệu' }).click();
  expect((await syncResponse).status()).toBe(200);
  const response = await refreshedResponse;
  const requestUrl = new URL(response.url());
  expect(requestUrl.searchParams.get('fromDate')).toBeNull();
  expect(requestUrl.searchParams.get('toDate')).toBeNull();
  const raw = await response.json();
  const report: RegionalReportApiResponse = raw.data ?? raw;

  expect(report.cronInfo.cronTime).toBe('06:00');
  expect(report.hubReports.length).toBeGreaterThan(0);
  expect(report.hubReports.map((item) => item.hub.name)).toEqual(expect.arrayContaining([
    'Andromeda Hub - HCM',
    'Magellan Hub - Đà Nẵng',
    'Polaris Hub - Hưng Yên',
  ]));
  expect(new Set(report.hubReports.map((item) => item.hub.id)).size).toBe(report.hubReports.length);
  expect(report.hubReports.every((item) => item.hub.level === 1)).toBe(true);
  for (const hubReport of report.hubReports) {
    expect(hubReport.hasSnapshot).toBe(true);
    expect(hubReport.reportDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(hubReport.calculatedAt).toBeTruthy();
    expect(hubReport.regions).not.toBeNull();
    expect(Object.keys(hubReport.regions ?? {}).sort()).toEqual([...REGION_KEYS].sort());
    for (const key of REGION_KEYS) {
      const region = hubReport.regions?.[key];
      expect(region?.onhandOrderCodes).toBeInstanceOf(Array);
      expect(region?.draftOrderCodes).toBeInstanceOf(Array);
    }
    const panel = page.getByTestId(`regional-hub-${hubReport.hub.id}`);
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId('regional-calculated-at')).not.toContainText('Chưa có dữ liệu');
    await expect(panel.locator('[data-testid^="regional-region-"]')).toHaveCount(0);
  }

  const allCodes = report.hubReports.flatMap((hubReport) =>
    REGION_KEYS.flatMap((key) => [
      ...(hubReport.regions?.[key].onhandOrderCodes ?? []),
      ...(hubReport.regions?.[key].draftOrderCodes ?? []),
    ])
  );
  expect(allCodes.length).toBeGreaterThan(0);

  const controls = page.getByRole('group', { name: 'Trạng thái đơn hàng' });
  await controls.getByRole('button', { name: 'Hàng tại kho', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Hàng tại kho', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const hcmSnapshot = report.hubReports.find((item) => item.hub.name.includes('HCM'));
  expect(hcmSnapshot?.regions).toBeTruthy();
  if (!hcmSnapshot?.regions) throw new Error('Missing HCM regional snapshot');
  const hcmPanel = page.getByTestId(`regional-hub-${hcmSnapshot.hub.id}`);
  const hcmPackages = REGION_KEYS.reduce(
    (sum, key) => sum + hcmSnapshot.regions![key].onhandPackageCount, 0
  );
  await expect(hcmPanel.getByTestId('regional-onhand-count')).toContainText(`${hcmPackages} kiện`);
  const storage = hcmSnapshot.regions.storage;
  await expect(hcmPanel.locator('[data-testid="regional-region-storage"]')).toHaveCount(0);
  if (storage.onhandPackageCount > 0 && storage.onhandWeightKg === 0 && storage.onhandVolumeCbm === 0) {
    await expect(hcmPanel.getByTestId('regional-unmeasured-storage'))
      .toHaveText(`LƯU KHO: ${storage.onhandPackageCount} kiện chưa có kg/m³`);
  }
  await expect(page.getByText('Hàng tại kho được chia theo tỉnh giao. Dòng LƯU KHO gồm đơn ghi “Lưu kho” ở tỉnh giao.')).toBeVisible();
  await expect(page.getByTestId('regional-weight-chart').first()).toBeVisible();
  await controls.getByRole('button', { name: 'Dự kiến nhập kho', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Dự kiến nhập kho', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('regional-volume-chart').first()).toBeVisible();
  await controls.getByRole('button', { name: 'Tất cả', exact: true }).click();

  const selectedHub = report.hubReports.find((item) => item.hub.name.includes('Đà Nẵng'));
  expect(selectedHub).toBeDefined();
  if (!selectedHub) throw new Error('Missing level 1 Da Nang hub');
  const selectedResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.status() === 200
      && url.pathname.endsWith('/admin/reports/regional-dispatch')
      && url.searchParams.get('hubId') === String(selectedHub.hub.id);
  });
  await page.getByTestId('cargo-hub-filter-select').click();
  await page.getByTestId(`cargo-hub-filter-item-${selectedHub.hub.id}`).click();
  const selectedRaw = await (await selectedResponse).json();
  const selectedReport: RegionalReportApiResponse = selectedRaw.data ?? selectedRaw;
  expect(selectedReport.hubReports.map((item) => item.hub.id)).toEqual([selectedHub.hub.id]);
  await expect(page.locator('[data-testid^="regional-hub-"]')).toHaveCount(1);
  await expect(page.getByTestId(`regional-hub-${selectedHub.hub.id}`)).toBeVisible();
  await expect(page.getByTestId('warehouse-hub-filter-select')).toContainText('Tất cả kho');

  const hcmHub = report.hubReports.find((item) => item.hub.name.includes('HCM'));
  expect(hcmHub).toBeDefined();
  if (!hcmHub) throw new Error('Missing level 1 HCM hub');
  await page.getByTestId('warehouse-hub-filter-select').click();
  await page.getByTestId(`warehouse-hub-filter-item-${hcmHub.hub.id}`).click();
  await expect(page.getByTestId('warehouse-hub-filter-select')).toContainText(hcmHub.hub.name);
  await expect(page.getByTestId('cargo-hub-filter-select')).toContainText(selectedHub.hub.name);
  await expect(page.locator('[data-testid^="regional-hub-"]')).toHaveCount(1);
  await expect(page.getByTestId(`regional-hub-${selectedHub.hub.id}`)).toBeVisible();

  const scopedSyncResponse = page.waitForResponse((response) =>
    response.url().includes('/admin/reports/regional-dispatch/sync')
    && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Đồng bộ số liệu' }).click();
  const scopedSync = await scopedSyncResponse;
  expect(scopedSync.status()).toBe(200);
  expect(scopedSync.request().postDataJSON().hubId).toBe(selectedHub.hub.id);
  const scopedSyncRaw = await scopedSync.json();
  const scopedSyncResult = scopedSyncRaw.data ?? scopedSyncRaw;
  expect(scopedSyncResult.rowsProcessed).toBe(REGION_KEYS.length);

  await page.getByTestId('cargo-hub-filter-clear').click();
  await expect(page.getByTestId('warehouse-hub-filter-select')).toContainText(hcmHub.hub.name);
  await expect(page.getByTestId('cargo-hub-filter-select')).toContainText('Tất cả kho');
  await expect(page.locator('[data-testid^="regional-hub-"]')).toHaveCount(report.hubReports.length);
  for (const chartId of ['regional-weight-chart', 'regional-volume-chart']) {
    await expect.poll(async () => {
      const bars = page.getByTestId(chartId).first().locator('.recharts-bar-rectangle');
      for (let index = 0; index < await bars.count(); index += 1) {
        const box = await bars.nth(index).boundingBox();
        if (box && box.width > 20 && box.height > 2) return true;
      }
      return false;
    }, { timeout: 15_000 }).toBe(true);
  }

  await page.screenshot({
    path: 'e2e/screenshots/screenshot_regional_dispatch_tab_filters_verified.png',
    fullPage: true,
  });
});
