import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/f8c46d05-4cbd-4861-9a69-65b90b6d5c21';

// Test against the Vercel dev branch deployment
const TARGET_BASE_URL =
  process.env.TARGET_URL ||
  'https://logistics-website-frontend-git-dev-thai-lys-projects.vercel.app';

const USER = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
};

test.describe('Kiểm tra Modal Kiểm Đếm Nhập Kho (Vercel Dev)', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Mở Modal Kiểm Đếm và xác nhận layout rộng rãi không bị co rúm', async ({ page }) => {
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

    // ── 2. Điều hướng đến trang Nhập Kho ─────────────────────────────────────
    console.log(`Navigating to ${TARGET_BASE_URL}/dashboard/warehouse/inbound...`);
    await page.goto(`${TARGET_BASE_URL}/dashboard/warehouse/inbound`);

    // Chờ tiêu đề xuất hiện
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(3000);

    // ── 3. Tìm nút "Kiểm đếm" ────────────────────────────────────────────────
    const tallyBtn = page.locator('button:has-text("Kiểm đếm")').first();
    await expect(tallyBtn).toBeVisible({ timeout: 15_000 });

    console.log('Clicking "Kiểm đếm" button...');
    await tallyBtn.click();

    // ── 4. Chờ Modal Kiểm Đếm xuất hiện ──────────────────────────────────────
    const tallyDialog = page.locator('div[role="dialog"]').first();
    await expect(tallyDialog).toBeVisible({ timeout: 10_000 });
    await expect(tallyDialog.locator('text=Kiểm đếm nhập kho').first()).toBeVisible();

    // Chờ bảng hàng hóa hiển thị
    await expect(tallyDialog.locator('text=Danh sách các dòng hàng kiểm đếm tiếp nhận')).toBeVisible();

    // Đo kích thước của modal dialog box
    const boundingBox = await tallyDialog.boundingBox();
    console.log('Tally Dialog Bounding Box:', boundingBox);

    // Khẳng định chiều rộng modal >= 800px (thay vì bị kẹt 384px trước đây)
    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      console.log(`Verified Modal Width: ${boundingBox.width}px (Must be >= 800px)`);
      expect(boundingBox.width).toBeGreaterThanOrEqual(800);
    }

    await page.waitForTimeout(1000);

    // ── 5. Chụp hình Bằng chứng ──────────────────────────────────────────────
    const screenshotFull = path.join(ARTIFACT_DIR, '05_TALLY_MODAL_FIXED_EXPANDED.png');
    await page.screenshot({ path: screenshotFull });
    console.log('Saved screenshot full page:', screenshotFull);

    const screenshotDialog = path.join(ARTIFACT_DIR, '05_TALLY_MODAL_DIALOG_ONLY.png');
    await tallyDialog.screenshot({ path: screenshotDialog });
    console.log('Saved screenshot dialog only:', screenshotDialog);
  });
});
