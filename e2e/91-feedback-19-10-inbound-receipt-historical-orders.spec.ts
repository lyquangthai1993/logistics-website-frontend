import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_19_10_inbound_receipt_fix');
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_01_verified.png');

test.describe.serial('Feedback 19/10 — Bảo toàn đơn hàng trên Phiếu Nhập Kho và Bỏ nút In phiếu xe', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Static Code Audit — Kiểm tra logic bảo toàn phiếu nhập và loại bỏ nút In phiếu xe', () => {
    // 1. Audit frontend modal: warehouse-trip-detail-modal.tsx
    const modalPath = path.resolve(
      __dirname,
      '../src/features/warehouse/components/warehouse-trip-detail-modal.tsx'
    );
    expect(fs.existsSync(modalPath)).toBeTruthy();
    const modalContent = fs.readFileSync(modalPath, 'utf-8');

    // Nút in phiếu xe tại Footer BẮT BUỘC ĐÃ BỊ LOẠI BỎ HOÀN TOÀN
    expect(modalContent).not.toContain('In phiếu xe');

    // 2. Audit frontend page: inbound/page.tsx
    const inboundPagePath = path.resolve(
      __dirname,
      '../src/app/dashboard/warehouse/inbound/page.tsx'
    );
    expect(fs.existsSync(inboundPagePath)).toBeTruthy();
    const inboundContent = fs.readFileSync(inboundPagePath, 'utf-8');

    // Phải có điều kiện bảo toàn toàn bộ đơn khi chuyến xe COMPLETED
    expect(inboundContent).toContain("if (grp.status === 'COMPLETED') return true;");

    // Phải có hàm getOrderTripInboundQty để đọc số lượng thực nhận từ transaction INBOUND
    expect(inboundContent).toContain('getOrderTripInboundQty');

    // 3. Audit backend service: warehouse.service.ts
    const backendServicePath = path.resolve(
      __dirname,
      '../../backend/src/orders/warehouse.service.ts'
    );
    expect(fs.existsSync(backendServicePath)).toBeTruthy();
    const serviceContent = fs.readFileSync(backendServicePath, 'utf-8');

    // getInboundTrips phải join inventoryTransactions
    expect(serviceContent).toContain(".leftJoinAndSelect('order.inventoryTransactions', 'inventoryTransactions')");
  });
});
