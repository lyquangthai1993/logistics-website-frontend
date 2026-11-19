import { expect, test } from '@playwright/test';

test.describe('[RBAC] REPORT_VIEWER navigation role normalization', () => {
  test('shows report links only when persisted role uses its display name', async ({ page }) => {
    await page.route('**/api/v1/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
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

    await page.goto('/dashboard/admin/reports');
    await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click();

    await expect(page.locator('a[href="/dashboard/admin/reports"]').first()).toBeVisible();
    await expect(page.locator('a[href="/dashboard/admin/reports/trips"]').first()).toBeVisible();

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
