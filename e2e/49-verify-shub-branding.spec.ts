import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Verify S-Hub Branding & Logo on Localhost', () => {
  const screenshotsDir = path.resolve(__dirname, 'screenshots');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('Login Page & Sidebar S-Hub Branding Verification', async ({ page, context }) => {
    // Set sidebar cookie so it defaults to expanded
    await context.addCookies([
      {
        name: 'sidebar_state',
        value: 'true',
        domain: 'localhost',
        path: '/'
      }
    ]);

    // 1. Visit Login page
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:4000/auth/sign-in', { waitUntil: 'networkidle' });

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

    // 2. Perform Login to reach Dashboard
    await page.fill('input[name="email"]', 'lyquangthai1993+1@gmail.com');
    await page.fill('input[name="password"]', 'secret');
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

    const sHubSidebar = page.locator('[data-sidebar="header"]').getByText('S-Hub').first();
    await expect(sHubSidebar).toBeVisible();

    // Ensure "Logistics TMS" is NOT in the sidebar header
    const sidebarHeader = page.locator('[data-sidebar="header"]').first();
    const headerText = await sidebarHeader.innerText();
    expect(headerText).toContain('S-Hub');
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
  });
});
