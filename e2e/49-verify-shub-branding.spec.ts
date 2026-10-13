/**
 * frontend/e2e/49-verify-shub-branding.spec.ts
 *
 * Automated Playwright E2E Verification Suite:
 * - Dynamic domain support (Localhost, Dev Domain, Production Domain)
 * - Verifies S-Hub Branding & Logo replacement across Auth (Login) & Dashboard Sidebar
 *
 * Run against any environment:
 * - Localhost:   PLAYWRIGHT_BASE_URL=http://localhost:4000 npx playwright test e2e/49-verify-shub-branding.spec.ts
 * - Domain Dev:  PLAYWRIGHT_BASE_URL=https://frontend-tms-core-dev.up.railway.app npx playwright test e2e/49-verify-shub-branding.spec.ts
 * - Domain Prod: PLAYWRIGHT_BASE_URL=https://frontend-tms-core-production.up.railway.app npx playwright test e2e/49-verify-shub-branding.spec.ts
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/auth';
import path from 'path';
import fs from 'fs';

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'http://localhost:4000';

test.describe('Verify S-Hub Branding & Logo (Multi-Environment)', () => {
  const screenshotsDir = path.resolve(__dirname, 'screenshots');
  const adminUser =
    TEST_USERS.find((u) => u.role === 'SUPER_ADMIN') ||
    TEST_USERS[0];

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('Login Page & Sidebar S-Hub Branding Verification', async ({ page, context }) => {
    // 0. Set sidebar cookie dynamically based on target BASE_URL (no hardcoded domain)
    await context.addCookies([
      {
        name: 'sidebar_state',
        value: 'true',
        url: BASE_URL
      }
    ]);

    // 1. Visit Login page on the resolved environment domain
    await page.setViewportSize({ width: 1440, height: 900 });
    const targetSignInUrl = `${BASE_URL.replace(/\/$/, '')}/auth/sign-in`;
    console.log(`[E2E] Navigating to target sign-in: ${targetSignInUrl}`);
    await page.goto(targetSignInUrl, { waitUntil: 'networkidle' });

    // Assert Logo Image is visible on AuthHeroBanner
    const loginLogoImg = page.locator('img[src*="logo_phieu_xuat_nhap_kho"]').first();
    await expect(loginLogoImg).toBeVisible({ timeout: 10_000 });

    // Assert "S-Hub" text is visible below logo
    const sHubTextLogin = page.locator('text=S-Hub').first();
    await expect(sHubTextLogin).toBeVisible();

    // Take screenshot of Login Page
    const loginScreenshotPath = path.join(screenshotsDir, 'screenshot_localhost_login_shub.png');
    await page.screenshot({ path: loginScreenshotPath });
    console.log(`[VERIFY] Saved login screenshot: ${loginScreenshotPath}`);

    // 2. Perform Login with configured credentials
    await page.fill('input[name="email"]', adminUser.email);
    await page.fill('input[name="password"]', adminUser.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

    // If sidebar is collapsed, click trigger to expand
    const sidebar = page.locator('[data-sidebar="sidebar"]').first();
    const isCollapsed = (await sidebar.getAttribute('data-state')) === 'collapsed';
    if (isCollapsed) {
      await page.click('[data-sidebar="trigger"]');
      await page.waitForTimeout(500);
    }

    // 3. Inspect Sidebar Branding (Expanded)
    const sidebarLogoImg = page.locator('[data-sidebar="header"]').locator('img[src*="logo_phieu_xuat_nhap_kho"]').first();
    await expect(sidebarLogoImg).toBeVisible({ timeout: 10_000 });

    const sHubSidebar = page.locator('[data-sidebar="header"]').getByText(/S-Hub/i).first();
    await expect(sHubSidebar).toBeVisible();

    // Ensure "Logistics TMS" is NOT in the sidebar header
    const sidebarHeader = page.locator('[data-sidebar="header"]').first();
    const headerText = await sidebarHeader.innerText();
    expect(headerText.toUpperCase()).toContain('S-HUB');
    expect(headerText).not.toContain('Logistics TMS');

    // Take screenshot of Dashboard with Sidebar Expanded
    const dashboardScreenshotPath = path.join(screenshotsDir, 'screenshot_localhost_sidebar_shub.png');
    await page.screenshot({ path: dashboardScreenshotPath });
    console.log(`[VERIFY] Saved sidebar screenshot: ${dashboardScreenshotPath}`);

    // Take cropped screenshot of the branding header area specifically
    const cropScreenshotPath = path.join(screenshotsDir, 'screenshot_localhost_sidebar_brand_crop.png');
    await sidebarHeader.screenshot({ path: cropScreenshotPath });
    console.log(`[VERIFY] Saved cropped brand screenshot: ${cropScreenshotPath}`);

    // 4. Also toggle to collapsed and capture collapsed screenshot
    await page.click('[data-sidebar="trigger"]');
    await page.waitForTimeout(400);
    const collapsedScreenshotPath = path.join(screenshotsDir, 'screenshot_localhost_sidebar_collapsed_shub.png');
    await page.screenshot({ path: collapsedScreenshotPath });
    console.log(`[VERIFY] Saved collapsed sidebar screenshot: ${collapsedScreenshotPath}`);

    const collapsedCropPath = path.join(screenshotsDir, 'screenshot_localhost_sidebar_collapsed_crop.png');
    await sidebar.locator('[data-sidebar="header"]').screenshot({ path: collapsedCropPath });
    console.log(`[VERIFY] Saved collapsed brand crop: ${collapsedCropPath}`);
  });
});
