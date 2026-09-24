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

test.describe('Kiểm tra thực tế phiên đăng nhập bền vững 10 phút (Vercel Dev)', () => {
  // Cho phép test chạy tối đa 12 phút (720,000 ms)
  test.setTimeout(720_000);

  test('Đăng nhập và duy trì phiên hoạt động liên tục trong 10 phút không bị logout', async ({ page }) => {
    // ── 1. Đăng nhập ──────────────────────────────────────────────────────────
    console.log(`[00:00] Điều hướng tới ${TARGET_BASE_URL}/auth/sign-in...`);
    await page.goto(`${TARGET_BASE_URL}/auth/sign-in`);
    await page.locator('input[name="email"]').waitFor({ state: 'visible', timeout: 20_000 });

    await page.fill('input[name="email"]', USER.email);
    await page.fill('input[name="password"]', USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard\/.*/, { timeout: 25_000 });
    console.log('[00:00] ✅ Đăng nhập thành công vào Dashboard!');

    // ── 2. Đọc token từ localStorage ──────────────────────────────────────────
    const getStorageData = async () => {
      return await page.evaluate(() => {
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
            return {
              iat: p.iat,
              exp: p.exp,
              durationSec: p.exp - p.iat,
              remainingSec: Math.round(p.exp - Date.now() / 1000)
            };
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
    };

    const initialTokens = await getStorageData();
    console.log(`[00:00] Access Token ban đầu thời hạn: ${initialTokens.accessExp?.durationSec}s (còn lại: ${initialTokens.accessExp?.remainingSec}s)`);
    console.log(`[00:00] Refresh Token ban đầu thời hạn: ${initialTokens.refreshExp?.durationSec}s = 7 ngày`);
    expect(initialTokens.hasAccess).toBe(true);

    // ── 3. Chờ thực tế 10 phút, kiểm tra từng phút một ────────────────────────
    console.log('[00:00] Bắt đầu theo dõi phiên đăng nhập thực tế trong 10 phút (600 giây)...');

    for (let minute = 1; minute <= 10; minute++) {
      // Chờ 60 giây
      await page.waitForTimeout(60_000);

      // Kiểm tra URL hiện tại - không được phép bị văng về /auth/sign-in
      const currentUrl = page.url();
      const currentTokenData = await getStorageData();
      const remainingSec = currentTokenData.accessExp?.remainingSec ?? 0;

      console.log(
        `⏱️ [Phút ${minute.toString().padStart(2, '0')}/10] ` +
        `URL: ${currentUrl} | ` +
        `Access Token còn: ${remainingSec}s | ` +
        `Trạng thái phiên: ${currentUrl.includes('/auth') ? '❌ BỊ VĂNG LOGOUT' : '✅ HỢP LỆ'}`
      );

      expect(currentUrl).not.toContain('/auth/sign-in');

      // Ở mốc phút thứ 5: Thử tương tác điều hướng sang trang Nhập kho
      if (minute === 5) {
        console.log('🔄 [Phút 05] Điều hướng sang /dashboard/warehouse/inbound để kiểm tra tương tác giữa phiên...');
        await page.goto(`${TARGET_BASE_URL}/dashboard/warehouse/inbound`);
        await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 20_000 });
        console.log('✅ [Phút 05] Tải dữ liệu Nhập kho thành công mượt mà!');
      }

      // Ở mốc phút thứ 8: Thử điều hướng sang trang Xuất kho
      if (minute === 8) {
        console.log('🔄 [Phút 08] Điều hướng sang /dashboard/warehouse/outbound...');
        await page.goto(`${TARGET_BASE_URL}/dashboard/warehouse/outbound`);
        await expect(page.getByRole('heading', { name: /Xuất kho/ })).toBeVisible({ timeout: 20_000 });
        console.log('✅ [Phút 08] Tải dữ liệu Xuất kho thành công mượt mà!');
      }
    }

    // ── 4. Sau đủ 10 phút: Kiểm tra phiên và chụp ảnh bằng chứng ──────────────
    console.log('[10:00] Đã hoàn thành 10 phút theo dõi liên tục!');
    await page.goto(`${TARGET_BASE_URL}/dashboard/overview`);
    await page.waitForTimeout(3000);

    const finalUrl = page.url();
    expect(finalUrl).toContain('/dashboard');
    console.log(`[10:00] ✅ URL cuối cùng: ${finalUrl} (Xác nhận 100% không bị văng về login)`);

    const finalScreenshotPath = path.join(ARTIFACT_DIR, '04_AUTH_10MIN_STABLE_PROOF.png');
    await page.screenshot({ path: finalScreenshotPath, fullPage: true });
    console.log(`[10:00] Đã lưu ảnh bằng chứng: ${finalScreenshotPath}`);
  });
});
