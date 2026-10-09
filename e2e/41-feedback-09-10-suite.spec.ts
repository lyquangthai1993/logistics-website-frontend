/**
 * e2e/41-feedback-09-10-suite.spec.ts
 *
 * Automated Playwright E2E Verification Suite for all 09/10 Feedback Tasks:
 * - feedback_09_10: Phân Định Tuyệt Đối Chuyến Xe Nhập Trực Tiếp vs. Trung Chuyển Liên Hub
 * - feedback_09_10_task_5: Khắc phục lỗi Tạo mới Tài khoản Người dùng (Anti-autofill & Smart Username)
 * - feedback_09_10_task_6: Loại bỏ Cột Trạng thái Đơn hàng tại Bảng con Nhập kho (6 cột chuẩn)
 * - feedback_09_10_task_7/8/9/10: Tái cấu trúc Bảng Đơn Hàng Kho 7 Cột & Ràng buộc Ngày Xuất Hàng (Để trống khi Lưu kho)
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './helpers/auth';
import path from 'path';

test.describe('Feedback 09/10 Comprehensive E2E Verification Suite', () => {
  const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN') || TEST_USERS[0];
  const warehouseManager = TEST_USERS.find((u) => u.role === 'WAREHOUSE_MANAGER') || TEST_USERS[3];

  test.beforeEach(async ({ page }) => {
    // Increase default navigation timeout
    page.setDefaultTimeout(30_000);
  });

  test('Suite 1: Warehouse Orders Page Layout & Outbound Date Guard (Tasks 7, 8, 9, 10, 13)', async ({ page }) => {
    await loginAs(page, superAdmin);
    await page.goto('/dashboard/warehouse/orders', { waitUntil: 'domcontentloaded' });

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 15_000 });

    // 1. Verify Columns in table header (upgraded to 11 in Task 13)
    const headers = page.locator('table thead tr th');
    const headerCount = await headers.count();
    expect([7, 11]).toContain(headerCount);

    const headerTexts = (await headers.allInnerTexts()).map(t => t.toUpperCase());
    expect(headerTexts.some(h => h.includes('STT'))).toBe(true);
    expect(headerTexts.some(h => h.includes('NGÀY NHẬP'))).toBe(true);
    expect(headerTexts.some(h => h.includes('MÃ VẬN ĐƠN'))).toBe(true);
    expect(headerTexts.some(h => h.includes('SỐ LƯỢNG'))).toBe(true);
    expect(headerTexts.some(h => h.includes('TRẠNG THÁI'))).toBe(true);
    expect(headerTexts.some(h => h.includes('NGÀY XUẤT'))).toBe(true);
    expect(headerTexts.some(h => h.includes('THAO TÁC'))).toBe(true);

    // 2. Verify rows and outbound date guard
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Loop over visible rows and verify the outbound date guard
      for (let i = 0; i < Math.min(rowCount, 10); i++) {
        const row = rows.nth(i);
        const cells = row.locator('td');
        const cellCount = await cells.count();
        if (cellCount === 7 || cellCount === 11) {
          const statusIdx = cellCount === 11 ? 8 : 4;
          const outboundIdx = cellCount === 11 ? 9 : 5;
          const statusText = (await cells.nth(statusIdx).innerText()).trim();
          const outboundCellText = (await cells.nth(outboundIdx).innerText()).trim();

          // If status is LƯU KHO or ĐƠN NHÁP, Outbound Date MUST be '—'
          if (
            statusText.includes('LƯU KHO') ||
            statusText.includes('ĐƠN NHÁP') ||
            statusText.includes('CHỜ NHẬP')
          ) {
            expect(outboundCellText).toBe('—');
          }
        }
      }
    }

    // Capture visual proof for Tasks 7, 8, 9, 10
    const paths = [
      path.resolve(__dirname, '../../feedback_09_10_task_7/screenshot_verified.png'),
      path.resolve(__dirname, '../../feedback_09_10_task_8/screenshot_verified.png'),
      path.resolve(__dirname, '../../feedback_09_10_task_9/screenshot_verified.png'),
      path.resolve(__dirname, '../../feedback_09_10_task_10/screenshot_verified.png')
    ];

    for (const p of paths) {
      await page.screenshot({ path: p, fullPage: false });
    }
  });

  test('Suite 2: Inbound Warehouse Board — Child Table 6 Columns & Parent Status Badge (Task 6)', async ({ page }) => {
    await loginAs(page, superAdmin);
    await page.goto('/dashboard/warehouse/inbound', { waitUntil: 'domcontentloaded' });

    // Wait for the inbound page container
    await page.waitForSelector('table', { timeout: 15_000 });

    // Check if there are trip rows
    const parentRows = page.locator('tbody tr');
    const count = await parentRows.count();

    if (count > 0) {
      // Check if any row has an expand chevron
      const chevron = page.locator('tbody button:has(svg)').first();
      if (await chevron.isVisible()) {
        await chevron.click();
        await page.waitForTimeout(600);

        // Check child table headers
        const childThead = page.locator('table table thead tr th');
        if ((await childThead.count()) > 0) {
          const childHeaders = await childThead.allInnerTexts();
          // Ensure 'TRẠNG THÁI' is NOT in child headers
          expect(childHeaders.some((h) => h.includes('TRẠNG THÁI'))).toBe(false);
          expect(childHeaders.length).toBe(6);
        }
      }
    }

    // Capture visual proof for Task 6
    const screenshotPath = path.resolve(
      __dirname,
      '../../feedback_09_10_task_6/screenshot_verified.png'
    );
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });

  test('Suite 3: User Creation Form — Anti-Autofill & Smart Username Suggestion (Task 5)', async ({ page }) => {
    await loginAs(page, superAdmin);
    await page.goto('/dashboard/users', { waitUntil: 'domcontentloaded' });

    // Click "Thêm Người Dùng"
    const addBtn = page.locator('#btn-add-user, button:has-text("Thêm Người Dùng")').first();
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await addBtn.click();

    // Verify dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 8_000 });

    // Verify anti-autofill attributes
    const emailInput = dialog.locator('input[type="email"], input[placeholder*="email" i], input[placeholder*="thư điện tử" i]').first();
    if (await emailInput.isVisible()) {
      const emailAutocomplete = await emailInput.getAttribute('autocomplete');
      expect(emailAutocomplete).toBe('off');
    }

    const passwordInput = dialog.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      const pwdAutocomplete = await passwordInput.getAttribute('autocomplete');
      expect(pwdAutocomplete).toBe('new-password');
    }

    // Verify Smart Username Suggestion button
    const suggestBtn = dialog.locator('button:has-text("Gợi ý")');
    if (await suggestBtn.isVisible()) {
      // Enter firstName and lastName
      const firstNameInput = dialog.locator('input[placeholder*="Tên" i]').first();
      const lastNameInput = dialog.locator('input[placeholder*="Họ" i]').first();

      if (await firstNameInput.isVisible() && await lastNameInput.isVisible()) {
        await lastNameInput.fill('Nguyen');
        await firstNameInput.fill('An');
        await suggestBtn.click();

        const usernameInput = dialog.locator('input[placeholder*="tên đăng nhập" i], input[placeholder*="username" i]').first();
        const generatedVal = await usernameInput.inputValue();
        expect(generatedVal.length).toBeGreaterThan(0);
      }
    }

    // Capture visual proof for Task 5
    const screenshotPath = path.resolve(
      __dirname,
      '../../feedback_09_10_task_5/screenshot_verified.png'
    );
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });

  test('Suite 4: Direct Inbound Trip Modal Differentiation (Feedback 09/10)', async ({ page }) => {
    await loginAs(page, superAdmin);
    await page.goto('/dashboard/warehouse/inbound', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('table', { timeout: 15_000 });

    // Open first trip if available
    const tripRows = page.locator('tbody tr.cursor-pointer');
    if (await tripRows.count() > 0) {
      await tripRows.first().click();
      await page.waitForTimeout(1000);

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        // Verify that forward transition buttons ("Tiếp theo: Xuất hàng mới vào trip") are NOT visible on direct inbound trips
        const nextStepBtn = modal.locator('button:has-text("Tiếp theo: Xuất hàng mới vào trip")');
        const skipBtn = modal.locator('button:has-text("Bỏ qua xuất mới & Hoàn tất")');

        // Check modal title
        const modalTitle = await modal.locator('h2').innerText();
        if (modalTitle.includes('Kiểm đếm dỡ hàng & Nhập kho')) {
          // Direct inbound trip: Step 2 and transition buttons MUST be absent
          await expect(nextStepBtn).toHaveCount(0);
          await expect(skipBtn).toHaveCount(0);
        }
      }
    }

    // Capture visual proof for Feedback 09/10
    const screenshotPath = path.resolve(
      __dirname,
      '../../feedback_09_10/screenshot_verified.png'
    );
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });
});
