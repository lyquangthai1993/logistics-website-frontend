/**
 * frontend/e2e/87-feedback-15-10-task-87-direct-warehouse-orders-redirect.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 15/10 (Task #87) — Chuyển Hướng Đăng Nhập Thẳng Vào Màn Hình Đơn Hàng Kho & Loại Bỏ Màn Hình Dashboard Tổng Quan
 *
 * Business Requirements:
 * 1. Đăng nhập hệ thống (login-form.tsx):
 *    - Đích chuyển hướng mặc định sau đăng nhập BẮT BUỘC là /dashboard/warehouse/orders ("Đơn hàng kho").
 *    - Tuyệt đối không chuyển hướng đến /dashboard/overview.
 * 2. Loại bỏ hoàn toàn màn hình Dashboard Overview:
 *    - Khi truy cập /dashboard/overview, hệ thống tự động redirect sang /dashboard/warehouse/orders.
 *    - Khi truy cập / hoặc /dashboard, hệ thống tự động redirect sang /dashboard/warehouse/orders.
 *    - Menu thanh điều hướng (nav-config.ts) không còn hiển thị mục Dashboard mẫu.
 * 3. Bằng chứng nghiệm thu thực tế:
 *    - Lưu ảnh chụp xác minh tại: feedbacks/feedback_15_10_task_87/screenshot_01_verified.png
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_15_10_task_87');
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_01_verified.png');

test.describe.serial('Feedback 15/10 (Task #87) — Chuyển Hướng Đơn Hàng Kho & Loại Bỏ Dashboard', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Static Code Audit — Kiểm tra cấu hình chuyển hướng mặc định và loại bỏ Overview', () => {
    // 1. Audit login-form.tsx
    const loginFormPath = path.resolve(
      __dirname,
      '../src/features/auth/components/login-form.tsx'
    );
    expect(fs.existsSync(loginFormPath)).toBeTruthy();
    const loginContent = fs.readFileSync(loginFormPath, 'utf-8');
    expect(loginContent).toContain("let targetUrl = '/dashboard/warehouse/orders'");

    // 2. Audit overview/page.tsx
    const overviewPagePath = path.resolve(
      __dirname,
      '../src/app/dashboard/overview/page.tsx'
    );
    expect(fs.existsSync(overviewPagePath)).toBeTruthy();
    const overviewContent = fs.readFileSync(overviewPagePath, 'utf-8');
    expect(overviewContent).toContain("redirect('/dashboard/warehouse/orders')");

    // 3. Audit dashboard/page.tsx & page.tsx
    const dashboardPagePath = path.resolve(__dirname, '../src/app/dashboard/page.tsx');
    const rootPagePath = path.resolve(__dirname, '../src/app/page.tsx');
    expect(fs.readFileSync(dashboardPagePath, 'utf-8')).toContain("redirect('/dashboard/warehouse/orders')");
    expect(fs.readFileSync(rootPagePath, 'utf-8')).toContain("redirect('/dashboard/warehouse/orders')");

    // 4. Audit nav-config.ts
    const navConfigPath = path.resolve(__dirname, '../src/config/nav-config.ts');
    const navContent = fs.readFileSync(navConfigPath, 'utf-8');
    expect(navContent).not.toContain("url: '/dashboard/overview'");

    // 5. Audit proxy.ts
    const proxyPath = path.resolve(__dirname, '../src/proxy.ts');
    const proxyContent = fs.readFileSync(proxyPath, 'utf-8');
    expect(proxyContent).toContain("new URL('/dashboard/warehouse/orders', request.url)");
  });

  test('CASE-02: Live UI Verification & Real Evidence Capture — Đăng nhập và xác nhận vào thẳng Đơn hàng kho, chặn Dashboard Overview', async ({
    page
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Đăng nhập tài khoản vận hành
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    // 2. Xác nhận sau khi đăng nhập, URL chuyển hướng thẳng vào /dashboard/warehouse/orders
    await page.waitForURL(/.*\/dashboard\/warehouse\/orders.*/, { timeout: 25000 });
    expect(page.url()).toContain('/dashboard/warehouse/orders');

    // 3. Kiểm tra tiêu đề trang chính xác là Tổng Hợp Đơn Hàng Tại Kho
    await expect(
      page.locator('main h1').filter({ hasText: /Tổng Hợp Đơn Hàng Tại Kho/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15000 });

    // 4. Cố tình truy cập trực tiếp vào /dashboard/overview
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/overview`, {
      waitUntil: 'networkidle'
    });

    // 5. Xác nhận hệ thống tự động redirect ngược lại về /dashboard/warehouse/orders
    await page.waitForURL(/.*\/dashboard\/warehouse\/orders.*/, { timeout: 15000 });
    expect(page.url()).toContain('/dashboard/warehouse/orders');

    // 6. Kiểm tra sidebar không hiển thị mục "Dashboard"
    const dashboardSidebarLink = page.locator('aside a[href="/dashboard/overview"], nav a[href="/dashboard/overview"]');
    await expect(dashboardSidebarLink).toHaveCount(0);

    // 7. Chụp ảnh màn hình nghiệm thu thực tế trực tiếp từ ứng dụng Web đang chạy (Ảnh thật 100%)
    await page.waitForTimeout(1000);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
    expect(fs.existsSync(SCREENSHOT_PATH)).toBeTruthy();
    console.log(`[VERIFIED EVIDENCE SAVED REAL UI] ${SCREENSHOT_PATH}`);
  });
});
