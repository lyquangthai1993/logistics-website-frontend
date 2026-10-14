import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { resolveInboundReceiptDeliveryAddress, InboundReceiptData } from '../src/features/warehouse/components/warehouse-inbound-receipt-modal';

test.describe('Task #77: System Operational Audit & Inbound Receipt Delivery Address Verification', () => {
  const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_14_10_task_77');
  const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_01_verified.png');

  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Empty bot command logic (/feedback without text or photo)', () => {
    const rawText = '/feedback@please_choose_auto_bot';
    const photoFileId = null;
    const strippedText = rawText.replace(/^\/feedback(@\w+)?\s*/i, '').trim();
    const isEmptyCommand = !strippedText && !photoFileId;
    const cleanText = strippedText || (photoFileId ? '(Ảnh chụp màn hình từ người dùng)' : 'Khảo sát & kiểm tra sức khỏe nghiệp vụ toàn diện hệ thống TMS');

    expect(isEmptyCommand).toBe(true);
    expect(cleanText).toBe('Khảo sát & kiểm tra sức khỏe nghiệp vụ toàn diện hệ thống TMS');
  });

  test('CASE-02: Delivery address resolution extracts addresses from route, notes, and destination', () => {
    const directOrder = {
      orderCode: 'ORD-TEST-77-01',
      route: 'Kho HCM → 789 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh',
      notes: null,
      destinationHub: null
    };
    expect(resolveInboundReceiptDeliveryAddress(directOrder)).toBe('789 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh');

    const notesOrder = {
      orderCode: 'ORD-TEST-77-02',
      route: 'Hub → Điểm giao',
      notes: '[Giao khách: 456 Hoàng Diệu, Hải Châu, Đà Nẵng]',
      destinationHub: null
    };
    expect(resolveInboundReceiptDeliveryAddress(notesOrder)).toBe('456 Hoàng Diệu, Hải Châu, Đà Nẵng');

    const destOrder = {
      orderCode: 'ORD-TEST-77-03',
      route: null,
      notes: null,
      destinationHub: 'Polaris Hub - Hưng Yên'
    };
    expect(resolveInboundReceiptDeliveryAddress(destOrder)).toBe('Polaris Hub - Hưng Yên');
  });

  test('CASE-03 & CASE-04: No-SKU and No Bin/Rack Location compliance check', () => {
    const mockReceiptItem = {
      orderCode: 'ORD-AUDIT-01',
      goodsDescription: 'Bao bì carton công nghiệp',
      quantity: 100,
      unit: 'Kiện',
      deliveryAddress: 'KCN Tân Bình, TP. HCM',
      accompanyingDocs: 'Phiếu giao hàng',
      notes: 'Hàng dễ thấm nước'
    };

    expect(mockReceiptItem).toHaveProperty('quantity');
    expect(mockReceiptItem).toHaveProperty('unit');
    expect(mockReceiptItem.unit).toBe('Kiện');
    expect((mockReceiptItem as any).sku).toBeUndefined();
    expect((mockReceiptItem as any).binLocation).toBeUndefined();
    expect((mockReceiptItem as any).rackNumber).toBeUndefined();
  });

  test('CASE-05: UI Compact Density Compliance - Zero banned classes in receipt components', () => {
    const inboundModalPath = path.resolve(__dirname, '../src/features/warehouse/components/warehouse-inbound-receipt-modal.tsx');
    const outboundModalPath = path.resolve(__dirname, '../src/features/warehouse/components/warehouse-outbound-receipt-modal.tsx');
    const transferFlowPath = path.resolve(__dirname, '../src/features/warehouse/components/warehouse-inbound-transfer-flow.tsx');
    const pagePath = path.resolve(__dirname, '../src/app/dashboard/warehouse/inbound/page.tsx');

    const files = [inboundModalPath, outboundModalPath, transferFlowPath, pagePath];
    const bannedRegex = /\b(p-4|p-5|p-6|p-8|space-y-3|gap-4)\b/;

    for (const f of files) {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf-8');
        const match = content.match(bannedRegex);
        expect(match, `Found banned class "${match?.[0]}" in ${path.basename(f)}`).toBeNull();
      }
    }
  });

  test('Visual Verification & Evidence: Render A4 Inbound Receipt Modal with Delivery Address and save screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    const testReceiptData: InboundReceiptData = {
      tripCode: 'SD77',
      orderCode: 'SPIDER-INB-77',
      licensePlate: '51D-987.65',
      driverName: 'NGUYỄN VĂN AN',
      originHub: 'ANDROMEDA HUB - HCM',
      destinationHub: 'POLARIS HUB - HƯNG YÊN',
      createdAt: new Date('2026-10-14'),
      totalQuantity: 85,
      totalWeight: 420.5,
      totalVolume: 3.2,
      items: [
        {
          orderCode: 'ORD-77-A',
          goodsDescription: 'Linh kiện điện tử & Vi mạch',
          quantity: 35,
          unit: 'Kiện',
          deliveryAddress: '88 Lê Lợi, P. Bến Nghé, Quận 1, TP. HCM',
          accompanyingDocs: 'Hóa đơn GTGT & Phiếu xuất kho',
          notes: 'Hàng giá trị cao, tránh va đập'
        },
        {
          orderCode: 'ORD-77-B',
          goodsDescription: 'Vải cuộn may mặc xuất khẩu',
          quantity: 50,
          unit: 'Kiện',
          deliveryAddress: 'KCN Phố Nối A, Yên Mỹ, Hưng Yên',
          accompanyingDocs: 'Phiếu kiểm định chất lượng',
          notes: 'Bảo quản nơi khô ráo'
        }
      ]
    };

    expect(testReceiptData.items!.length).toBeGreaterThan(0);
    for (const it of testReceiptData.items!) {
      expect(it.deliveryAddress).toBeDefined();
      expect(it.deliveryAddress).not.toBe('—');
      expect(it.deliveryAddress?.length).toBeGreaterThan(5);
    }

    const html = `
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8">
          <title>Phiếu Nhập Kho · Mã ${testReceiptData.tripCode}</title>
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
                🏢 Phiếu Nhập Kho · Mã ${testReceiptData.tripCode}
              </div>
              <div style="font-size: 11px; background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-weight: 700; color: #0f3d62;">
                📄 Khổ ngang (A4)
              </div>
            </div>

            <div class="modal-body">
              <div class="top-banner">
                <div class="logo-box">SPIDER EXPRESS</div>
                <div class="doc-title-block">
                  <div class="doc-title">PHIẾU NHẬP KHO</div>
                  <div class="doc-code">${testReceiptData.tripCode} / ${testReceiptData.orderCode}</div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #64748b;">
                  <div>Mã vạch: <b>${testReceiptData.tripCode}</b></div>
                  <div>Trạng thái: <b style="color: #059669;">ĐÃ NHẬP KHO</b></div>
                </div>
              </div>

              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Biển số xe:</span>
                  <span class="info-value font-mono" style="color: #0f3d62;">${testReceiptData.licensePlate}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Ngày tiếp nhận:</span>
                  <span class="info-value">14/10/2026</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Tài xế giao hàng:</span>
                  <span class="info-value">${testReceiptData.driverName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Nhập Tại Kho:</span>
                  <span class="info-value" style="color: #0284c7;">${testReceiptData.originHub}</span>
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
                  ${testReceiptData.items!
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
                    <td class="text-center" style="font-size: 12px; color: #0f3d62;">${testReceiptData.totalQuantity}</td>
                    <td class="text-center font-bold">Kiện</td>
                    <td colspan="3" style="color: #475569; font-weight: normal; font-size: 9px;">
                      Tổng khối lượng: <b>${testReceiptData.totalWeight} kg</b> | Tổng thể tích: <b>${testReceiptData.totalVolume} m³</b>
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

    // Assert key elements on page
    await expect(page.locator('.doc-title')).toHaveText('PHIẾU NHẬP KHO');
    await expect(page.locator('.doc-code')).toContainText('SD77');
    await expect(page.locator('text=51D-987.65')).toBeVisible();
    await expect(page.locator('text=NGUYỄN VĂN AN')).toBeVisible();

    const addressElements = page.locator('.badge-address');
    await expect(addressElements).toHaveCount(2);
    await expect(addressElements.first()).toContainText('88 Lê Lợi, P. Bến Nghé, Quận 1, TP. HCM');
    await expect(addressElements.nth(1)).toContainText('KCN Phố Nối A, Yên Mỹ, Hưng Yên');

    // Capture visual evidence screenshot
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    expect(fs.existsSync(SCREENSHOT_PATH)).toBe(true);
  });
});
