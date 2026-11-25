import { test, expect } from '@playwright/test';
import { loginAs, USER_ADMIN } from './helpers/auth';
import type { RegionalReportApiResponse } from '../src/features/admin-reports/components/super-admin-regional-dispatch-table';

test.use({ viewport: { width: 1920, height: 1080 } });

const REGION_KEYS = ['north', 'central', 'south', 'storage', 'na'] as const;

test('Tình hình hàng hóa is restricted to the HCM hub scope', async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, USER_ADMIN);

  const initialResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.status() === 200
      && url.pathname.endsWith('/admin/reports/regional-dispatch')
      && /^\d+$/.test(url.searchParams.get('hubId') ?? '');
  });
  await page.goto('/dashboard/admin/reports', { waitUntil: 'domcontentloaded' });
  await initialResponse;
  await expect(page.getByRole('heading', { name: 'Tình hình hàng hóa' })).toBeVisible();

  const refreshedResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.status() === 200
      && url.pathname.endsWith('/admin/reports/regional-dispatch')
      && /^\d+$/.test(url.searchParams.get('hubId') ?? '');
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

  expect(requestUrl.searchParams.get('hubId')).toBe(String(report.hubReports[0].hub.id));
  expect(report.cronInfo.cronTime).toBe('06:00');
  expect(report.hubReports).toHaveLength(1);
  expect(report.hubReports[0].hub.name).toBe('Andromeda Hub - HCM');
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
  await expect(hcmPanel.locator('[data-testid="regional-region-storage"]')).toHaveCount(0);
  await expect(hcmPanel.getByTestId('regional-onhand-count')).toHaveCount(0);
  await expect(page.getByText('Hàng tại kho được chia theo tỉnh giao. Dòng LƯU KHO gồm đơn ghi “Lưu kho” ở tỉnh giao.')).toBeVisible();
  await expect(page.getByTestId('regional-weight-chart').first()).toBeVisible();
  await controls.getByRole('button', { name: 'Dự kiến nhập kho', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Dự kiến nhập kho', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('regional-volume-chart').first()).toBeVisible();
  await controls.getByRole('button', { name: 'Tất cả', exact: true }).click();

  const hcmHub = report.hubReports[0].hub;
  const hubSelector = page.getByTestId('warehouse-hub-filter-select');
  await expect(hubSelector).toContainText(hcmHub.name);
  await hubSelector.click();
  await expect(page.getByTestId('warehouse-hub-filter-item-all')).toHaveCount(0);
  await expect(
    page.locator('button[data-testid^="warehouse-hub-filter-item-"][disabled]')
  ).toHaveCount(2);
  await expect(
    page.locator('button[data-testid^="warehouse-hub-filter-item-"]:not([disabled])')
  ).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid^="regional-hub-"]')).toHaveCount(1);
  await expect(page.getByTestId(`regional-hub-${hcmHub.id}`)).toBeVisible();
  await expect(page.getByTestId('cargo-hub-filter-select')).toHaveCount(0);

  const scopedSyncResponse = page.waitForResponse((response) =>
    response.url().includes('/admin/reports/regional-dispatch/sync')
    && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Đồng bộ số liệu' }).click();
  const scopedSync = await scopedSyncResponse;
  expect(scopedSync.status()).toBe(200);
  expect(scopedSync.request().postDataJSON().hubId).toBe(hcmHub.hub.id);
  const scopedSyncRaw = await scopedSync.json();
  const scopedSyncResult = scopedSyncRaw.data ?? scopedSyncRaw;
  expect(scopedSyncResult.rowsProcessed).toBe(REGION_KEYS.length);

  await expect(hubSelector).toContainText(hcmHub.name);
  await expect(page.locator('[data-testid^="regional-hub-"]')).toHaveCount(1);
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
