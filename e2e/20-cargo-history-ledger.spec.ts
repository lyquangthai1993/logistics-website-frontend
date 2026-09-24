import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, clearSession } from './helpers/auth';

const BRAIN_ARTIFACT_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/0324ac1a-aec7-43c3-8f5f-5d89a447fc0c';
const FEEDBACK_DIR = 'd:/Projects/logistics-website/feedback_17_8/test-screenshots';

const WAREHOUSE_USER = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

async function captureEvidence(pageOrLocator: any, filename: string) {
  const p1 = path.join(BRAIN_ARTIFACT_DIR, filename);
  const p2 = path.join(FEEDBACK_DIR, filename);

  [BRAIN_ARTIFACT_DIR, FEEDBACK_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  await pageOrLocator.screenshot({ path: p1 });
  try {
    fs.copyFileSync(p1, p2);
  } catch (e) {
    // Ignore feedback dir copy error if path doesn't exist
  }
  console.log('[EVIDENCE CAPTURED]: ' + p1);
}

test.describe('Cargo History & Inventory Transaction Ledger Progressive Suite', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Progressive Cargo History Lifecycle: Inbound 50 -> Outbound 5 -> Outbound 15 -> Drain 30', async ({ page, request }) => {
    // ── 0. Obtain JWT Auth Token ──
    const loginRes = await request.post('http://localhost:4001/api/v1/auth/email/login', {
      data: {
        email: WAREHOUSE_USER.email,
        password: WAREHOUSE_USER.password,
      },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const token = loginData.token || loginData.data?.token || loginData.accessToken;

    // ── 1. GIAI ĐOẠN 1: Tạo đơn hàng nhập kho ban đầu 50 kiện ──
    const createRes = await request.post('http://localhost:4001/api/v1/warehouse/inbound/quick-create', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        goodsDescription: 'Thùng sơn công nghiệp Kova (Test Ledger)',
        totalQuantity: 50,
        totalWeight: 1200,
        totalVolume: 5.5,
        deliveryAddress: 'Kho đối tác Hoàng Mai, Hà Nội',
        province: 'Hà Nội',
        notes: 'Tiếp nhận nhập kho ban đầu 50 kiện',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const createdOrder = await createRes.json();
    const testOrderId = createdOrder.id || createdOrder.data?.id;
    const testOrderCode = createdOrder.orderCode || createdOrder.data?.orderCode;
    console.log('[STAGE 1: CREATED TEST ORDER]:', { testOrderId, testOrderCode });

    // Login on UI as Warehouse Manager
    await loginAs(page, WAREHOUSE_USER);
    await page.goto('/dashboard/warehouse/orders');
    await page.waitForLoadState('networkidle');

    // Tìm kiếm đơn hàng theo mã
    const searchInput = page.locator('input[placeholder*="Tìm kiếm"]').first();
    await searchInput.fill(testOrderCode);
    await page.waitForTimeout(800);

    const orderRow1 = page.locator(`tr:has-text("${testOrderCode}")`).first();
    await expect(orderRow1).toBeVisible({ timeout: 10000 });

    // Mở Modal chi tiết
    await orderRow1.click();
    await page.waitForTimeout(600);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify Stage 1 UI
    await expect(modal.locator('text=Lịch sử hàng hóa & Biến động kho').first()).toBeVisible();
    await expect(modal.locator('text=Tổng đã nhập').first()).toBeVisible();
    await expect(modal.locator('text=50').first()).toBeVisible();
    await expect(modal.locator('text=Tồn kho khả dụng').first()).toBeVisible();
    await expect(modal.getByText('Tiếp nhận nhập kho ban đầu', { exact: true }).first()).toBeVisible();
    await expect(modal.locator('text=+50 kiện').first()).toBeVisible();
    await expect(modal.locator('text=Tồn sau thao tác: 50 kiện').first()).toBeVisible();

    // CHỤP ẢNH BẰNG CHỨNG GIAI ĐOẠN 1
    await captureEvidence(page, 'evidence_stage_1_initial_inbound_50.png');

    // Đóng modal
    await modal.locator('button:has(svg.tabler-icon-x), button:has(svg.lucide-x), button:has-text("✕")').first().click();
    await page.waitForTimeout(500);

    // ── 2. GIAI ĐOẠN 2: Xuất kho lần 1 (Xuất 5 kiện -> Tồn còn 45) ──
    const export1Res = await request.post('http://localhost:4001/api/v1/warehouse/outbound/confirm', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        orderIds: [testOrderId],
        items: [{ orderId: testOrderId, quantityToExport: 5, weightToExport: 120, volumeToExport: 0.55 }],
        licensePlate: '29C-999.01',
        driverName: 'Lê Văn Xuất',
        mode: 'CUSTOMER',
        notes: 'Xuất đợt 1 giao khách Hoàng Mai',
      },
    });
    expect(export1Res.ok()).toBeTruthy();
    console.log('[STAGE 2: EXPORTED 5 PACKAGES]');

    // Reload page & Re-open Modal
    await page.reload();
    await page.waitForLoadState('networkidle');
    await searchInput.fill(testOrderCode);
    await page.waitForTimeout(800);

    const orderRow2 = page.locator(`tr:has-text("${testOrderCode}")`).first();
    await expect(orderRow2).toBeVisible({ timeout: 10000 });
    await orderRow2.click();
    await page.waitForTimeout(600);

    // Verify Stage 2 UI
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=5').first()).toBeVisible(); // Đã xuất 5
    await expect(modal.locator('text=45').first()).toBeVisible(); // Còn tồn 45
    await expect(modal.locator('text=Xuất kho giao hàng (Đợt 1)').first()).toBeVisible();
    await expect(modal.locator('text=-5 kiện').first()).toBeVisible();
    await expect(modal.locator('text=Tồn sau thao tác: 45 kiện').first()).toBeVisible();
    await expect(modal.locator('text=29C-999.01').first()).toBeVisible();
    await expect(modal.locator('text=Lê Văn Xuất').first()).toBeVisible();

    // CHỤP ẢNH BẰNG CHỨNG GIAI ĐOẠN 2
    await captureEvidence(page, 'evidence_stage_2_first_outbound_5.png');

    // Đóng modal
    await modal.locator('button:has(svg.tabler-icon-x), button:has(svg.lucide-x), button:has-text("✕")').first().click();
    await page.waitForTimeout(500);

    // ── 3. GIAI ĐOẠN 3: Xuất kho lần 2 (Xuất 15 kiện luân chuyển -> Tồn còn 30) ──
    const export2Res = await request.post('http://localhost:4001/api/v1/warehouse/outbound/confirm', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        orderIds: [testOrderId],
        items: [{ orderId: testOrderId, quantityToExport: 15, weightToExport: 360, volumeToExport: 1.65 }],
        licensePlate: '29C-888.88',
        driverName: 'Trần Văn Chuyển',
        mode: 'TRANSFER',
        destinationHubId: 1,
        notes: 'Xuất đợt 2 luân chuyển Đà Nẵng',
      },
    });
    expect(export2Res.ok()).toBeTruthy();
    console.log('[STAGE 3: EXPORTED 15 PACKAGES]');

    // Reload page & Re-open Modal
    await page.reload();
    await page.waitForLoadState('networkidle');
    await searchInput.fill(testOrderCode);
    await page.waitForTimeout(800);

    const orderRow3 = page.locator(`tr:has-text("${testOrderCode}")`).first();
    await expect(orderRow3).toBeVisible({ timeout: 10000 });
    await orderRow3.click();
    await page.waitForTimeout(600);

    // Verify Stage 3 UI
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=20').first()).toBeVisible(); // Tổng xuất = 20
    await expect(modal.locator('text=30').first()).toBeVisible(); // Còn tồn = 30
    await expect(modal.locator('text=Xuất luân chuyển liên Hub (Đợt 2)').first()).toBeVisible();
    await expect(modal.locator('text=-15 kiện').first()).toBeVisible();
    await expect(modal.locator('text=Tồn sau thao tác: 30 kiện').first()).toBeVisible();
    await expect(modal.locator('text=29C-888.88').first()).toBeVisible();
    await expect(modal.locator('text=Trần Văn Chuyển').first()).toBeVisible();

    // CHỤP ẢNH BẰNG CHỨNG GIAI ĐOẠN 3
    await captureEvidence(page, 'evidence_stage_3_second_outbound_15.png');

    // Đóng modal
    await modal.locator('button:has(svg.tabler-icon-x), button:has(svg.lucide-x), button:has-text("✕")').first().click();
    await page.waitForTimeout(500);

    // ── 4. GIAI ĐOẠN 4: Xuất kho vét 30 kiện còn lại (Tồn còn 0 -> Hoàn tất xuất kho) ──
    const export3Res = await request.post('http://localhost:4001/api/v1/warehouse/outbound/confirm', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        orderIds: [testOrderId],
        items: [{ orderId: testOrderId, quantityToExport: 30, weightToExport: 720, volumeToExport: 3.3 }],
        licensePlate: '29C-777.77',
        driverName: 'Nguyễn Văn Vét',
        mode: 'CUSTOMER',
        notes: 'Xuất vét toàn bộ 30 kiện còn lại',
      },
    });
    expect(export3Res.ok()).toBeTruthy();
    console.log('[STAGE 4: DRAINED REMAINING 30 PACKAGES]');

    // Reload page & Re-open Modal
    await page.reload();
    await page.waitForLoadState('networkidle');
    await searchInput.fill(testOrderCode);
    await page.waitForTimeout(800);

    const orderRow4 = page.locator(`tr:has-text("${testOrderCode}")`).first();
    await expect(orderRow4).toBeVisible({ timeout: 10000 });
    await orderRow4.click();
    await page.waitForTimeout(600);

    // Verify Stage 4 UI
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=50').first()).toBeVisible(); // Tổng xuất = 50
    await expect(modal.locator('text=0').first()).toBeVisible(); // Còn tồn = 0
    await expect(modal.locator('text=Xuất kho giao hàng (Đợt 3)').first()).toBeVisible();
    await expect(modal.locator('text=-30 kiện').first()).toBeVisible();
    await expect(modal.locator('text=Tồn sau thao tác: 0 kiện').first()).toBeVisible();
    await expect(modal.locator('text=Đã xuất kho toàn bộ · Đơn hàng đã hoàn tất xuất kho').first()).toBeVisible();

    // CHỤP ẢNH BẰNG CHỨNG GIAI ĐOẠN 4
    await captureEvidence(page, 'evidence_stage_4_full_drain_0.png');
    console.log('[ALL 4 STAGES VERIFIED AND CAPTURED SUCCESSFULLY]');
  });
});
