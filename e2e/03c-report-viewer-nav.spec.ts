import { expect, test } from '@playwright/test';

test.describe('[RBAC] REPORT_VIEWER navigation role normalization', () => {
  test('shows only the main report menu when persisted role uses its display name', async ({
    page
  }) => {
    await page.route('**/api/v1/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      })
    );
    await page.route('**/api/v1/hubs?*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 1, code: 'HUB-HCM-01', name: 'Andromeda Hub - HCM', city: 'TP. Hồ Chí Minh', level: 1 },
            { id: 2, code: 'HUB-DAD-01', name: 'Magellan Hub - Đà Nẵng', city: 'Đà Nẵng', level: 1 },
            { id: 3, code: 'HUB-HYN-01', name: 'Polaris Hub - Hưng Yên', city: 'Hưng Yên', level: 1 }
          ]
        })
      })
    );
    const emptyMetric = {
      region: '',
      onhandWeightKg: 0,
      onhandWeightTons: 0,
      onhandVolumeCbm: 0,
      onhandPackageCount: 0,
      onhandOrderCount: 0,
      onhandOrderCodes: [],
      draftOrderCodes: [],
      incomingWeightKg: 0,
      incomingWeightTons: 0,
      incomingVolumeCbm: 0,
      incomingPackageCount: 0,
      incomingTripCount: 0,
      totalWeightKg: 0,
      totalWeightTons: 0,
      totalVolumeCbm: 0,
      recommendedVehicle: '',
      quickSnippet: ''
    };
    await page.route('**/regional-dispatch**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            draftRegions: { north: {}, central: {}, south: {}, storage: {}, na: {} },
            range: { fromDate: '2026-11-19', toDate: '2026-11-19' },
            dailySeries: [],
            hub: { id: 1, code: 'HCM', name: 'Ho Chi Minh', level: 1 },
            reportDate: '2026-11-19',
            cronInfo: {
              jobKey: '',
              name: '',
              cronTime: '',
              isEnabled: false,
              lastRunAt: null,
              lastRunStatus: ''
            },
            regions: {
              north: emptyMetric,
              central: emptyMetric,
              south: emptyMetric,
              storage: emptyMetric,
              na: emptyMetric
            },
            totals: {},
            hubsList: [],
            incomingTripsList: [],
            onhandOrdersList: []
          }
        })
      })
    );
    const tokenPayload = Buffer.from(
      JSON.stringify({
        id: 17,
        role: { id: 5, name: 'Report Viewer' },
        exp: Math.floor(Date.now() / 1000) + 3600
      })
    ).toString('base64url');
    const token = `header.${tokenPayload}.signature`;

    await page.goto('/auth/sign-in');
    await page.evaluate(
      ({ accessToken }) => {
        localStorage.setItem(
          'auth-storage',
          JSON.stringify({
            state: {
              user: {
                id: 17,
                username: 'report',
                name: 'Report Viewer',
                email: 'report@spiderexpress.vn',
                role: 'Report Viewer'
              },
              accessToken,
              refreshToken: null,
              impersonator: null,
              isAuthenticated: true
            },
            version: 0
          })
        );
        document.cookie = `access_token=${encodeURIComponent(accessToken)}; path=/; max-age=3600`;
      },
      { accessToken: token }
    );
    await page.reload();

    await page.goto('/dashboard/admin/reports');
    await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click();

    await expect(page.locator('a[href="/dashboard/admin/reports"]').first()).toBeVisible();
    await expect(page.locator('a[href="/dashboard/admin/reports/trips"]')).toHaveCount(0);

    const hubSelector = page.getByTestId('warehouse-hub-filter-select');
    await expect(hubSelector).toContainText('Andromeda Hub - HCM');
    await hubSelector.click();
    await expect(page.getByTestId('warehouse-hub-filter-item-all')).toHaveCount(0);
    await expect(
      page.locator('button[data-testid^="warehouse-hub-filter-item-"][disabled]')
    ).toHaveCount(2);

    for (const href of [
      '/dashboard/admin/cronjobs',
      '/dashboard/admin/hubs',
      '/dashboard/users',
      '/dashboard/warehouse/inbound',
      '/dashboard/warehouse/outbound',
      '/dashboard/warehouse/orders',
      '/dashboard/trips',
      '/dashboard/fleet'
    ]) {
      await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);
    }
  });
});
