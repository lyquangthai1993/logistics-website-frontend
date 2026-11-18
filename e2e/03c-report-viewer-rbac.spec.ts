import { expect, test } from '@playwright/test';
import { clearSession, loginAs, type LoginCredentials } from './helpers/auth';

function getReportViewerCredentials(): LoginCredentials {
  const password = process.env.REPORT_VIEWER_E2E_PASSWORD;
  if (!password) {
    throw new Error(
      'Set REPORT_VIEWER_E2E_PASSWORD in the test environment; credentials are never stored in source.'
    );
  }

  return {
    username: process.env.REPORT_VIEWER_E2E_USERNAME ?? 'report',
    email: '',
    password,
    role: 'REPORT_VIEWER',
    expectedLandingPath: '/dashboard/admin/reports'
  };
}

test.describe('[RBAC] REPORT_VIEWER real login', () => {
  test.skip(
    !process.env.REPORT_VIEWER_E2E_PASSWORD,
    'Set REPORT_VIEWER_E2E_PASSWORD to run against a provisioned Dev account.'
  );

  test.afterEach(async ({ page }) => {
    await clearSession(page);
  });

  test('logs in and shows only report menus', async ({ page }) => {
    const credentials = getReportViewerCredentials();
    await loginAs(page, credentials);

    await expect(page).toHaveURL(/\/dashboard\/admin\/reports$/);
    await expect(page.locator('a[href="/dashboard/admin/reports"]').first()).toBeVisible();
    await expect(page.locator('a[href="/dashboard/admin/reports/trips"]').first()).toBeVisible();

    for (const href of [
      '/dashboard/admin/cronjobs',
      '/dashboard/admin/hubs',
      '/dashboard/users',
      '/dashboard/warehouse/inbound',
      '/dashboard/trips'
    ]) {
      await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);
    }

    await page.screenshot({
      path: 'test-results/report-viewer-menu-verified.png',
      fullPage: true
    });
  });

  test('cannot open administrative or operational routes directly', async ({ page }) => {
    await loginAs(page, getReportViewerCredentials());

    for (const route of [
      '/dashboard/admin/cronjobs',
      '/dashboard/admin/hubs',
      '/dashboard/users',
      '/dashboard/warehouse/inbound',
      '/dashboard/trips',
      '/dashboard/profile'
    ]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/dashboard\/admin\/reports$/);
    }
  });
});
