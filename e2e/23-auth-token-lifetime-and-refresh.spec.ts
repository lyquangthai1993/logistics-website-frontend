import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/16ad9eb0-4445-46f5-9e82-eb2afbb34420';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const TARGET_BASE_URL =
  process.env.TARGET_URL ||
  'https://logistics-website-frontend-git-dev-thai-lys-projects.vercel.app';

const USER = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
};

test.describe('Kiểm tra Auth Token Lifetime & Refresh Token Stability (Vercel Dev)', () => {
  test.setTimeout(90_000);

  test('Xác nhận Access Token 15 phút, Refresh Token 7 ngày và phiên đăng nhập bền vững', async ({ page }) => {
    // ── 1. Đăng nhập ──────────────────────────────────────────────────────────
    console.log(`Navigating to ${TARGET_BASE_URL}/auth/sign-in...`);
    await page.goto(`${TARGET_BASE_URL}/auth/sign-in`);
    await page.locator('input[name="email"]').waitFor({ state: 'visible', timeout: 20_000 });

    await page.fill('input[name="email"]', USER.email);
    await page.fill('input[name="password"]', USER.password);
    await page.click('button[type="submit"]');

    // Chờ điều hướng vào dashboard
    await page.waitForURL(/\/dashboard\/.*/, { timeout: 25_000 });
    console.log('Logged in successfully!');

    // ── 2. Đọc token từ localStorage & cookie trong trình duyệt ───────────────
    const tokenData = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage');
      let accessToken = '';
      let refreshToken = '';
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          accessToken = parsed?.state?.accessToken || '';
          refreshToken = parsed?.state?.refreshToken || '';
        } catch {}
      }

      function parseExp(t: string) {
        try {
          const b64 = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          const p = JSON.parse(atob(b64));
          return { iat: p.iat, exp: p.exp, durationSec: p.exp - p.iat };
        } catch {
          return null;
        }
      }

      return {
        accessExp: parseExp(accessToken),
        refreshExp: parseExp(refreshToken),
        hasAccess: !!accessToken,
        hasRefresh: !!refreshToken,
      };
    });

    console.log('Token data from browser runtime:', JSON.stringify(tokenData, null, 2));

    expect(tokenData.hasAccess).toBe(true);
    expect(tokenData.hasRefresh).toBe(true);

    // Xác nhận Access Token thời lượng ~900s (15 phút)
    expect(tokenData.accessExp?.durationSec).toBe(900);
    console.log(`✅ Access Token lifetime: ${tokenData.accessExp?.durationSec}s = 15 minutes!`);

    // Xác nhận Refresh Token thời lượng ~604800s (7 ngày)
    expect(tokenData.refreshExp?.durationSec).toBe(604800);
    console.log(`✅ Refresh Token lifetime: ${tokenData.refreshExp?.durationSec}s = 7 days!`);

    // ── 3. Chụp hình Bằng chứng đăng nhập thành công vào Overview ─────────────
    await page.waitForTimeout(2000);
    const screenshotPath = path.join(ARTIFACT_DIR, '03_AUTH_STABLE_15M_LIFETIME.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Saved screenshot:', screenshotPath);

    // ── 4. Kiểm tra điều hướng đa trang không bị logout ───────────────────────
    await page.goto(`${TARGET_BASE_URL}/dashboard/warehouse/inbound`);
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 20_000 });
    console.log('✅ Navigated to Inbound page without logout!');

    await page.goto(`${TARGET_BASE_URL}/dashboard/warehouse/outbound`);
    await expect(page.getByRole('heading', { name: /Xuất kho/ })).toBeVisible({ timeout: 20_000 });
    console.log('✅ Navigated to Outbound page without logout!');
  });
});
