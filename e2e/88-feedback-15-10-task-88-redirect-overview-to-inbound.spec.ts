/**
 * frontend/e2e/88-feedback-15-10-task-88-redirect-overview-to-inbound.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 15/10 (Task #88) — Chặn Tuyệt Đối '/dashboard/overview' & Tự Động Chuyển Hướng Đến Màn Hình Nhập Kho
 *
 * Business Requirements:
 * 1. Chặn tuyệt đối đường dẫn /dashboard/overview:
 *    - Khi người dùng lỡ truy cập hoặc gõ trực tiếp /dashboard/overview, hệ thống tự động chuyển ngay tức thì về /dashboard/warehouse/inbound ("Nhập kho").
 * 2. Đa tầng bảo vệ (3-Tier Interception):
 *    - Next.js redirects (next.config.ts)
 *    - Next.js Middleware (proxy.ts)
 *    - Server Component route handler (overview/page.tsx)
 * 3. Bằng chứng nghiệm thu thực tế:
 *    - Lưu ảnh chụp xác minh tại: feedbacks/feedback_15_10_task_88/screenshot_01_verified.png
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_15_10_task_88');
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_01_verified.png');

test.describe.serial('Feedback 15/10 (Task #88) — Chặn Tuyệt Đối Overview & Chuyển Hướng Nhập Kho', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Static Code Audit — Kiểm tra cấu hình chặn /dashboard/overview và chuyển hướng sang /dashboard/warehouse/inbound', () => {
    // 1. Audit overview/page.tsx
    const overviewPagePath = path.resolve(
      __dirname,
      '../src/app/dashboard/overview/page.tsx'
    );
    expect(fs.existsSync(overviewPagePath)).toBeTruthy();
    const overviewContent = fs.readFileSync(overviewPagePath, 'utf-8');
    expect(overviewContent).toContain("redirect('/dashboard/warehouse/inbound')");

    // 2. Audit proxy.ts
    const proxyPath = path.resolve(__dirname, '../src/proxy.ts');
    expect(fs.existsSync(proxyPath)).toBeTruthy();
    const proxyContent = fs.readFileSync(proxyPath, 'utf-8');
    expect(proxyContent).toContain("new URL('/dashboard/warehouse/inbound', request.url)");

    // 3. Audit next.config.ts
    const nextConfigPath = path.resolve(__dirname, '../next.config.ts');
    expect(fs.existsSync(nextConfigPath)).toBeTruthy();
    const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf-8');
    expect(nextConfigContent).toContain("destination: '/dashboard/warehouse/inbound'");

    // 4. Audit orders/[id]/page.tsx
    const orderDetailPath = path.resolve(__dirname, '../src/app/dashboard/orders/[id]/page.tsx');
    const orderDetailContent = fs.readFileSync(orderDetailPath, 'utf-8');
    expect(orderDetailContent).not.toContain("router.push('/dashboard/overview')");
  });

  test('CASE-02: Live UI Verification & Real Evidence Capture — Truy cập /dashboard/overview và xác nhận bị chặn chuyển ngay sang Nhập kho', async ({
    page
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Đăng nhập tài khoản vận hành kho
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    // 2. Đợi chuyển hướng mặc định sau đăng nhập
    await page.waitForURL(/.*\/dashboard\/warehouse\/.*/, { timeout: 25000 });

    // 3. Cố tình truy cập trực tiếp vào /dashboard/overview
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/overview`, {
      waitUntil: 'commit'
    });

    // 4. Xác nhận hệ thống chặn tuyệt đối và chuyển hướng ngay sang /dashboard/warehouse/inbound
    await page.waitForURL(/.*\/dashboard\/warehouse\/inbound.*/, { timeout: 25000 });
    expect(page.url()).toContain('/dashboard/warehouse/inbound');

    // 5. Kiểm tra tiêu đề hoặc giao diện màn hình Nhập kho hiển thị đầy đủ
    await expect(
      page.locator('main h1, h1, h2').filter({ hasText: /Nhập kho|Tiếp Nhận/i }).first()
    ).toBeVisible({ timeout: 15000 });

    // 6. Chụp ảnh màn hình nghiệm thu thực tế trực tiếp từ ứng dụng Web đang chạy (Ảnh thật 100%)
    await page.waitForTimeout(1000);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
    expect(fs.existsSync(SCREENSHOT_PATH)).toBeTruthy();
    console.log(`[VERIFIED EVIDENCE SAVED REAL UI] ${SCREENSHOT_PATH}`);
  });
});
