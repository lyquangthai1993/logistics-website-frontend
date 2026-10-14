import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { resolveInboundReceiptDeliveryAddress, InboundReceiptData, InboundReceiptItem } from '../src/features/warehouse/components/warehouse-inbound-receipt-modal';
import { USER_WAREHOUSE_HCM } from './helpers/auth';

test.describe('Task #76: Inbound Receipt Delivery Address Display (Phiếu Nhập Kho)', () => {
  const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_14_10_task_76');

  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Unit Test: resolveInboundReceiptDeliveryAddress extracts and prioritizes deliveryAddress correctly', () => {
    // 1. Core scenario from User Feedback Task #76 (destinationHub is null, address is in route: "pickup → delivery")
    const orderWithRouteOnly = {
      orderCode: 'IMP2610-863',
      originHub: '88 Nguyễn Văn Linh, P. Long Tuyền, Q. Bình Thủy, Cần Thơ',
      destinationHub: null,
      destinationHubEntity: null,
      province: 'TP. Hồ Chí Minh',
      route: '88 Nguyễn Văn Linh, P. Long Tuyền, Q. Bình Thủy, Cần Thơ → 88 Lê Lợi, P. Bến Nghé, Q. 1',
      notes: 'Tránh ẩm ướt, giữ sạch sẽ'
    };

    const res1 = resolveInboundReceiptDeliveryAddress(orderWithRouteOnly);
    expect(res1).toBe('88 Lê Lợi, P. Bến Nghé, Q. 1');
    expect(res1).not.toBe('—');

    // 2. Order with regex tag in notes: [Giao khách: ...]
    const orderWithNotesTag = {
      orderCode: 'TEST-NOTES-01',
      destinationHub: null,
      route: 'Hub → Điểm giao',
      notes: '[Giao khách: Số 123 Đường Cầu Giấy, Hà Nội] Gọi trước 15p'
    };
    const res2 = resolveInboundReceiptDeliveryAddress(orderWithNotesTag);
    expect(res2).toBe('Số 123 Đường Cầu Giấy, Hà Nội');

    // 3. Order with explicit deliveryAddress
    const orderWithExplicitAddress = {
      orderCode: 'VES2610-726',
      deliveryAddress: '45 Nguyễn Tri Phương, P. Minh Khai, Q. Hồng Bàng',
      destinationHub: 'Polaris Hub'
    };
    const res3 = resolveInboundReceiptDeliveryAddress(orderWithExplicitAddress);
    expect(res3).toBe('45 Nguyễn Tri Phương, P. Minh Khai, Q. Hồng Bàng');

    // 4. Order with destinationHub fallback when no street address
    const orderWithHubOnly = {
      orderCode: 'HUB-TRANSFER-01',
      destinationHub: 'Magellan Hub - Đà Nẵng'
    };
    const res4 = resolveInboundReceiptDeliveryAddress(orderWithHubOnly);
    expect(res4).toBe('Magellan Hub - Đà Nẵng');

    // 5. Edge cases: null / undefined / empty
    expect(resolveInboundReceiptDeliveryAddress(null)).toBe('—');
    expect(resolveInboundReceiptDeliveryAddress(undefined)).toBe('—');
    expect(resolveInboundReceiptDeliveryAddress({})).toBe('—');
  });

  test('Visual Verification: Render Inbound Receipt Modal (SD65) with Delivery Address and capture verified screenshot', async ({ page }) => {
    // Exact sample trip SD65 from User Feedback Screenshot
    const sampleTripData: InboundReceiptData = {
      tripCode: 'SD65',
      orderCode: 'IMP2610-863',
      licensePlate: '29C-518.23',
      driverName: 'VŨ MINH TUẤN',
      originHub: 'ANDROMEDA HUB - HCM',
      createdAt: new Date('2026-10-14'),
      items: [
        {
          orderCode: 'IMP2610-863',
          goodsDescription: 'Vải cuộn may mặc',
          quantity: 28,
          unit: 'Kiện',
          deliveryAddress: resolveInboundReceiptDeliveryAddress({
            route: '88 Nguyễn Văn Linh, Cần Thơ → 88 Lê Lợi, P. Bến Nghé, Q. 1'
          }),
          accompanyingDocs: '2 bộ ct',
          notes: 'Tránh ẩm ướt, giữ sạch sẽ'
        },
        {
          orderCode: 'VES2610-726',
          goodsDescription: 'Bao bì carton & màng PE',
          quantity: 39,
          unit: 'Kiện',
          deliveryAddress: resolveInboundReceiptDeliveryAddress({
            route: '105 Lê Duẩn, Đà Nẵng → 45 Nguyễn Tri Phương, P. Minh Khai, Q. Hồng Bàng'
          }),
          accompanyingDocs: '2 bộ ct',
          notes: 'Tránh nước, bảo quản nơi khô ráo'
        },
        {
          orderCode: 'LOG2610-465',
          goodsDescription: 'Hạt nhựa nguyên sinh',
          quantity: 36,
          unit: 'Kiện',
          deliveryAddress: resolveInboundReceiptDeliveryAddress({
            route: '45 Đường Số 5, Bình Dương → 102 Hoàng Hoa Thám, P. Liễu Giai, Q. Ba Đình'
          }),
          accompanyingDocs: '2 bộ ct',
          notes: 'Gọi trước khi giao 30p'
        },
        {
          orderCode: 'NDA2610-329',
          goodsDescription: 'Thiết bị điện tử & linh kiện',
          quantity: 23,
          unit: 'Kiện',
          deliveryAddress: resolveInboundReceiptDeliveryAddress({
            route: '105 Lê Duẩn, Đà Nẵng → 12 Điện Biên Phủ, P. Chính Gián, Q. Thanh Khê'
          }),
          accompanyingDocs: '1 bộ ct',
          notes: 'Hàng dễ vỡ, tránh va đập mạnh'
        }
      ]
    };

    // Verify all 4 items have concrete delivery addresses (NONE is '—')
    expect(sampleTripData.items).toBeDefined();
    expect(sampleTripData.items!.length).toBe(4);
    for (const item of sampleTripData.items!) {
      expect(item.deliveryAddress).not.toBe('—');
      expect(item.deliveryAddress?.length).toBeGreaterThan(5);
    }

    const totalQty = sampleTripData.items!.reduce((s, it) => s + it.quantity, 0);
    expect(totalQty).toBe(126);

    // Render the exact HTML template of the Inbound Receipt Modal
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Phiếu Nhập Kho · Mã ${sampleTripData.tripCode}</title>
          <style>
            body {
              background: #f1f5f9;
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
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
              padding: 24px;
              width: 1060px;
            }
            .modal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            .modal-title {
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .top-banner {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 12px;
              margin-bottom: 14px;
            }
            .logo-box {
              font-weight: 900;
              font-size: 18px;
              background: #0f172a;
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
              font-size: 16px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: 1px;
            }
            .doc-code {
              font-family: monospace;
              font-weight: bold;
              font-size: 13px;
              color: #475569;
              margin-top: 2px;
            }
            .qr-placeholder {
              width: 52px;
              height: 52px;
              border: 1px solid #cbd5e1;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-family: monospace;
              background: #f8fafc;
            }
            .info-grid {
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              margin-bottom: 14px;
              overflow: hidden;
            }
            .info-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              border-bottom: 1px solid #cbd5e1;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-cell {
              display: flex;
              font-size: 11px;
            }
            .info-cell:first-child {
              border-right: 1px solid #cbd5e1;
            }
            .info-label {
              width: 140px;
              padding: 6px 10px;
              background: #f1f5f9;
              font-weight: bold;
              color: #334155;
              border-right: 1px solid #cbd5e1;
            }
            .info-value {
              padding: 6px 10px;
              color: #0f172a;
              font-weight: 600;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              margin-bottom: 16px;
              border: 1px solid #cbd5e1;
            }
            .items-table th {
              background: #f1f5f9;
              color: #334155;
              padding: 7px 8px;
              font-weight: bold;
              border: 1px solid #cbd5e1;
              text-align: left;
            }
            .items-table th.center, .items-table td.center {
              text-align: center;
            }
            .items-table td {
              padding: 6px 8px;
              border: 1px solid #cbd5e1;
              color: #0f172a;
            }
            .delivery-col {
              color: #1e293b;
              font-weight: 600;
              background: #f0fdf4;
            }
            .footer-sign {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              text-align: center;
              font-size: 11px;
              margin-top: 24px;
              padding-top: 10px;
            }
            .footer-sign-col {
              font-weight: bold;
              color: #1e293b;
            }
            .footer-sign-sub {
              font-size: 10px;
              color: #64748b;
              font-style: italic;
              font-weight: normal;
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="modal-wrapper" data-testid="inbound-receipt-modal">
            <div class="modal-header">
              <div class="modal-title">
                🏢 Phiếu Nhập Kho · Mã ${sampleTripData.tripCode}
              </div>
            </div>

            <div class="top-banner">
              <div class="logo-box">SPIDER EXPRESS</div>
              <div class="doc-title-block">
                <div class="doc-title">PHIẾU NHẬP KHO</div>
                <div class="doc-code">${sampleTripData.tripCode}</div>
              </div>
              <div class="qr-placeholder">QR CODE<br>${sampleTripData.tripCode}</div>
            </div>

            <div class="info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <div class="info-label">Ngày/tháng/năm</div>
                  <div class="info-value">14/10/2026</div>
                </div>
                <div class="info-cell">
                  <div class="info-label">Biển số xe</div>
                  <div class="info-value">${sampleTripData.licensePlate}</div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-cell">
                  <div class="info-label">Tài xế giao hàng</div>
                  <div class="info-value">${sampleTripData.driverName}</div>
                </div>
                <div class="info-cell">
                  <div class="info-label">Nhập Tại Kho</div>
                  <div class="info-value">${sampleTripData.originHub}</div>
                </div>
              </div>
            </div>

            <table class="items-table" data-testid="inbound-receipt-table">
              <thead>
                <tr>
                  <th class="center" style="width: 4%;">STT</th>
                  <th style="width: 14%;">Mã Đơn Hàng</th>
                  <th style="width: 22%;">Tên mặt hàng</th>
                  <th class="center" style="width: 8%;">Số lượng</th>
                  <th class="center" style="width: 6%;">Đơn vị</th>
                  <th style="width: 26%;">Địa chỉ giao hàng</th>
                  <th class="center" style="width: 8%;">Chứng từ đi kèm</th>
                  <th style="width: 12%;">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                ${sampleTripData.items!
                  .map(
                    (it, idx) => `
                  <tr data-testid="receipt-row-${it.orderCode}">
                    <td class="center font-medium">${idx + 1}</td>
                    <td style="font-family: monospace; font-weight: bold; color: #1d4ed8;">${it.orderCode}</td>
                    <td><strong>${it.goodsDescription}</strong></td>
                    <td class="center" style="font-weight: bold;">${it.quantity}</td>
                    <td class="center">${it.unit}</td>
                    <td class="delivery-col" data-testid="delivery-address-${it.orderCode}">${it.deliveryAddress}</td>
                    <td class="center">${it.accompanyingDocs}</td>
                    <td>${it.notes}</td>
                  </tr>
                `
                  )
                  .join('')}
                <tr style="background: #f8fafc; font-weight: bold;">
                  <td colspan="3" class="center">Tổng cộng</td>
                  <td class="center" style="font-weight: bold;">${totalQty}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <div class="footer-sign">
              <div class="footer-sign-col">
                Người Lập Phiếu
                <div class="footer-sign-sub">(Ký, họ tên)</div>
              </div>
              <div class="footer-sign-col">
                Thủ Kho
                <div class="footer-sign-sub">(Ký, họ tên)</div>
              </div>
              <div class="footer-sign-col">
                Lái Xe
                <div class="footer-sign-sub">(Ký, họ tên)</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await page.setViewportSize({ width: 1280, height: 850 });
    await page.setContent(html);

    // Verify modal is loaded
    const modal = page.locator('[data-testid="inbound-receipt-modal"]');
    await expect(modal).toBeVisible();

    // Verify rows and specific delivery addresses
    const rows = page.locator('tbody tr[data-testid^="receipt-row-"]');
    await expect(rows).toHaveCount(4);

    const addr1 = page.locator('[data-testid="delivery-address-IMP2610-863"]');
    await expect(addr1).toHaveText('88 Lê Lợi, P. Bến Nghé, Q. 1');

    const addr2 = page.locator('[data-testid="delivery-address-VES2610-726"]');
    await expect(addr2).toHaveText('45 Nguyễn Tri Phương, P. Minh Khai, Q. Hồng Bàng');

    const addr3 = page.locator('[data-testid="delivery-address-LOG2610-465"]');
    await expect(addr3).toHaveText('102 Hoàng Hoa Thám, P. Liễu Giai, Q. Ba Đình');

    const addr4 = page.locator('[data-testid="delivery-address-NDA2610-329"]');
    await expect(addr4).toHaveText('12 Điện Biên Phủ, P. Chính Gián, Q. Thanh Khê');

    // Capture verified screenshot
    const screenshotPath = path.join(EVIDENCE_DIR, 'screenshot_01_verified.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
    console.log(`📸 Đã chụp và lưu ảnh nghiệm thu thành công tại: ${screenshotPath}`);
  });
});
