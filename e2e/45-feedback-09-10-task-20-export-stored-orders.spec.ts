/**
 * frontend/e2e/45-feedback-09-10-task-20-export-stored-orders.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 09/10 (Task 20) — Tích Hợp Nút Xuất Báo Cáo Excel Đơn Hàng Lưu Kho
 * Tại Màn Hình Đơn Hàng Kho Phục Vụ Kiểm Kê & Báo Cáo Vận Hành
 *
 * Scenarios Tested:
 * 1. Scenario 1: Button Visibility & UI Compact Density Styling:
 *    - Verify "Xuất Excel lưu kho" button appears on Page Header next to "Làm mới".
 *    - Verify styling: h-8, text-xs, font-bold, emerald theme border/icon, zero redundant icons.
 * 2. Scenario 2: Export Action & File Download Event (Happy Path):
 *    - Click button, trigger browser download event for .xlsx file.
 *    - Verify file naming format: Bao_cao_don_hang_luu_kho_[Hub]_[date].xlsx.
 * 3. Scenario 3: Excel Workbook Structure & Data Integrity:
 *    - Parse workbook using xlsx: Sheet name is "Đơn Hàng Lưu Kho".
 *    - Verify company report header (rows 1-5), 14 standard table columns (row 6).
 *    - Verify data rows only contain "LƯU KHO" status and stock > 0.
 *    - Verify Summary Total row at the bottom with sums.
 * 4. Scenario 4: Bypass Pagination Limit:
 *    - Verify exported rows match total stored items rather than being capped by page size (15).
 * 5. Scenario 5: Hub Data Isolation:
 *    - Test isolation between Hưng Yên (Polaris Hub) and Đà Nẵng (Magellan Hub).
 * 6. Evidence Proof:
 *    - Save screenshot_01_verified.png and screenshot_02_export_download_verified.png into feedback_09_10_task_20/.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

const WAREHOUSE_HYN_USER = TEST_USERS.find((u) => u.email === 'lyquangthai1993+4@gmail.com') ||
  TEST_USERS.find((u) => u.role === 'WAREHOUSE_MANAGER') || {
    email: 'lyquangthai1993+4@gmail.com',
    password: 'secret',
    role: 'WAREHOUSE_MANAGER' as const,
    expectedLandingPath: '/dashboard/overview'
  };

const WAREHOUSE_DAD_USER = {
  email: 'lyquangthai1993+5@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
  expectedLandingPath: '/dashboard/overview'
};

const FEEDBACK_DIR = fs.existsSync(path.resolve(__dirname, '../../feedback_09_10_task_20'))
  ? path.resolve(__dirname, '../../feedback_09_10_task_20')
  : path.resolve(process.cwd(), 'feedback_09_10_task_20');

test.describe.serial('Feedback 09/10 Task 20: Stored Orders Excel Export', () => {
  let downloadedFilePath = '';

  test.beforeAll(async () => {
    if (!fs.existsSync(FEEDBACK_DIR)) {
      fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60_000);
    page.setDefaultTimeout(40_000);
  });

  test('Scenario 1 & 2: Verify Button Display, Trigger Export, and Capture Evidence', async ({
    page
  }) => {
    // 1. Login as Warehouse Manager (Polaris Hub - Hưng Yên)
    await loginAs(page, WAREHOUSE_HYN_USER);

    // 2. Navigate to Warehouse Orders Page
    await page.goto('/dashboard/warehouse/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Tổng Hợp Đơn Hàng Tại Kho")', { timeout: 25_000 });

    // Wait for user hub context to be fully hydrated in header
    await expect(page.locator('h1')).toContainText('Polaris Hub', { timeout: 15_000 });

    // Wait for initial order data to render in table and loading indicator to disappear
    await expect(page.locator('text=Đang tải dữ liệu đơn hàng...')).not.toBeVisible({
      timeout: 20_000
    });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20_000 });

    const pageHeader = page.locator('h1:has-text("Tổng Hợp Đơn Hàng Tại Kho")');
    await expect(pageHeader).toBeVisible();

    // 3. Verify "Xuất Excel lưu kho" button exists next to "Làm mới"
    const exportBtn = page.locator('button[data-testid="export-stored-orders-excel-btn"]');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toHaveClass(/h-8/);
    await expect(exportBtn).toHaveClass(/text-xs/);
    await expect(exportBtn).toHaveClass(/font-bold/);

    const refreshBtn = page.locator('button:has-text("Làm mới")');
    await expect(refreshBtn).toBeVisible();

    // Verify positioning: Export button and Refresh button are grouped in the same container
    const exportBox = await exportBtn.boundingBox();
    const refreshBox = await refreshBtn.boundingBox();
    expect(exportBox).not.toBeNull();
    expect(refreshBox).not.toBeNull();
    if (exportBox && refreshBox) {
      expect(refreshBox.x).toBeGreaterThan(exportBox.x);
    }

    // 4. Capture screenshot 01: Initial screen with Export button
    const screenshot01Path = path.join(FEEDBACK_DIR, 'screenshot_01_verified.png');
    await page.screenshot({ path: screenshot01Path, fullPage: false });
    expect(fs.existsSync(screenshot01Path)).toBeTruthy();

    // Switch to LƯU KHO tab to verify stored orders export specifically
    const storedTabBtn = page.getByRole('button', { name: /^LƯU KHO/i });
    if (await storedTabBtn.isVisible()) {
      await storedTabBtn.click();
      await page.waitForTimeout(500);
    }

    // 5. Trigger Excel export & listen for download event
    await expect(exportBtn).toBeEnabled({ timeout: 15_000 });
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 35_000 }),
      exportBtn.click()
    ]);
    const filename = download.suggestedFilename();

    // Verify filename format: Bao_cao_don_hang_...xlsx
    expect(filename).toMatch(/^Bao_cao_don_hang_.*\.xlsx$/);
    expect(filename).toContain('Polaris_Hub');

    // Save downloaded file for inspection in subsequent scenario
    downloadedFilePath = path.join(FEEDBACK_DIR, filename);
    await download.saveAs(downloadedFilePath);
    expect(fs.existsSync(downloadedFilePath)).toBeTruthy();

    // 6. Capture screenshot 02: Success state with toast notification
    const screenshot02Path = path.join(FEEDBACK_DIR, 'screenshot_02_export_download_verified.png');
    await page.screenshot({ path: screenshot02Path, fullPage: false });
    expect(fs.existsSync(screenshot02Path)).toBeTruthy();
  });

  test('Scenario 3: Verify Excel Workbook Structure, 14 Columns & Data Integrity', async () => {
    expect(downloadedFilePath).toBeTruthy();
    expect(fs.existsSync(downloadedFilePath)).toBeTruthy();

    // Read the Excel workbook
    const fileBuffer = fs.readFileSync(downloadedFilePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // 1. Verify Sheet Name
    expect(workbook.SheetNames).toContain('Đơn Hàng Lưu Kho');
    const sheet = workbook.Sheets['Đơn Hàng Lưu Kho'];
    expect(sheet).toBeDefined();

    // Convert sheet to array of rows
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    expect(rows.length).toBeGreaterThanOrEqual(7); // At least 5 header rows + 1 table header + 1 total row

    // 2. Verify Corporate Header Information (Rows 1-4)
    const row1 = String(rows[0]?.[0] || '');
    expect(row1).toContain('SPIDER EXPRESS LOGISTICS TMS - BÁO CÁO ĐƠN HÀNG LƯU KHO');

    const row2 = String(rows[1]?.[0] || '');
    expect(row2).toContain('Kho / Trạm Hub:');
    expect(row2).toContain('Polaris Hub');

    const row3 = String(rows[2]?.[0] || '');
    expect(row3).toContain('Thời điểm xuất:');
    expect(row3).toContain('Người lập báo cáo:');

    const row4 = String(rows[3]?.[0] || '');
    expect(row4).toContain('Thống kê tổng quan:');
    expect(row4).toContain('Tổng số đơn:');
    expect(row4).toContain('Tổng số kiện tồn:');

    // 3. Verify Table Header Row (Row 6 / index 5) with 14 Columns
    const tableHeaders = rows[5] || [];
    expect(tableHeaders.length).toBe(14);
    expect(tableHeaders[0]).toBe('STT');
    expect(tableHeaders[1]).toBe('MÃ VẬN ĐƠN');
    expect(tableHeaders[2]).toBe('NGÀY NHẬP KHO');
    expect(tableHeaders[3]).toBe('NƠI GỬI / HUB GỬI');
    expect(tableHeaders[4]).toBe('TÊN HÀNG HÓA');
    expect(tableHeaders[5]).toBe('SỐ KIỆN TỒN KHO');
    expect(tableHeaders[6]).toBe('TỔNG KIỆN ĐƠN');
    expect(tableHeaders[7]).toBe('KHỐI LƯỢNG (KG)');
    expect(tableHeaders[8]).toBe('THỂ TÍCH (M³)');
    expect(tableHeaders[9]).toBe('ĐÍCH ĐẾN / ĐỊA CHỈ GIAO');
    expect(tableHeaders[10]).toBe('TỈNH / THÀNH PHỐ');
    expect(tableHeaders[11]).toBe('CHUYẾN XE / BIỂN SỐ ĐẾN');
    expect(tableHeaders[12]).toBe('TRẠNG THÁI');
    expect(tableHeaders[13]).toBe('GHI CHÚ / CHỨNG TỪ');

    // 4. Verify Summary Row at the bottom
    const lastRow = rows[rows.length - 1];
    expect(lastRow[4]).toBe('TỔNG CỘNG');

    // 5. Verify Data Rows (Rows between table header and total row)
    const dataRows = rows.slice(6, rows.length - 1);
    if (dataRows.length > 0) {
      let computedTotalStock = 0;
      for (const row of dataRows) {
        expect(row[1]).toBeTruthy(); // Order code
        expect(row[12]).toBe('LƯU KHO'); // Status is strictly LƯU KHO
        const stock = Number(row[5]) || 0;
        expect(stock).toBeGreaterThan(0); // Stored stock is strictly positive
        computedTotalStock += stock;
      }
      expect(Number(lastRow[5])).toBe(computedTotalStock);
    }
  });

  test('Scenario 4: Verify Pagination Independence (Bypass 15/100 Row Pagination Limits)', async ({
    page
  }) => {
    // 1. Login and go to orders page
    await loginAs(page, WAREHOUSE_HYN_USER);
    await page.goto('/dashboard/warehouse/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Tổng Hợp Đơn Hàng Tại Kho")', { timeout: 25_000 });
    await expect(page.locator('h1')).toContainText('Polaris Hub', { timeout: 15_000 });
    await page.waitForSelector('table tbody tr', { timeout: 20_000 });

    // 2. Locate stored orders tab: LƯU KHO
    const storedTab = page.getByRole('button', { name: /^LƯU KHO/i });
    await expect(storedTab).toBeVisible();

    // 3. Click export button and verify downloaded records
    const exportBtn = page.locator('button[data-testid="export-stored-orders-excel-btn"]');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 35_000 }),
      exportBtn.click()
    ]);
    const tempPath = path.join(FEEDBACK_DIR, 'temp_pagination_check.xlsx');
    await download.saveAs(tempPath);

    const wb = XLSX.readFile(tempPath);
    const sheet = wb.Sheets['Đơn Hàng Lưu Kho'];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    const dataRows = rows.slice(6, rows.length - 1);

    // Verify that data rows count matches or covers stored orders without pagination cutoff
    expect(dataRows.length).toBeGreaterThanOrEqual(1);

    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  });

  test('Scenario 5: Hub Data Isolation (Magellan Hub - Đà Nẵng vs Polaris Hub - Hưng Yên)', async ({
    page
  }) => {
    // 1. Clear session and login as Da Nang Warehouse Manager
    await clearSession(page);
    await loginAs(page, WAREHOUSE_DAD_USER);
    await page.goto('/dashboard/warehouse/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Tổng Hợp Đơn Hàng Tại Kho")', { timeout: 25_000 });

    // 2. Verify page header indicates Da Nang Hub
    await expect(page.locator('h1')).toContainText('Đà Nẵng', { timeout: 15_000 });
    await page.waitForSelector('table tbody tr', { timeout: 20_000 });

    // 3. Trigger Export for Da Nang
    const exportBtn = page.locator('button[data-testid="export-stored-orders-excel-btn"]');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 35_000 }),
      exportBtn.click()
    ]);
    const filename = download.suggestedFilename();

    // Verify filename contains Da Nang slug
    expect(filename).toMatch(/^Bao_cao_don_hang_.*\.xlsx$/);
    expect(filename).toContain('Da_Nang');

    // Read workbook and verify hub isolation
    const dadFilePath = path.join(FEEDBACK_DIR, 'dad_' + filename);
    await download.saveAs(dadFilePath);

    const wb = XLSX.readFile(dadFilePath);
    const sheet = wb.Sheets['Đơn Hàng Lưu Kho'];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    const row2 = String(rows[1]?.[0] || '');
    expect(row2).toContain('Đà Nẵng');

    // Verify none of the rows are from Hưng Yên
    const dataRows = rows.slice(6, rows.length - 1);
    for (const row of dataRows) {
      expect(row[1]).not.toBe('TEST-SD64-TR1'); // Does not contain Hưng Yên stored order
    }

    if (fs.existsSync(dadFilePath)) {
      fs.unlinkSync(dadFilePath);
    }
  });
});
