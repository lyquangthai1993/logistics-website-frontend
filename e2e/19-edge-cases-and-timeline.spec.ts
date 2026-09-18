import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, clearSession } from './helpers/auth';

const SCREENSHOT_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/3710b55d-f3f5-4c7e-8148-ec8b1cb3395f/screenshots';
const ARTIFACT_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/3710b55d-f3f5-4c7e-8148-ec8b1cb3395f';
const FEEDBACK_DIR = 'd:/Projects/logistics-website/feedback_17_8/test-screenshots';

const WAREHOUSE_USER = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

async function captureEvidence(pageOrLocator: any, filename: string, options?: any) {
  const p1 = path.join(SCREENSHOT_DIR, filename);
  const p2 = path.join(FEEDBACK_DIR, filename);
  const p3 = path.join(ARTIFACT_DIR, filename);
  
  [SCREENSHOT_DIR, FEEDBACK_DIR, ARTIFACT_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  await pageOrLocator.screenshot({ path: p1, ...options });
  fs.copyFileSync(p1, p2);
  fs.copyFileSync(p1, p3);
  console.log('[EVIDENCE SAVED TO ALL 3 PATHS]: ' + filename);
}

test.describe('Edge Cases & Inventory Tracking Timeline Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Edge Case 1 & 2: Over-export blocking (422) and Partial Outbound Lifecycle', async ({ page, request }) => {
    // 1. Obtain JWT token for warehouse manager
    const loginRes = await request.post('http://localhost:4001/api/v1/auth/email/login', {
      data: {
        email: WAREHOUSE_USER.email,
        password: WAREHOUSE_USER.password,
      },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const token = loginData.token || loginData.data?.token || loginData.accessToken;

    // EDGE CASE 1: Thử xuất 60 kiện khi tồn kho chỉ có 50 kiện -> Phải chặn 422
    const overExportRes = await request.post('http://localhost:4001/api/v1/warehouse/outbound/confirm', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        orderIds: [101],
        items: [{ orderId: 101, quantityToExport: 60 }],
        licensePlate: '29C-FAIL.01',
        mode: 'CUSTOMER',
      },
    });

    console.log('[EDGE CASE 1: Over-export status]:', overExportRes.status());
    expect(overExportRes.status()).toBe(422);
    const errBody = await overExportRes.json();
    console.log('[EDGE CASE 1: Error message]:', errBody.message);
    expect(errBody.message).toContain('vượt quá tồn kho khả dụng');

    // EDGE CASE 2: Xuất nhỏ giọt đợt 1 (Partial Export: 20 kiện / 50 kiện)
    const partialExportRes = await request.post('http://localhost:4001/api/v1/warehouse/outbound/confirm', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        orderIds: [101],
        items: [{ orderId: 101, quantityToExport: 20 }],
        licensePlate: '29C-999.01',
        driverName: 'Lê Văn Xuất',
        mode: 'TRANSFER',
        destinationHubId: 1,
      },
    });

    console.log('[EDGE CASE 2: Partial export status]:', partialExportRes.status());
    expect(partialExportRes.ok()).toBeTruthy();
    const partialData = await partialExportRes.json();
    const updatedOrder = partialData.orders?.find((o: any) => o.id === 101) || partialData.data?.orders?.[0];
    
    expect(updatedOrder.inboundQuantity).toBe(50);
    expect(updatedOrder.outboundQuantity).toBe(20);
    expect(updatedOrder.remainingQuantity).toBe(30);
    expect(updatedOrder.status).toBe('INBOUND'); // Vẫn còn tồn kho 30 kiện -> giữ LƯU KHO
    console.log('[EDGE CASE 2: Inventory state]:', {
      inbound: updatedOrder.inboundQuantity,
      outbound: updatedOrder.outboundQuantity,
      remaining: updatedOrder.remainingQuantity,
      status: updatedOrder.status,
    });
  });

  test('Edge Case UI: Open Detail Modal & Capture Inventory Tracking & 3-Leg Timeline', async ({ page }) => {
    // Đăng nhập vào giao diện
    await loginAs(page, WAREHOUSE_USER);
    await page.goto('/dashboard/warehouse/orders');
    await page.waitForLoadState('networkidle');

    // Tìm dòng đơn hàng ORD-HYN-001 trong bảng
    const orderRow = page.locator('tbody tr:has-text("ORD-HYN-001")').first();
    await expect(orderRow).toBeVisible();

    // Click xem chi tiết đơn hàng
    await orderRow.click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // 1. Kiểm tra tiêu đề khối Tiến trình vận chuyển & Tồn kho
    const trackingHeader = modal.locator('text=Tiến trình vận chuyển & Tồn kho');
    await expect(trackingHeader).toBeVisible();

    // 2. Kiểm tra Bảng Thống Kê Nhập - Xuất - Tồn Chi Tiết (50 nhập, 20 xuất, 30 tồn)
    await expect(modal.locator('text=Tổng đã nhập')).toBeVisible();
    await expect(modal.locator('text=Tổng đã xuất')).toBeVisible();
    await expect(modal.locator('text=Tồn kho khả dụng')).toBeVisible();
    await expect(modal.locator('text=30').first()).toBeVisible();

    // 3. Kiểm tra Timeline 3 Chặng Xe
    await expect(modal.locator('text=1. Xe nhập kho')).toBeVisible();
    await expect(modal.locator('text=29C-888.88')).toBeVisible();

    await expect(modal.locator('text=2. Trung chuyển liên Hub')).toBeVisible();
    await expect(modal.locator('text=Polaris Hub - Hưng Yên').first()).toBeVisible();

    await expect(modal.locator('text=3. Xe xuất kho')).toBeVisible();
    await expect(modal.locator('text=29C-999.01')).toBeVisible();
    await expect(modal.locator('text=Lê Văn Xuất')).toBeVisible();

    await page.waitForTimeout(500);

    // Chụp hình ảnh thực tế lưu vào cả feedback_17_8 và brain artifacts
    await captureEvidence(page, '07_inventory_tracking_and_timeline_modal.png');
    await captureEvidence(page, '05_waybill_detail_timeline_modal.png');
  });

  test('Edge Case 3 & 4: Full Outbound Drain (Remaining 0) and Zero-Stock Rejection', async ({ request }) => {
    const loginRes = await request.post('http://localhost:4001/api/v1/auth/email/login', {
      data: {
        email: WAREHOUSE_USER.email,
        password: WAREHOUSE_USER.password,
      },
    });
    const loginData = await loginRes.json();
    const token = loginData.token || loginData.data?.token || loginData.accessToken;

    // EDGE CASE 3: Xuất vét kho toàn bộ 30 kiện còn lại
    const drainRes = await request.post('http://localhost:4001/api/v1/warehouse/outbound/confirm', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        orderIds: [101],
        items: [{ orderId: 101, quantityToExport: 30 }],
        licensePlate: '51D-888.88',
        driverName: 'Đặng Tuấn Vũ',
        mode: 'CUSTOMER',
      },
    });
    expect(drainRes.ok()).toBeTruthy();
    const drainData = await drainRes.json();
    const orderDrained = drainData.orders?.find((o: any) => o.id === 101) || drainData.data?.orders?.[0];

    expect(orderDrained.inboundQuantity).toBe(50);
    expect(orderDrained.outboundQuantity).toBe(50);
    expect(orderDrained.remainingQuantity).toBe(0);
    expect(orderDrained.status).toBe('COMPLETED_INBOUND'); // ĐÃ XUẤT KHO TOÀN BỘ
    console.log('[EDGE CASE 3: Fully drained order]:', {
      inbound: orderDrained.inboundQuantity,
      outbound: orderDrained.outboundQuantity,
      remaining: orderDrained.remainingQuantity,
      status: orderDrained.status,
    });

    // EDGE CASE 4: Thử xuất tiếp khi tồn kho đã bằng 0 -> Phải bị chặn 422!
    const emptyExportRes = await request.post('http://localhost:4001/api/v1/warehouse/outbound/confirm', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        orderIds: [101],
        items: [{ orderId: 101, quantityToExport: 1 }],
        licensePlate: '51D-FAIL.02',
        mode: 'CUSTOMER',
      },
    });
    console.log('[EDGE CASE 4: Zero-stock rejection status]:', emptyExportRes.status());
    expect(emptyExportRes.status()).toBe(422);
    const emptyErr = await emptyExportRes.json();
    console.log('[EDGE CASE 4: Error message]:', emptyErr.message);
    expect(emptyErr.message).toContain('vượt quá tồn kho khả dụng (0 kiện)');
  });
});
