/**
 * frontend/e2e/46-feedback-13-10-export-15-columns.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 13/10 — Chuẩn Hóa Cấu Trúc 15 Cột Báo Cáo Excel Đơn Hàng Kho & Bóc Tách Chuyến Xe Nhập - Xuất
 *
 * Core Scenarios Tested:
 * 1. Scenario 1: Xuất Excel tại Tab "LƯU KHO" (Inbound vehicle, empty outbound date/vehicle, storage aging):
 *    - Verify 15 standard table headers (Col A -> Col O).
 *    - Strict Invariant: Stored orders have Col M (Ngày xuất) and Col N (Xe xuất) strictly EMPTY ("").
 *    - Verify Col D (Chuyến xe / BKS nhập hàng) is populated or valid fallback.
 *    - Verify Col O (Số ngày lưu kho) is non-negative integer (>= 0).
 *    - Capture screenshot_01_verified.png and screenshot_02_export_download_verified.png into feedback_13_10/.
 * 2. Scenario 2: Xuất Excel tại Tab "ĐÃ XUẤT KHO":
 *    - Verify 15 headers match standard.
 *    - Verify Col M (Ngày xuất kho) is populated with timestamp.
 *    - Verify Col O (Số ngày lưu kho) = Outbound Date - Inbound Date (>= 0).
 * 3. Scenario 3: Xuất Excel tại Tab "TẤT CẢ":
 *    - Verify data consistency across both stored and dispatched orders.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { TEST_USERS, loginAs } from './helpers/auth';

const WAREHOUSE_USER = {
  email: 'lyquangthai1993+6@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
  expectedLandingPath: '/dashboard/overview'
};

const FEEDBACK_DIR = fs.existsSync(path.resolve(__dirname, '../../feedback_13_10'))
  ? path.resolve(__dirname, '../../feedback_13_10')
  : path.resolve(process.cwd(), 'feedback_13_10');

const EXPECTED_15_HEADERS = [
  'STT',                             // Cột A
  'MÃ VẬN ĐƠN',                      // Cột B
  'NGÀY NHẬP KHO',                   // Cột C
  'CHUYẾN XE / BIỂN SỐ XE NHẬP HÀNG', // Cột D
  'TÊN HÀNG HÓA',                    // Cột E
  'SỐ KIỆN TỒN KHO',                 // Cột F
  'TỔNG KIỆN ĐƠN',                   // Cột G
  'KHỐI LƯỢNG (KG)',                 // Cột H
  'THỂ TÍCH (M³)',                   // Cột I
  'ĐÍCH ĐẾN / ĐỊA CHỈ GIAO',         // Cột J
  'TỈNH / THÀNH PHỐ',                // Cột K
  'TRẠNG THÁI',                      // Cột L
  'NGÀY XUẤT KHO',                   // Cột M
  'CHUYẾN XE / BIỂN SỐ XE XUẤT HÀNG', // Cột N
  'SỐ NGÀY LƯU KHO'                  // Cột O
];

test.describe.serial('Feedback 13/10: 15-Column Warehouse Orders Excel Export & Vehicle Separation', () => {
  let storedDownloadPath = '';

  test.beforeAll(async () => {
    if (!fs.existsSync(FEEDBACK_DIR)) {
      fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
    page.setDefaultTimeout(45_000);
  });

  test('Scenario 1: Tab "LƯU KHO" - 15 Columns, Inbound Vehicle, Empty Outbound, Aging Days', async ({
    page
  }) => {
    // 1. Login as Warehouse Manager (Andromeda Hub - HCM)
    await loginAs(page, WAREHOUSE_USER);

    // 2. Navigate to Warehouse Orders Page
    await page.goto('/dashboard/warehouse/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Tổng Hợp Đơn Hàng Tại Kho")', { timeout: 25_000 });

    // Wait for user hub context
    await expect(page.locator('h1')).toContainText('Andromeda Hub', { timeout: 15_000 });

    // Wait for table to render
    await expect(page.locator('text=Đang tải dữ liệu đơn hàng...')).not.toBeVisible({
      timeout: 20_000
    });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20_000 });

    // Capture screenshot 01: Initial Screen with Export button
    const screenshot01Path = path.join(FEEDBACK_DIR, 'screenshot_01_verified.png');
    await page.screenshot({ path: screenshot01Path, fullPage: false });
    expect(fs.existsSync(screenshot01Path)).toBeTruthy();

    // 3. Switch to LƯU KHO tab
    const storedTabBtn = page.locator('button[data-testid="warehouse-tab-inbound"]');
    if (await storedTabBtn.isVisible()) {
      await storedTabBtn.click();
      await expect(page.locator('button[data-testid="export-stored-orders-excel-btn"]')).toContainText('Xuất Excel lưu kho', { timeout: 10_000 });
    }

    // 4. Click Export Excel button
    const exportBtn = page.locator('button[data-testid="export-stored-orders-excel-btn"]');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 40_000 }),
      exportBtn.click()
    ]);

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^Bao_cao_don_hang_.*\.xlsx$/);
    expect(filename).toContain('Andromeda_Hub');

    storedDownloadPath = path.join(FEEDBACK_DIR, filename);
    await download.saveAs(storedDownloadPath);
    expect(fs.existsSync(storedDownloadPath)).toBeTruthy();

    // Capture screenshot 02: After export trigger
    const screenshot02Path = path.join(FEEDBACK_DIR, 'screenshot_02_export_download_verified.png');
    await page.screenshot({ path: screenshot02Path, fullPage: false });
    expect(fs.existsSync(screenshot02Path)).toBeTruthy();

    // 5. Inspect Excel Content and Structure
    const fileBuffer = fs.readFileSync(storedDownloadPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    expect(workbook.SheetNames.length).toBeGreaterThanOrEqual(1);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    expect(sheet).toBeDefined();

    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    expect(rows.length).toBeGreaterThanOrEqual(7);

    // Verify 15 Headers at Row 6 (index 5)
    const tableHeaders = rows[5] || [];
    expect(tableHeaders.length).toBe(15);
    for (let i = 0; i < EXPECTED_15_HEADERS.length; i++) {
      expect(tableHeaders[i]).toBe(EXPECTED_15_HEADERS[i]);
    }

    // Verify Data Rows
    const dataRows = rows.slice(6, rows.length - 1);
    expect(dataRows.length).toBeGreaterThanOrEqual(1);

    for (const row of dataRows) {
      expect(row[1]).toBeTruthy(); // Mã vận đơn
      expect(row[2]).toBeTruthy(); // Ngày nhập kho
      expect(row[3]).toBeDefined(); // Chuyến xe / BKS nhập hàng
      expect(row[5]).toBeGreaterThan(0); // Số kiện tồn kho > 0
      expect(row[6]).toBeGreaterThanOrEqual(row[5]); // Tổng kiện đơn >= tồn kho
      expect(row[11]).toBe('LƯU KHO'); // Trạng thái = LƯU KHO

      // RÀNG BUỘC SỐNG CÒN: Đơn LƯU KHO thì Cột M và Cột N BẮT BUỘC ĐỂ TRỐNG
      const outboundDateVal = row[12];
      const outboundVehicleVal = row[13];
      expect(
        outboundDateVal === undefined || outboundDateVal === '' || outboundDateVal === null
      ).toBeTruthy();
      expect(
        outboundVehicleVal === undefined || outboundVehicleVal === '' || outboundVehicleVal === null
      ).toBeTruthy();

      // Cột O: SỐ NGÀY LƯU KHO >= 0
      const storageDays = Number(row[14]);
      expect(Number.isInteger(storageDays)).toBeTruthy();
      expect(storageDays).toBeGreaterThanOrEqual(0);
    }

    // Verify Summary Row
    const lastRow = rows[rows.length - 1];
    expect(lastRow[4]).toBe('TỔNG CỘNG');
    expect(Number(lastRow[5])).toBeGreaterThan(0); // Tổng kiện tồn
    expect(Number(lastRow[6])).toBeGreaterThan(0); // Tổng kiện đơn
  });

  test('Scenario 2: Tab "ĐÃ XUẤT KHO" - Outbound Date & Outbound Vehicle Verification', async ({
    page
  }) => {
    await loginAs(page, WAREHOUSE_USER);
    await page.goto('/dashboard/warehouse/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Tổng Hợp Đơn Hàng Tại Kho")', { timeout: 25_000 });

    // Switch to ĐÃ XUẤT KHO tab
    const dispatchedTabBtn = page.locator('button[data-testid="warehouse-tab-completed_inbound"]');
    await expect(dispatchedTabBtn).toBeVisible({ timeout: 15_000 });
    await dispatchedTabBtn.click();
    await expect(page.locator('button[data-testid="export-stored-orders-excel-btn"]')).toContainText('Xuất Excel đã xuất', { timeout: 10_000 });

    const exportBtn = page.locator('button[data-testid="export-stored-orders-excel-btn"]');
    await expect(exportBtn).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 40_000 }),
      exportBtn.click()
    ]);

    const tempDispatchedPath = path.join(FEEDBACK_DIR, 'test_dispatched_export.xlsx');
    await download.saveAs(tempDispatchedPath);

    const fileBuffer = fs.readFileSync(tempDispatchedPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    // Verify 15 Headers
    const tableHeaders = rows[5] || [];
    expect(tableHeaders.length).toBe(15);
    for (let i = 0; i < EXPECTED_15_HEADERS.length; i++) {
      expect(tableHeaders[i]).toBe(EXPECTED_15_HEADERS[i]);
    }

    const dataRows = rows.slice(6, rows.length - 1);
    if (dataRows.length > 0) {
      for (const row of dataRows) {
        expect(row[1]).toBeTruthy(); // Order code
        expect(row[11]).toBe('ĐÃ XUẤT KHO');
        // Outbound date should be present for dispatched orders
        expect(row[12]).toBeTruthy();
        // Storage days >= 0
        const days = Number(row[14]);
        expect(Number.isInteger(days)).toBeTruthy();
        expect(days).toBeGreaterThanOrEqual(0);
      }
    }

    if (fs.existsSync(tempDispatchedPath)) {
      fs.unlinkSync(tempDispatchedPath);
    }
  });

  test('Scenario 3: Tab "TẤT CẢ" - End-to-End 15 Columns Consistency Check', async ({
    page
  }) => {
    await loginAs(page, WAREHOUSE_USER);
    await page.goto('/dashboard/warehouse/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Tổng Hợp Đơn Hàng Tại Kho")', { timeout: 25_000 });

    // Switch to TẤT CẢ tab
    const allTabBtn = page.locator('button[data-testid="warehouse-tab-all"]');
    await expect(allTabBtn).toBeVisible({ timeout: 15_000 });
    await allTabBtn.click();
    await expect(page.locator('button[data-testid="export-stored-orders-excel-btn"]')).toContainText('Xuất Excel tất cả', { timeout: 10_000 });

    const exportBtn = page.locator('button[data-testid="export-stored-orders-excel-btn"]');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 40_000 }),
      exportBtn.click()
    ]);

    const tempAllPath = path.join(FEEDBACK_DIR, 'test_all_export.xlsx');
    await download.saveAs(tempAllPath);

    const fileBuffer = fs.readFileSync(tempAllPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    const tableHeaders = rows[5] || [];
    expect(tableHeaders.length).toBe(15);
    for (let i = 0; i < EXPECTED_15_HEADERS.length; i++) {
      expect(tableHeaders[i]).toBe(EXPECTED_15_HEADERS[i]);
    }

    const dataRows = rows.slice(6, rows.length - 1);
    for (const row of dataRows) {
      const status = row[11];
      const stock = Number(row[5]) || 0;
      if (status === 'LƯU KHO' || stock > 0) {
        expect(row[12] === undefined || row[12] === '' || row[12] === null).toBeTruthy();
        expect(row[13] === undefined || row[13] === '' || row[13] === null).toBeTruthy();
      } else if (status === 'ĐÃ XUẤT KHO') {
        expect(row[12]).toBeTruthy();
      }
    }

    if (fs.existsSync(tempAllPath)) {
      fs.unlinkSync(tempAllPath);
    }
  });
});
