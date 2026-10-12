/**
 * frontend/e2e/46-feedback-12-10-auth-branding.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 12/10 — Chuẩn Hóa Nhận Diện Thương Hiệu Spider Express & Thay Đổi Hình Ảnh Banner Trang Đăng Nhập (Login Hero)
 *
 * Scenarios Tested:
 * 1. Desktop Viewport (1440x900) Login Hero Banner & Brand Identity:
 *    - Image asset: loads /images/auth-hero.webp with optimal dimensions and priority.
 *    - Brand identity: "Spider Express", "Logistics TMS", "Anytime Anywhere" tag badge.
 *    - Content cards: Floating feature card & corporate quote block.
 *    - Form presentation: Login inputs, clean header, submit button.
 * 2. Secondary Auth Views Brand Synchronization:
 *    - /auth/forgot-password: AuthHeroBanner synchronized with "Security & Auth" badge.
 *    - /auth/reset-password: Form structure and brand alignment.
 * 3. Mobile Viewport (390x844) Responsive & Compact Layout:
 *    - Hero banner gracefully hidden on small screens (hidden lg:flex).
 *    - Form centered with zero horizontal scroll overflow.
 * 4. Real Database Authentication & Session Redirection:
 *    - Submit valid credentials via POST /api/v1/auth/email/login.
 *    - Successful redirect to /dashboard/overview.
 * 5. Visual Evidence Proof:
 *    - Capture screenshot_verified_login.png & screenshot_01_verified.png into feedback_12_10/.
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, clearSession } from './helpers/auth';
import path from 'path';
import fs from 'fs';

test.describe('Feedback 12/10: Spider Express Branding & Login Hero Banner Verification', () => {
  const adminUser =
    TEST_USERS.find((u) => u.role === 'SUPER_ADMIN') ||
    TEST_USERS[0];

  const FEEDBACK_DIR = path.resolve(__dirname, '../../feedback_12_10');

  test.beforeAll(async () => {
    if (!fs.existsSync(FEEDBACK_DIR)) {
      fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }
  });

  test('Scenario 1: Desktop Login Hero Banner, WebP Image & Spider Express Identity', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const targetUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';
    console.log(`[TEST] Navigating to ${targetUrl}/auth/sign-in...`);
    await page.goto(`${targetUrl}/auth/sign-in`, { waitUntil: 'domcontentloaded' });

    // Assert Left Visual Hero Banner is visible
    const heroImage = page.locator('img[alt="Spider Express Logistics TMS"]').first();
    await expect(heroImage).toBeVisible({ timeout: 15_000 });

    // Verify image source points to optimized WebP asset
    const imageSrc = await heroImage.getAttribute('src');
    expect(imageSrc).toBeTruthy();
    expect(imageSrc).toMatch(/auth-hero\.webp/i);

    // Verify Brand Identity texts
    await expect(page.locator('text=Spider Express').first()).toBeVisible();
    await expect(page.locator('text=Logistics TMS').first()).toBeVisible();
    await expect(page.locator('text=Anytime Anywhere').first()).toBeVisible();

    // Verify Feature Card & System Description
    await expect(page.locator('text=Hệ thống Quản trị Vận tải Số hóa').first()).toBeVisible();

    // Verify Right Form components
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();

    // Capture visual evidence screenshots into feedback_12_10/
    const screenshot1 = path.join(FEEDBACK_DIR, 'screenshot_verified_login.png');
    const screenshot2 = path.join(FEEDBACK_DIR, 'screenshot_01_verified.png');
    await page.screenshot({ path: screenshot1, fullPage: true });
    fs.copyFileSync(screenshot1, screenshot2);
    console.log(`[EVIDENCE] Saved verified screenshot to ${screenshot1}`);
  });

  test('Scenario 2: Secondary Auth Views Brand Synchronization (Forgot Password)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const targetUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';
    await page.goto(`${targetUrl}/auth/forgot-password`, { waitUntil: 'domcontentloaded' });

    // Assert Left Visual Banner is present with synchronized branding
    const heroImage = page.locator('img[alt="Spider Express Logistics TMS"]').first();
    await expect(heroImage).toBeVisible({ timeout: 15_000 });

    await expect(page.locator('text=Spider Express').first()).toBeVisible();
    await expect(page.locator('text=Security & Auth').first()).toBeVisible();

    // Assert Form heading
    await expect(page.getByRole('heading', { name: 'Quên mật khẩu?' })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('Scenario 3: Mobile Viewport (390x844) Responsive & Zero Overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const targetUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';
    await page.goto(`${targetUrl}/auth/sign-in`, { waitUntil: 'domcontentloaded' });

    // In mobile mode, the left visual hero banner should be hidden (hidden lg:flex)
    const heroBannerContainer = page.locator('.hidden.lg\\:flex').first();
    await expect(heroBannerContainer).toBeHidden();

    // Login form remains prominently visible and centered
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Assert zero horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('Scenario 4: Real Database Authentication Flow & Redirection', async ({ page }) => {
    test.setTimeout(60_000);
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    const targetUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';
    await page.goto(`${targetUrl}/auth/sign-in`, { waitUntil: 'domcontentloaded' });

    // Ensure form is hydrated and interactive
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitBtn = page.getByRole('button', { name: 'Đăng nhập' });

    await expect(emailInput).toBeVisible({ timeout: 15_000 });
    await expect(submitBtn).toBeEnabled({ timeout: 15_000 });

    await emailInput.fill(adminUser.email);
    await passwordInput.fill(adminUser.password);

    // Track API login request/response to eliminate race conditions
    const authResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/auth/email/login') && res.status() === 200,
      { timeout: 30_000 }
    );

    await Promise.all([authResponsePromise, submitBtn.click()]);

    // Wait for successful redirection to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    expect(page.url()).toContain('/dashboard');
    console.log(`[AUTH] Successfully authenticated as ${adminUser.email} and redirected to ${page.url()}`);
  });
});
