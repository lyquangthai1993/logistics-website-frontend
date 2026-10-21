import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_warehouse_orders_excel');
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_warehouse_orders_verified.png');

test.describe.serial('Warehouse Orders — Excel Export Clean Header/Footer & Date-Only Format', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Static Code Audit — Loại bỏ header thống kê, dòng TỔNG CỘNG và bỏ giờ ở ngày nhập/xuất', () => {
    const pagePath = path.resolve(__dirname, '../src/app/dashboard/warehouse/orders/page.tsx');
    expect(fs.existsSync(pagePath)).toBeTruthy();
    const content = fs.readFileSync(pagePath, 'utf-8');

    // 1. Kiểm tra wsData không còn header metadata thống kê thừa và dòng trống
    expect(content).not.toContain('BÁO CÁO ĐƠN HÀNG ${tabConfig.titleSuffix}');
    expect(content).not.toContain('Kho / Trạm Hub:');
    expect(content).not.toContain('Thời điểm xuất:');
    expect(content).not.toContain('Thống kê tổng quan:');

    // 2. Kiểm tra wsData không còn dòng TỔNG CỘNG
    expect(content).not.toContain("'TỔNG CỘNG',");

    // 3. Kiểm tra formatDate helper chỉ định dạng ngày, không có giờ phút
    expect(content).toContain('formatDate');
    expect(content).not.toMatch(/return\s+`\$\{hours\}:\$\{minutes\}\s+\$\{day\}\/\$\{month\}\/\$\{year\}`/);
    expect(content).toMatch(/return\s+`\$\{day\}\/\$\{month\}\/\$\{year\}`/);

    // 4. Kiểm tra Excel export dùng formatDate cho cả ngày nhập và ngày xuất
    expect(content).toContain('formatDate(inboundDateStr)');
    expect(content).toContain('outboundDateVal = formatDate(rawOutboundDate)');

    // 5. Kiểm tra UI table dùng formatDate
    expect(content).toContain('formatDate(row.inboundDate || row.createdAt)');
    expect(content).toContain('formatDate(r.outboundDate)');
  });

  test('CASE-02: Live UI Table & Excel Export Audit — Kiểm tra cột ngày chỉ hiển thị DD/MM/YYYY và file Excel chuẩn', async ({
    page
  }) => {
    await loginAs(page, USER_WAREHOUSE_HCM, BASE_URL);
    await page.goto(`${BASE_URL}/dashboard/warehouse/orders`, { waitUntil: 'domcontentloaded' });

    // Đợi bảng dữ liệu hiển thị
    await page.waitForSelector('table tbody tr', { timeout: 15000 });

    // Kiểm tra các ô ngày nhập trên giao diện (bỏ giờ, chỉ có DD/MM/YYYY)
    const dateCells = page.locator('table tbody tr td:nth-child(2)');
    const count = await dateCells.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = (await dateCells.nth(i).textContent())?.trim() || '';
      if (text !== '—') {
        expect(text).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      }
    }

    // Chụp ảnh màn hình giao diện đã cập nhật chỉ hiển thị ngày
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
    expect(fs.existsSync(SCREENSHOT_PATH)).toBeTruthy();

    // Kiểm tra trigger tải file Excel
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    const exportBtn = page.locator('[data-testid="export-stored-orders-excel-btn"]');
    await exportBtn.click();
    const download = await downloadPromise;

    const downloadPath = path.join(EVIDENCE_DIR, 'exported_test.xlsx');
    await download.saveAs(downloadPath);
    expect(fs.existsSync(downloadPath)).toBeTruthy();

    // Phân tích nội dung file Excel đã tải về
    const workbook = XLSX.readFile(downloadPath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    expect(sheetData.length).toBeGreaterThan(1);

    // Dòng đầu tiên (Row 1 / Index 0) BẮT BUỘC là header của bảng dữ liệu, không có metadata
    const headerRow = sheetData[0];
    expect(headerRow[0]).toBe('STT');
    expect(headerRow[1]).toBe('MÃ VẬN ĐƠN');
    expect(headerRow[2]).toBe('NGÀY NHẬP KHO');

    // Không tồn tại dòng nào chứa "SPIDER EXPRESS" hay "TỔNG CỘNG"
    for (const row of sheetData) {
      for (const cell of row) {
        if (typeof cell === 'string') {
          expect(cell).not.toContain('SPIDER EXPRESS LOGISTICS TMS - BÁO CÁO');
          expect(cell).not.toContain('Kho / Trạm Hub:');
          expect(cell).not.toContain('Thời điểm xuất:');
          expect(cell).not.toContain('Thống kê tổng quan:');
          expect(cell).not.toBe('TỔNG CỘNG');
        }
      }
    }

    // Kiểm tra định dạng ngày nhập kho trong file Excel (Cột C / Index 2)
    for (let r = 1; r < Math.min(sheetData.length, 10); r++) {
      const dateVal = sheetData[r][2];
      if (dateVal && typeof dateVal === 'string' && dateVal !== '—') {
        expect(dateVal).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      }
    }

    // Xóa file test sau khi verify
    try {
      fs.unlinkSync(downloadPath);
    } catch {
      // ignore
    }
  });
});
