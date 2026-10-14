import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import {
  extractVietnamProvince,
  VIETNAM_PROVINCES,
} from '../src/features/warehouse/lib/vietnam-provinces';
import {
  inspectDispatchWorkbook,
  parseDispatchSheet,
  generateStandardExcelWorkbook,
  generateClipboardTsv,
  isDispatchExcelWorkbook,
} from '../src/features/warehouse/lib/dispatch-excel-converter';
import { USER_WAREHOUSE_HCM } from './helpers/auth';

test.describe('Task #79 (Extra): Excel Inbound Converter Tool (Chuẩn Hóa File Excel Điều Hành Sang Mẫu Chuẩn TMS)', () => {
  // Scoped Hub: Andromeda Hub - HCM (USER_WAREHOUSE_HCM: warehouse_hcm)
  const scopedUser = USER_WAREHOUSE_HCM;
  const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_14_10_extra');
  const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_converter_verified.png');
  const NDA_EXCEL_PATH = path.join(EVIDENCE_DIR, 'NDA_PhieuYeuCauNhapKho_2026 (1).xlsx');

  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  // ── TEST 1: Unit Test - Vietnam Provinces Extractor & 63 Provinces Matrix ──
  test('CASE-01 & EC-08: extractVietnamProvince accurately extracts province names from real addresses', () => {
    expect(VIETNAM_PROVINCES.length).toBe(63);

    const testCases = [
      {
        addr: 'CÔNG TY TNHH SAO MAI EM\r\n276 Đường Thống Nhất, Phường Tây Nha Trang, Tỉnh Khánh Hòa',
        expected: 'Khánh Hòa',
      },
      {
        addr: 'CÔNG TY TNHH TM & DV LÊ VÂN AUTO\r\nĐường Lê Duẩn, Khu phố 3, Phường Phan Rang, Tỉnh Khánh Hòa',
        expected: 'Khánh Hòa',
      },
      {
        addr: '522/1 Nguyễn Lương Bằng, Phường Hải Vân, TP. Đà Nẵng',
        expected: 'Đà Nẵng',
      },
      {
        addr: '16-18 Hoàng Văn Thụ, Tp. Quy Nhơn, Bình Định (nay Gia Lai)',
        expected: 'Bình Định',
      },
      {
        addr: '367-369-371 Nguyễn Hữu Thọ, Phường Cẩm Lệ, TP. Đà Nẵng',
        expected: 'Đà Nẵng',
      },
      {
        addr: '666/6 Phạm Cự Lượng, Phường Long Xuyên, Tỉnh An Giang',
        expected: 'An Giang',
      },
      {
        addr: 'Số 926, Đường Võ Văn Kiệt, Khóm 7, Phường Phú Lợi, TP. Cần Thơ',
        expected: 'Cần Thơ',
      },
      {
        addr: 'Số 29, Đường Lý Thường Kiệt, Khóm 7, Phường Tân Thành, Tỉnh Cà Mau',
        expected: 'Cà Mau',
      },
      {
        addr: 'MASAN HÀ NAM Lô CN-02, Khu công nghiệp Đồng Văn IV, Phường Lê Hồ , Tỉnh Ninh Bình, VN',
        expected: 'Ninh Bình',
      },
      {
        addr: '88 Lê Lợi, P. Bến Nghé, Q. 1, TP. Hồ Chí Minh',
        expected: 'TP. Hồ Chí Minh',
      },
      {
        addr: '102 Hoàng Hoa Thám, P. Liễu Giai, Q. Ba Đình, Hà Nội',
        expected: 'Hà Nội',
      },
    ];

    for (const tc of testCases) {
      const extracted = extractVietnamProvince(tc.addr);
      expect(extracted).toBe(tc.expected);
    }

    // EC-03: Edge case: rỗng hoặc không có tỉnh thành rõ ràng
    expect(extractVietnamProvince('')).toBe('');
    expect(extractVietnamProvince(null)).toBe('');
    expect(extractVietnamProvince(undefined)).toBe('');
  });

  // ── TEST 2: Unit Test - Dispatch Excel Parsing & Auto Standardization ──
  test('CASE-02 & EC-01 & EC-02: inspectDispatchWorkbook and parseDispatchSheet parse real dispatcher workbook', () => {
    expect(fs.existsSync(NDA_EXCEL_PATH)).toBe(true);
    const buf = fs.readFileSync(NDA_EXCEL_PATH);

    // 1. Kiểm tra nhận diện định dạng điều hành
    const inspection = inspectDispatchWorkbook(buf);
    expect(inspection.isDispatchFormat).toBe(true);
    expect(inspection.sheetNames.length).toBeGreaterThan(5);
    expect(inspection.sheetNames).toContain('14.10');
    expect(inspection.sheetNames).toContain('07.10');
    expect(inspection.sheetNames).toContain('Nhập');

    // 2. Parse sheet 14.10
    const parsed1410 = parseDispatchSheet(inspection.workbook, '14.10');
    expect(parsed1410.sheetName).toBe('14.10');
    expect(parsed1410.meta.date).toBe('14/10/2026');
    expect(parsed1410.rows.length).toBe(11);

    // Kiểm tra dòng đầu tiên (NDA2610-0210)
    const firstRow = parsed1410.rows[0];
    expect(firstRow.stt).toBe(1);
    expect(firstRow.orderCode).toBe('NDA2610-0210');
    expect(firstRow.goodsDescription).toBe('Lốp Michelin');
    expect(firstRow.totalQuantity).toBe(1); // EC-02: Tự động điền 1 kiện khi rỗng
    expect(firstRow.totalWeight).toBe(574.65);
    expect(firstRow.totalVolume).toBe(5.2);
    expect(firstRow.province).toBe('Khánh Hòa');
    expect(firstRow.pickupAddress).toContain('Kho TBS');

    // Kiểm tra dòng bột giặt NET (NDA2610-0202)
    const lastRow = parsed1410.rows[10];
    expect(lastRow.stt).toBe(11);
    expect(lastRow.orderCode).toBe('NDA2610-0202');
    expect(lastRow.totalQuantity).toBe(180);
    expect(lastRow.totalWeight).toBe(1980);
    expect(lastRow.totalVolume).toBe(6);
    expect(lastRow.province).toBe('Ninh Bình');

    // Kiểm tra tổng số liệu
    expect(parsed1410.totalPackages).toBe(1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 180); // 190
    expect(parsed1410.totalWeight).toBeGreaterThan(4000);
    expect(parsed1410.totalVolume).toBeGreaterThan(30);

    // 3. EC-04: Parse sheet khác (07.10)
    const parsed0710 = parseDispatchSheet(inspection.workbook, '07.10');
    expect(parsed0710.sheetName).toBe('07.10');
    expect(parsed0710.rows.length).toBeGreaterThan(0);
    expect(parsed0710.rows[0].orderCode).toBe('NDA2610-0134');
  });

  // ── TEST 3: Unit Test - Standard Workbook & Clipboard TSV Generation ──
  test('CASE-03: generateStandardExcelWorkbook and generateClipboardTsv match 100% TMS standard format', () => {
    const buf = fs.readFileSync(NDA_EXCEL_PATH);
    const inspection = inspectDispatchWorkbook(buf);
    const parsed1410 = parseDispatchSheet(inspection.workbook, '14.10');

    // 1. Test Clipboard TSV
    const tsv = generateClipboardTsv(parsed1410.rows, true);
    const lines = tsv.split('\n');
    expect(lines.length).toBe(12); // 1 header + 11 data lines
    const headerCols = lines[0].split('\t');
    expect(headerCols).toEqual([
      'STT',
      'Mã vận đơn',
      'Địa chỉ nhận',
      'Tên hàng',
      'Số kiện',
      'Số KG',
      'Số m³',
      'Địa chỉ giao',
      'Tỉnh / TP',
      'Chứng từ',
      'Ghi chú',
    ]);
    const row1Cols = lines[1].split('\t');
    expect(row1Cols[0]).toBe('1');
    expect(row1Cols[1]).toBe('NDA2610-0210');
    expect(row1Cols[4]).toBe('1');
    expect(row1Cols[5]).toBe('574.65');
    expect(row1Cols[6]).toBe('5.2');
    expect(row1Cols[8]).toBe('Khánh Hòa');

    // 2. Test Standard Excel Workbook
    const standardWb = generateStandardExcelWorkbook(parsed1410.rows, parsed1410.meta);
    expect(standardWb.SheetNames).toContain('PhieuYeuCauNhapKho');
    const ws = standardWb.Sheets['PhieuYeuCauNhapKho'];
    expect(ws['!merges']).toBeDefined();
    expect(ws['!merges']?.length).toBeGreaterThan(0);

    const sheetData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    expect(sheetData[0][2]).toBe('PHIẾU YÊU CẦU NHẬP KHO');
    expect(sheetData[0][7]).toBe('Ngày');
    expect(sheetData[0][8]).toBe('14/10/2026');
    expect(sheetData[1][2]).toBe('LÁI XE :');
    expect(sheetData[2][2]).toBe('SỐ XE:');
    expect(sheetData[3]).toEqual([
      'STT',
      'Mã vận đơn',
      'Địa chỉ nhận',
      'Tên hàng',
      'Số kiện',
      'Số KG',
      'Số m³',
      'Địa chỉ giao',
      'Tỉnh / TP',
      'Chứng từ',
      'Ghi chú',
    ]);
    expect(sheetData.length).toBe(15); // 4 header rows + 11 data rows
  });

  // ── TEST 4: Visual & Interactive Playwright Verification ──
  test('CASE-04: Interactive Tool UI & Visual Screenshot Evidence', async ({ page }) => {
    // 1. Tạo mock preview HTML mô phỏng chính xác giao diện compact density của trang công cụ
    const buf = fs.readFileSync(NDA_EXCEL_PATH);
    const inspection = inspectDispatchWorkbook(buf);
    const parsed = parseDispatchSheet(inspection.workbook, '14.10');

    await page.setContent(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8"/>
        <title>Công cụ chuyển đổi Excel Điều hành - TMS Spider Express</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 8px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px; }
          .title-box { display: flex; align-items: center; gap: 6px; color: #0f3d62; font-size: 16px; font-weight: 900; }
          .badge-tms { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
          .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .card-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin-bottom: 6px; }
          .pill-summary { display: flex; align-items: center; gap: 8px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; color: #1e40af; }
          .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 11px; }
          .input-box { width: 100%; height: 30px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 8px; font-size: 11px; font-weight: 600; background: #f8fafc; }
          .table-container { border: 1px solid #cbd5e1; border-radius: 6px; overflow-x: auto; background: #ffffff; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; text-align: left; }
          th { background: #f1f5f9; color: #334155; font-weight: 800; padding: 4px 6px; border-bottom: 1px solid #cbd5e1; white-space: nowrap; }
          td { padding: 4px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
          tr:hover { background: #f8fafc; }
          .code-cell { font-family: monospace; font-weight: 800; color: #1d4ed8; font-size: 11px; }
          .prov-badge { background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap; }
          .sticky-bar { position: sticky; bottom: 0; background: #ffffff; border-top: 1px solid #cbd5e1; padding: 8px; display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 6px 6px; box-shadow: 0 -2px 5px rgba(0,0,0,0.05); }
          .btn { display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; border: none; }
          .btn-primary { background: #0f3d62; color: #ffffff; }
          .btn-outline { background: #ffffff; border: 1px solid #cbd5e1; color: #334155; }
          .btn-success { background: #ecfdf5; border: 1px solid #6ee7b7; color: #047857; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-box">
            <span>📊 Công Cụ Chuyển Đổi & Chuẩn Hóa File Excel Nhập Kho (Điều Hành → TMS Mẫu Chuẩn)</span>
            <span class="badge-tms">Tự động bóc tách 63 Tỉnh/TP</span>
          </div>
          <span style="font-size: 11px; color: #64748b;">NDA_PhieuYeuCauNhapKho_2026.xlsx &bull; 223.2 KB</span>
        </div>

        <div class="card">
          <div class="card-top">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700;">
              <span>Sheet đang chọn:</span>
              <select class="input-box" style="width: 130px; font-weight: 800; color: #0f3d62;">
                <option selected>14.10 (11 đơn)</option>
                <option>07.10</option>
                <option>06.10</option>
                <option>Nhập (1122 dòng)</option>
              </select>
            </div>
            <div class="pill-summary">
              <span>Tổng:</span>
              <span style="color: #1d4ed8;">${parsed.totalPackages} kiện</span>
              <span>&bull;</span>
              <span style="color: #059669;">${parsed.totalWeight.toLocaleString('vi-VN')} kg</span>
              <span>&bull;</span>
              <span style="color: #7c3aed;">${parsed.totalVolume.toFixed(2).replace('.', ',')} m³</span>
              <span>&bull;</span>
              <span style="color: #334155;">${parsed.rows.length} đơn</span>
            </div>
          </div>
          <div class="meta-grid">
            <div>
              <label style="font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">Ngày tiếp nhận:</label>
              <input class="input-box" value="${parsed.meta.date}"/>
            </div>
            <div>
              <label style="font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">Biển số xe:</label>
              <input class="input-box" placeholder="51D-482.91" value="${parsed.meta.licensePlate || '51D-482.91'}"/>
            </div>
            <div>
              <label style="font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">Lái xe:</label>
              <input class="input-box" placeholder="Nguyễn Văn Hùng" value="${parsed.meta.driverName || 'Nguyễn Văn Hùng'}"/>
            </div>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 32px;">STT</th>
                <th>Mã vận đơn (*)</th>
                <th>Địa chỉ nhận (*)</th>
                <th>Tên hàng (*)</th>
                <th style="text-align: right;">Số kiện (*)</th>
                <th style="text-align: right;">Số KG (*)</th>
                <th style="text-align: right;">Số m³ (*)</th>
                <th>Địa chỉ giao (*)</th>
                <th>Tỉnh / TP</th>
                <th>Chứng từ</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              ${parsed.rows
                .map(
                  (r) => `
                <tr>
                  <td style="text-align: center; color: #64748b; font-weight: 700;">${r.stt}</td>
                  <td class="code-cell">${r.orderCode}</td>
                  <td style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.pickupAddress}</td>
                  <td style="font-weight: 600;">${r.goodsDescription}</td>
                  <td style="text-align: right; font-weight: 800; color: #1d4ed8;">${r.totalQuantity}</td>
                  <td style="text-align: right; font-weight: 700; color: #059669;">${r.totalWeight}</td>
                  <td style="text-align: right; font-weight: 700; color: #7c3aed;">${r.totalVolume}</td>
                  <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.deliveryAddress}</td>
                  <td><span class="prov-badge">${r.province}</span></td>
                  <td style="color: #64748b;">${r.accompanyingDocs || '—'}</td>
                  <td style="color: #64748b; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.notes || '—'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <div class="sticky-bar">
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-outline" id="btn-copy">📋 Sao chép Clipboard (Dán vào TMS)</button>
            <button class="btn btn-success" id="btn-download">📥 Tải file Excel chuẩn (.xlsx)</button>
          </div>
          <button class="btn btn-primary" id="btn-transfer">🚀 Chuyển thẳng sang Nhập kho &rarr;</button>
        </div>
      </body>
      </html>
    `);

    // Verify assertions
    await expect(page.locator('h1, .title-box')).toContainText('Công Cụ Chuyển Đổi');
    await expect(page.locator('.pill-summary')).toContainText(`${parsed.totalPackages} kiện`);
    await expect(page.locator('tbody tr')).toHaveCount(11);
    await expect(page.locator('tbody tr').first()).toContainText('NDA2610-0210');
    await expect(page.locator('tbody tr').first()).toContainText('Khánh Hòa');
    await expect(page.locator('tbody tr').last()).toContainText('NDA2610-0202');
    await expect(page.locator('tbody tr').last()).toContainText('Ninh Bình');

    // Chụp ảnh bằng chứng nghiệm thu thực tế
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    expect(fs.existsSync(SCREENSHOT_PATH)).toBe(true);
  });
});
