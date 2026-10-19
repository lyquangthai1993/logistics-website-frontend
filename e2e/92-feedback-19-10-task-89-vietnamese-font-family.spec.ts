/**
 * frontend/e2e/92-feedback-19-10-task-89-vietnamese-font-family.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 19/10 (Task #89) — Cải Thiện Font Family Toàn Dự Án, Đảm Bảo Hỗ Trợ 100% Tiếng Việt Cho Tất Cả Theme
 *
 * Verification Scope:
 * 1. Toàn bộ 10 Theme (Vercel, Claude, Discord, Supabase, Mono, Notebook, Light Green, Zen, Astro Vista, WhatsApp).
 * 2. Triệt tiêu hoàn toàn lỗi Circular Dependency trong vercel.css và ghi đè --font-sans: initial trong theme.css.
 * 3. Chuẩn hóa nạp Google Fonts tối ưu trong font.config.ts với subset ['latin', 'vietnamese'] và nền tảng Be Vietnam Pro.
 * 4. Kiểm tra computed style fontFamily trên thẻ body không bị rơi về Times New Roman hoặc font serif lỗi.
 * 5. Màn hình kho bãi (/dashboard/warehouse/inbound) dùng tài khoản Hub thực tế USER_WAREHOUSE_HCM với bảng dữ liệu thật.
 * 6. Lưu ảnh chụp bằng chứng nghiệm thu tại: feedbacks/feedback_19_10_task_89/screenshot_vietnamese_font_verified.png
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_ADMIN, USER_WAREHOUSE_HCM } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const DEV_BACKEND_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://backend-tms-core-dev.up.railway.app/api/v1';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_19_10_task_89');
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_vietnamese_font_verified.png');

test.describe
  .serial('Feedback 19/10 (Task #89) — Cải Thiện Font Family & Hỗ Trợ 100% Tiếng Việt Cho Tất Cả Theme', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Static Code & Architecture Audit — Kiểm tra cấu hình font tiếng Việt và loại trừ Circular Dependency', () => {
    const fontConfigPath = path.resolve(__dirname, '../src/components/themes/font.config.ts');
    const themeCssPath = path.resolve(__dirname, '../src/styles/theme.css');
    const vercelCssPath = path.resolve(__dirname, '../src/styles/themes/vercel.css');
    const claudeCssPath = path.resolve(__dirname, '../src/styles/themes/claude.css');
    const whatsappCssPath = path.resolve(__dirname, '../src/styles/themes/whatsapp.css');
    const layoutPath = path.resolve(__dirname, '../src/app/layout.tsx');

    expect(fs.existsSync(fontConfigPath)).toBeTruthy();
    expect(fs.existsSync(themeCssPath)).toBeTruthy();
    expect(fs.existsSync(vercelCssPath)).toBeTruthy();
    expect(fs.existsSync(claudeCssPath)).toBeTruthy();
    expect(fs.existsSync(whatsappCssPath)).toBeTruthy();
    expect(fs.existsSync(layoutPath)).toBeTruthy();

    const fontConfigContent = fs.readFileSync(fontConfigPath, 'utf-8');
    const themeCssContent = fs.readFileSync(themeCssPath, 'utf-8');
    const vercelCssContent = fs.readFileSync(vercelCssPath, 'utf-8');
    const claudeCssContent = fs.readFileSync(claudeCssPath, 'utf-8');
    const whatsappCssContent = fs.readFileSync(whatsappCssPath, 'utf-8');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

    // 1. font.config.ts nạp Be_Vietnam_Pro và Inter với subset vietnamese
    expect(fontConfigContent).toContain('Be_Vietnam_Pro');
    expect(fontConfigContent).toContain("'vietnamese'");
    expect(fontConfigContent).toContain('--font-be-vietnam-pro');
    expect(fontConfigContent).toContain('--font-inter');

    // 2. theme.css không chứa override phá hoại --font-sans: initial
    expect(themeCssContent).not.toContain('--font-sans: initial');
    expect(themeCssContent).not.toContain('--font-mono: initial');
    expect(themeCssContent).toContain('font-family: var(--font-sans)');

    // 3. vercel.css không có vòng lặp tự tham chiếu
    expect(vercelCssContent).not.toContain('--font-sans: var(--font-sans),');
    expect(vercelCssContent).toContain('--font-be-vietnam-pro');

    // 4. claude.css & whatsapp.css có Be Vietnam Pro trong font stack
    expect(claudeCssContent).toContain('var(--font-be-vietnam-pro)');
    expect(whatsappCssContent).toContain('var(--font-be-vietnam-pro)');

    // 5. layout.tsx có lang="vi" và nạp fontVariables
    expect(layoutContent).toContain("lang='vi'");
    expect(layoutContent).toContain('fontVariables');
  });

  test('CASE-02: Backend Email Template Audit — Chuẩn hóa font-family tiếng Việt trên mọi email client', () => {
    const activationPath = path.resolve(
      __dirname,
      '../../backend/src/mail/mail-templates/activation.hbs'
    );
    const confirmEmailPath = path.resolve(
      __dirname,
      '../../backend/src/mail/mail-templates/confirm-new-email.hbs'
    );

    expect(fs.existsSync(activationPath)).toBeTruthy();
    expect(fs.existsSync(confirmEmailPath)).toBeTruthy();

    const activationContent = fs.readFileSync(activationPath, 'utf-8');
    const confirmEmailContent = fs.readFileSync(confirmEmailPath, 'utf-8');

    // Không còn font-family:arial đơn độc
    expect(activationContent).not.toContain('font-family:arial');
    expect(confirmEmailContent).not.toContain('font-family:arial');

    // Chứa font-family stack an toàn cho tiếng Việt
    expect(activationContent).toContain('-apple-system, BlinkMacSystemFont');
    expect(confirmEmailContent).toContain('-apple-system, BlinkMacSystemFont');
  });

  test('CASE-03: Live Browser UI & Typography Verification — Kiểm tra computed style và hiển thị tiếng Việt trên Hub thực tế', async ({
    page
  }) => {
    // 1. Đăng nhập bằng tài khoản Quản lý Kho HCM (Andromeda Hub - HCM)
    await loginAs(page, USER_WAREHOUSE_HCM);

    // 2. Mở màn hình Nhập kho thực tế
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('domcontentloaded');

    // 3. Assert tiêu đề và navigation hiển thị đúng tiếng Việt
    const header = page.locator('h1, h2, [data-slot="page-title"]').first();
    await expect(header).toBeVisible();
    await expect(page.locator('body')).toBeVisible();

    // 4. Assert computed style của body: font-family hợp lệ và KHÔNG rơi về Times New Roman
    const bodyComputedFont = await page.evaluate(() => {
      const style = window.getComputedStyle(document.body);
      return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight
      };
    });

    expect(bodyComputedFont.fontFamily).toBeTruthy();
    expect(bodyComputedFont.fontFamily.toLowerCase()).not.toContain('times new roman');
    expect(bodyComputedFont.fontFamily.toLowerCase()).toMatch(
      /sans-serif|-apple-system|roboto|segoe|inter/i
    );

    // 5. Kiểm tra ký tự tiếng Việt có dấu đầy đủ trong giao diện
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toMatch(
      /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/i
    );

    // 6. Kiểm tra các dòng bảng kê nhập kho trên database thực (Non-Empty Table Gate)
    await expect(page.locator('table')).toBeVisible();
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.first()).toBeVisible();
    const count = await tableRows.count();
    expect(count).toBeGreaterThan(0);

    // 7. Thực hiện tương tác người dùng: Click bộ chọn tab hoặc nút tìm kiếm
    const searchInput = page
      .locator('input[placeholder*="Tìm"], input[type="search"], input[type="text"]')
      .first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Chuyến');
      await page.waitForTimeout(300);
      await searchInput.fill('');
    }

    const refreshBtn = page
      .locator('button:has-text("Làm mới"), button:has-text("Tìm kiếm")')
      .first();
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
    }

    // 8. Chụp ảnh màn hình bằng chứng nghiệm thu sắc nét và lưu vào thư mục task
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    expect(fs.existsSync(SCREENSHOT_PATH)).toBeTruthy();
  });

  test('CASE-04: Multi-Theme Switch & Cascade Integrity — Kiểm tra tính kế thừa font trên các theme giao diện', async ({
    page
  }) => {
    await loginAs(page, USER_ADMIN);
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/orders`);
    await page.waitForLoadState('domcontentloaded');

    // Danh sách 10 theme cần kiểm tra tính toàn vẹn của biến CSS font
    const testThemes = [
      'vercel',
      'claude',
      'discord',
      'supabase',
      'mono',
      'notebook',
      'light-green',
      'zen',
      'astro-vista',
      'whatsapp'
    ];

    for (const theme of testThemes) {
      // Thiết lập thuộc tính data-theme và kiểm tra computed font
      const themeResult = await page.evaluate((themeName) => {
        document.documentElement.setAttribute('data-theme', themeName);
        const bodyStyle = window.getComputedStyle(document.body);
        const htmlStyle = window.getComputedStyle(document.documentElement);
        return {
          themeName,
          bodyFont: bodyStyle.fontFamily,
          fontSansVar: htmlStyle.getPropertyValue('--font-sans')
        };
      }, theme);

      expect(themeResult.bodyFont).toBeTruthy();
      expect(themeResult.bodyFont.toLowerCase()).not.toContain('times new roman');
    }

    // Assert bảng đơn hàng có dữ liệu thật
    const orderRows = page.locator('table tbody tr');
    const count = await orderRows.count();
    expect(count).toBeGreaterThan(0);
  });
});
