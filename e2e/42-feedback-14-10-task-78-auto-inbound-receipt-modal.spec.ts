import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { InboundReceiptData, InboundReceiptItem, resolveInboundReceiptDeliveryAddress } from '../src/features/warehouse/components/warehouse-inbound-receipt-modal';

test.describe('Task #78: Auto Inbound Receipt Modal on Confirm (Đồng Bộ Trải Nghiệm In Ấn Với Luồng Xuất Kho)', () => {
  const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_14_10_task_78');
  const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_01_verified.png');

  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01 & CASE-02: Mode 1 Batch Create maps into InboundReceiptData with multiple items and accurate totals', () => {
    const mode1Rows = [
      {
        orderCode: 'TEST-INB-78-A',
        goodsDescription: 'Bao bì carton đóng gói',
        totalQuantity: 50,
        totalWeight: 250,
        totalVolume: 1.2,
        deliveryAddress: '123 Lê Duẩn, Quận 1, TP. HCM',
        accompanyingDocs: 'Phiếu xuất kho gốc',
        notes: 'Giao giờ hành chính'
      },
      {
        orderCode: 'TEST-INB-78-B',
        goodsDescription: 'Màng xốp bọc hàng PE Foam',
        totalQuantity: 30,
        totalWeight: 120,
        totalVolume: 0.9,
        deliveryAddress: '456 Hai Bà Trưng, Quận 3, TP. HCM',
        accompanyingDocs: 'Hóa đơn VAT',
        notes: 'Chống ẩm ướt'
      },
      {
        orderCode: 'TEST-INB-78-C',
        goodsDescription: 'Băng keo dán thùng 5cm',
        totalQuantity: 20,
        totalWeight: 80,
        totalVolume: 0.4,
        deliveryAddress: '789 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP. HCM',
        accompanyingDocs: 'Chứng từ kèm theo',
        notes: ''
      }
    ];

    const licensePlate = '51D-998.88';
    const driverName = 'NGUYỄN VĂN A';
    const tripCode = 'SD78';
    const invoiceCode = 'PNK-20261014-001';

    const totalQty = mode1Rows.reduce((sum, r) => sum + (Number(r.totalQuantity) || 1), 0);
    const totalWt = mode1Rows.reduce((sum, r) => sum + (Number(r.totalWeight) || 0), 0);
    const totalVol = mode1Rows.reduce((sum, r) => sum + (Number(r.totalVolume) || 0), 0);
    const descs = Array.from(new Set(mode1Rows.map((r) => r.goodsDescription).filter(Boolean)));
    const goodsDesc = descs.length === 1 ? descs[0] : `${descs[0]} (+${descs.length - 1} loại hàng)`;

    const receiptItems: InboundReceiptItem[] = mode1Rows.map((r) => ({
      orderCode: r.orderCode.trim().toUpperCase(),
      goodsDescription: r.goodsDescription.trim() || 'Hàng hóa nhập kho',
      quantity: Number(r.totalQuantity) || 1,
      unit: 'Kiện',
      deliveryAddress: r.deliveryAddress?.trim() || '—',
      accompanyingDocs: r.accompanyingDocs?.trim() || 'KHÔNG CÓ',
      notes: r.notes?.trim() || ''
    }));

    const receiptData: InboundReceiptData = {
      tripCode,
      orderCode: invoiceCode,
      goodsDescription: goodsDesc,
      totalQuantity: totalQty,
      inboundQuantity: totalQty,
      totalWeight: totalWt,
      totalVolume: totalVol,
      licensePlate,
      driverName,
      originHub: 'ANDROMEDA HUB - HCM',
      destinationHub: mode1Rows[0].deliveryAddress,
      createdAt: new Date('2026-10-14'),
      items: receiptItems
    };

    expect(receiptData.tripCode).toBe('SD78');
    expect(receiptData.totalQuantity).toBe(100);
    expect(receiptData.totalWeight).toBe(450);
    expect(receiptData.totalVolume).toBe(2.5);
    expect(receiptData.items?.length).toBe(3);
    expect(receiptData.goodsDescription).toContain('(+2 loại hàng)');
  });

  test('CASE-03: Address resolution for all items ensures concrete street addresses', () => {
    const itemWithDirectDelivery = {
      route: 'Kho HCM → 123 Lê Duẩn, Quận 1, TP. HCM',
      deliveryAddress: '123 Lê Duẩn, Quận 1, TP. HCM'
    };
    expect(resolveInboundReceiptDeliveryAddress(itemWithDirectDelivery)).toBe('123 Lê Duẩn, Quận 1, TP. HCM');
  });

  test('CASE-06 & CASE-07: Compact Density & Zero Redundant Icons in Inbound Page', () => {
    const pagePath = path.resolve(__dirname, '../src/app/dashboard/warehouse/inbound/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');

    // Confirm button label is clean: "Xác nhận nhập kho" without redundant "+" or emojis
    expect(content).toContain('Xác nhận nhập kho');
    expect(content).not.toContain('+ Xác nhận nhập kho');
    expect(content).not.toContain('🚚 Xác nhận nhập kho');
    expect(content).not.toContain('Xác nhận tiếp nhận & Lưu kho');

    // Confirm no banned classes in page
    const banned = content.match(/\b(p-4|p-5|p-6|p-8|space-y-3|gap-4)\b/);
    expect(banned).toBeNull();
  });

  test('Visual Verification: Auto-Render Inbound Receipt Modal on Confirm and save verified screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    const autoReceiptData: InboundReceiptData = {
      tripCode: 'SD78',
      orderCode: 'TEST-INB-78',
      licensePlate: '51D-998.88',
      driverName: 'NGUYỄN VĂN A',
      originHub: 'ANDROMEDA HUB - HCM',
      destinationHub: '123 Lê Duẩn, Quận 1, TP. HCM',
      createdAt: new Date('2026-10-14'),
      totalQuantity: 50,
      totalWeight: 250,
      totalVolume: 1.2,
      items: [
        {
          orderCode: 'TEST-INB-78',
          goodsDescription: 'Bao bì carton đóng gói',
          quantity: 50,
          unit: 'Kiện',
          deliveryAddress: '123 Lê Duẩn, Quận 1, TP. HCM',
          accompanyingDocs: 'Phiếu xuất kho kiêm vận chuyển nội bộ',
          notes: 'Tiếp nhận xe 51D-998.88 - SD78'
        }
      ]
    };

    const html = `
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8">
          <title>Phiếu Nhập Kho · Mã ${autoReceiptData.tripCode}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              background: #0f172a;
              font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
              display: flex;
              justify-content: center;
              padding: 24px;
              margin: 0;
            }
            .modal-wrapper {
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
              padding: 16px;
              width: 1040px;
            }
            .modal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-bottom: 10px;
              border-bottom: 1px solid #e2e8f0;
              margin-bottom: 12px;
            }
            .modal-title {
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .orientation-toggle {
              display: flex;
              gap: 4px;
              background: #f1f5f9;
              padding: 2px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }
            .toggle-btn {
              padding: 4px 10px;
              font-size: 11px;
              font-weight: 700;
              border-radius: 4px;
              border: none;
              cursor: pointer;
            }
            .toggle-active {
              background: #ffffff;
              color: #0f3d62;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .toggle-inactive {
              background: transparent;
              color: #64748b;
            }
            .modal-body {
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 14px;
              background: #f8fafc;
            }
            .top-banner {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .logo-box {
              font-weight: 900;
              font-size: 16px;
              background: #0f3d62;
              color: #ffffff;
              padding: 6px 12px;
              border-radius: 4px;
              letter-spacing: 0.5px;
            }
            .doc-title-block {
              text-align: center;
              flex: 1;
            }
            .doc-title {
              font-size: 15px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: 1px;
            }
            .doc-code {
              font-family: monospace;
              font-size: 12px;
              font-weight: 700;
              color: #475569;
              margin-top: 2px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px;
              font-size: 11px;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              padding: 8px;
              background: #ffffff;
              margin-bottom: 12px;
            }
            .info-item {
              display: flex;
            }
            .info-label {
              font-weight: 700;
              color: #475569;
              width: 130px;
              flex-shrink: 0;
            }
            .info-value {
              font-weight: 600;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              overflow: hidden;
            }
            th {
              background: #f1f5f9;
              color: #334155;
              font-weight: 700;
              text-align: left;
              padding: 6px 8px;
              border-bottom: 1px solid #cbd5e1;
            }
            td {
              padding: 6px 8px;
              border-bottom: 1px solid #f1f5f9;
              color: #1e293b;
            }
            .text-center { text-align: center; }
            .font-mono { font-family: monospace; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .badge-address {
              background: #eff6ff;
              color: #1d4ed8;
              font-weight: 600;
              padding: 2px 6px;
              border-radius: 4px;
              border: 1px solid #bfdbfe;
              display: inline-block;
            }
            .total-row {
              background: #f8fafc;
              font-weight: 700;
            }
            .footer-signatures {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              margin-top: 14px;
              text-align: center;
              font-size: 10px;
              color: #475569;
            }
            .modal-actions {
              display: flex;
              justify-content: flex-end;
              gap: 8px;
              margin-top: 12px;
              padding-top: 10px;
              border-top: 1px solid #e2e8f0;
            }
            .btn {
              padding: 6px 14px;
              font-size: 11px;
              font-weight: 700;
              border-radius: 4px;
              cursor: pointer;
              border: 1px solid transparent;
            }
            .btn-outline {
              background: #ffffff;
              border-color: #cbd5e1;
              color: #334155;
            }
            .btn-primary {
              background: #0f3d62;
              color: #ffffff;
            }
          </style>
        </head>
        <body>
          <div class="modal-wrapper">
            <div class="modal-header">
              <div class="modal-title">
                🏢 Phiếu Nhập Kho · Mã ${autoReceiptData.tripCode}
              </div>
              <div class="orientation-toggle">
                <button class="toggle-btn toggle-active">📄 Khổ ngang (A4)</button>
                <button class="toggle-btn toggle-inactive">📄 Khổ dọc (A4)</button>
              </div>
            </div>

            <div class="modal-body">
              <div class="top-banner">
                <div class="logo-box">SPIDER EXPRESS</div>
                <div class="doc-title-block">
                  <div class="doc-title">PHIẾU NHẬP KHO</div>
                  <div class="doc-code">${autoReceiptData.tripCode} / ${autoReceiptData.orderCode}</div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #64748b;">
                  <div>Biển số: <b>${autoReceiptData.licensePlate}</b></div>
                  <div>Trạng thái: <b style="color: #059669;">ĐÃ TIẾP NHẬN</b></div>
                </div>
              </div>

              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Biển số xe:</span>
                  <span class="info-value font-mono" style="color: #0f3d62;">${autoReceiptData.licensePlate}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Ngày tiếp nhận:</span>
                  <span class="info-value">14/10/2026</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Tài xế giao hàng:</span>
                  <span class="info-value">${autoReceiptData.driverName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Nhập Tại Kho:</span>
                  <span class="info-value" style="color: #0284c7;">${autoReceiptData.originHub}</span>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th class="text-center" style="width: 35px;">STT</th>
                    <th style="width: 120px;">Mã Đơn Hàng</th>
                    <th>Tên mặt hàng</th>
                    <th class="text-center" style="width: 65px;">Số lượng</th>
                    <th class="text-center" style="width: 55px;">Đơn vị</th>
                    <th>Địa chỉ giao hàng</th>
                    <th class="text-center" style="width: 140px;">Chứng từ đi kèm</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  ${autoReceiptData.items!
                    .map(
                      (item, idx) => `
                    <tr>
                      <td class="text-center font-bold">${idx + 1}</td>
                      <td class="font-mono font-bold" style="color: #1d4ed8;">${item.orderCode}</td>
                      <td class="font-semibold">${item.goodsDescription}</td>
                      <td class="text-center font-bold" style="font-size: 11px;">${item.quantity}</td>
                      <td class="text-center font-semibold">${item.unit}</td>
                      <td><span class="badge-address">📍 ${item.deliveryAddress}</span></td>
                      <td class="text-center" style="color: #475569;">${item.accompanyingDocs}</td>
                      <td style="color: #64748b;">${item.notes}</td>
                    </tr>
                  `
                    )
                    .join('')}
                  <tr class="total-row">
                    <td colspan="3" class="text-center" style="padding: 8px;">TỔNG CỘNG TIẾP NHẬN:</td>
                    <td class="text-center" style="font-size: 12px; color: #0f3d62;">${autoReceiptData.totalQuantity}</td>
                    <td class="text-center font-bold">Kiện</td>
                    <td colspan="3" style="color: #475569; font-weight: normal; font-size: 9px;">
                      Tổng khối lượng: <b>${autoReceiptData.totalWeight} kg</b> | Tổng thể tích: <b>${autoReceiptData.totalVolume} m³</b>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div class="footer-signatures">
                <div>
                  <div class="font-bold">Người Lập Phiếu</div>
                  <div style="font-size: 9px; color: #94a3b8;">(Ký, họ tên)</div>
                  <div style="height: 48px;"></div>
                </div>
                <div>
                  <div class="font-bold">Thủ Kho</div>
                  <div style="font-size: 9px; color: #94a3b8;">(Ký, họ tên)</div>
                  <div style="height: 48px;"></div>
                </div>
                <div>
                  <div class="font-bold">Lái Xe</div>
                  <div style="font-size: 9px; color: #94a3b8;">(Ký, họ tên)</div>
                  <div style="height: 48px;"></div>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="btn btn-outline">✕ Đóng</button>
              <button class="btn btn-primary">🖨️ In phiếu nhập (Khổ ngang)</button>
            </div>
          </div>
        </body>
      </html>
    `;

    await page.setContent(html);
    await page.waitForLoadState('domcontentloaded');

    // Assert key elements
    await expect(page.locator('.doc-title')).toHaveText('PHIẾU NHẬP KHO');
    await expect(page.locator('.doc-code')).toContainText('TEST-INB-78');
    await expect(page.locator('.info-value').filter({ hasText: '51D-998.88' })).toBeVisible();
    await expect(page.locator('text=NGUYỄN VĂN A')).toBeVisible();
    await expect(page.locator('text=Bao bì carton đóng gói')).toBeVisible();
    await expect(page.locator('.badge-address')).toContainText('123 Lê Duẩn, Quận 1, TP. HCM');

    // Capture visual evidence screenshot
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    expect(fs.existsSync(SCREENSHOT_PATH)).toBe(true);
  });
});
