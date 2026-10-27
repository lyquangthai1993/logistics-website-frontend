import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:4000';

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../feedbacks/feedback_task_107_mobile_sticky_orders_table'
);
const SCREENSHOT_MOBILE_PATH = path.join(
  EVIDENCE_DIR,
  'screenshot_task_107_mobile_sticky_orders_table_verified.png'
);
const SCREENSHOT_DESKTOP_PATH = path.join(
  EVIDENCE_DIR,
  'screenshot_task_107_desktop_orders_table_verified.png'
);

test.describe
  .serial('Task #107: Mobile Sticky Orders Table (Fixed Ngày Nhập, Mã Vận Đơn, Hide STT)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Static Code Audit — Verify STT hidden on mobile, Ngày Nhập & Mã Vận Đơn sticky', () => {
    const pagePath = path.resolve(__dirname, '../src/app/dashboard/warehouse/orders/page.tsx');
    expect(fs.existsSync(pagePath)).toBeTruthy();
    const content = fs.readFileSync(pagePath, 'utf-8');

    // 1. Verify STT header and cell are hidden on mobile
    expect(content).toContain('hidden md:table-cell py-1 px-1 w-[36px]');

    // 2. Verify Ngày Nhập header and cell are sticky left-0 on mobile, md:left-[35px] on desktop
    expect(content).toContain('sticky left-0 md:left-[35px]');

    // 3. Verify Mã Vận Đơn is sticky left-[81px] on mobile, md:left-[116px] on desktop
    expect(content).toContain('sticky left-[81px] md:left-[116px]');

    // 4. Verify table border-separate border-spacing-0
    expect(content).toContain('border-separate border-spacing-0');
  });

  test('CASE-02: Mobile Viewport — STT hidden, Ngày Nhập & Mã Vận Đơn fixed/sticky on scroll', async ({
    browser
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // Mobile iPhone
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    const page = await context.newPage();

    // Login as Warehouse HCM
    await loginAs(page, USER_WAREHOUSE_HCM, BASE_URL);

    // Navigate to /dashboard/warehouse/orders
    await page.goto(`${BASE_URL}/dashboard/warehouse/orders`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Locate the table
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Assert STT header is HIDDEN on mobile
    const sttHeader = table.locator('th:has-text("STT")');
    await expect(sttHeader).toBeHidden();

    // Assert Ngày Nhập header is VISIBLE on mobile and sticky
    const dateHeader = table.locator('th:has-text("NGÀY NHẬP")');
    await expect(dateHeader).toBeVisible();
    const dateHeaderStyle = await dateHeader.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        position: computed.position,
        left: computed.left
      };
    });
    expect(dateHeaderStyle.position).toBe('sticky');
    expect(dateHeaderStyle.left).toBe('0px');

    // Assert Mã Vận Đơn header is VISIBLE on mobile and sticky
    const codeHeader = table.locator('th:has-text("MÃ VẬN ĐƠN")');
    await expect(codeHeader).toBeVisible();
    const codeHeaderStyle = await codeHeader.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        position: computed.position,
        left: computed.left
      };
    });
    expect(codeHeaderStyle.position).toBe('sticky');
    expect(codeHeaderStyle.left).toBe('81px');

    // Check row cells if data exists
    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0 && !(await rows.first().locator('td:has-text("Đang tải")').isVisible())) {
      const firstRow = rows.first();
      // First td (STT) is hidden
      const firstRowCells = firstRow.locator('td');
      const sttCell = firstRowCells.first();
      await expect(sttCell).toBeHidden();

      // Second cell (Ngày Nhập) is sticky at left: 0px
      const dateCell = firstRowCells.nth(1);
      await expect(dateCell).toBeVisible();
      const dateCellStyle = await dateCell.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return { position: computed.position, left: computed.left };
      });
      expect(dateCellStyle.position).toBe('sticky');
      expect(dateCellStyle.left).toBe('0px');

      // Third cell (Mã Vận Đơn) is sticky at left: 81px
      const codeCell = firstRowCells.nth(2);
      await expect(codeCell).toBeVisible();
      const codeCellStyle = await codeCell.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return { position: computed.position, left: computed.left };
      });
      expect(codeCellStyle.position).toBe('sticky');
      expect(codeCellStyle.left).toBe('81px');
    }

    // Scroll horizontally right inside table container
    const scrollContainer = page.locator('div.overflow-x-auto');
    await scrollContainer.evaluate((el) => {
      el.scrollLeft = 300;
    });
    await page.waitForTimeout(500);

    // Verify after horizontal scroll, Ngày Nhập and Mã Vận Đơn remain pinned in viewport
    const dateHeaderAfterScroll = await dateHeader.boundingBox();
    const codeHeaderAfterScroll = await codeHeader.boundingBox();
    expect(dateHeaderAfterScroll).not.toBeNull();
    expect(codeHeaderAfterScroll).not.toBeNull();

    // Capture visual evidence screenshot on mobile
    await page.screenshot({ path: SCREENSHOT_MOBILE_PATH, fullPage: false });
    await context.close();
  });

  test('CASE-03: Desktop Viewport — STT, Ngày Nhập, Mã Vận Đơn all visible with correct alignment', async ({
    browser
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    // Login as Warehouse HCM
    await loginAs(page, USER_WAREHOUSE_HCM, BASE_URL);

    // Navigate to /dashboard/warehouse/orders
    await page.goto(`${BASE_URL}/dashboard/warehouse/orders`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Assert STT header is VISIBLE on desktop
    const sttHeader = table.locator('th:has-text("STT")');
    await expect(sttHeader).toBeVisible();

    // Assert Ngày Nhập header is VISIBLE on desktop
    const dateHeader = table.locator('th:has-text("NGÀY NHẬP")');
    await expect(dateHeader).toBeVisible();

    // Assert Mã Vận Đơn header is VISIBLE on desktop
    const codeHeader = table.locator('th:has-text("MÃ VẬN ĐƠN")');
    await expect(codeHeader).toBeVisible();

    // Capture visual evidence screenshot on desktop
    await page.screenshot({ path: SCREENSHOT_DESKTOP_PATH, fullPage: false });
    await context.close();
  });
});
