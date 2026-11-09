import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs } from './helpers/auth';

const normalizedApiV1 = 'http://localhost:4001/api/v1';

async function getAuthToken(email: string, password = 'secret'): Promise<string> {
  const res = await fetch(`${normalizedApiV1}/auth/email/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15000)
  });
  const data = await res.json();
  return data?.data?.token ?? data?.token ?? '';
}

test.describe('[Feedback 09/11] Super Admin Reports Cutoff 06:00 & Warehouse Orders Quick Totals', () => {
  test('1. Backend API: Cutoff window runs from 06:00 D-1 to 05:59 D', async () => {
    const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
    const adminToken = await getAuthToken(superAdmin.email, superAdmin.password);
    expect(adminToken.length).toBeGreaterThan(10);

    const res = await fetch(
      `${normalizedApiV1}/admin/reports/operational?fromDate=2026-11-01&toDate=2026-11-03&direction=INBOUND`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: AbortSignal.timeout(15000)
      }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const data = body.data ?? body;

    expect(data.filter.cutoffRule).toContain('06:00');
    expect(data.filter.cutoffRule).toContain('05:59');

    const dayNov02 = data.dailySeries.find((d: any) => d.reportDate === '2026-11-02');
    expect(dayNov02).toBeDefined();
    expect(dayNov02.windowLabel).toBe('06:00 01/11/2026 → 05:59 02/11/2026');
  });

  test('2. Super Admin Reports UI: Banner 06:00, no Widget Theo dõi mã TRIP tab, separate Nhập/Xuất buttons', async ({
    page
  }) => {
    const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
    await loginAs(page, superAdmin, 'http://localhost:4000');

    await page.goto('http://localhost:4000/dashboard/admin/reports');
    await page.waitForLoadState('domcontentloaded');

    // 1. Kiểm tra Banner quy chuẩn chốt sổ: 06:00 D-1 đến 05:59 D
    const banner = page.getByTestId('cron-cutoff-rule-banner');
    await expect(banner).toBeVisible({ timeout: 15000 });
    await expect(banner).toContainText('06:00 (6:00 AM) ngày D-1 đến 05:59 (5:59 AM) ngày D');

    // 2. Kiểm tra slot drilldown-table & Widget mã TRIP đã được loại bỏ
    await expect(page.getByTestId('tab-confirmed-trips')).toHaveCount(0);
    
    // 3. Kiểm tra 2 nút bấm tách riêng báo cáo Nhập kho và Xuất kho
    const inboundBtn = page.getByTestId('direction-inbound-btn');
    const outboundBtn = page.getByTestId('direction-outbound-btn');
    await expect(inboundBtn).toBeVisible();
    await expect(outboundBtn).toBeVisible();
    await expect(inboundBtn).toContainText('Báo cáo Nhập kho');
    await expect(outboundBtn).toContainText('Báo cáo Xuất kho');

    // Bấm Báo cáo Xuất kho
    await outboundBtn.click();
    await page.waitForTimeout(600);
    await expect(outboundBtn).toHaveClass(/bg-emerald-600/);

    // Bấm Báo cáo Nhập kho
    await inboundBtn.click();
    await page.waitForTimeout(600);
    await expect(inboundBtn).toHaveClass(/bg-blue-600/);

    // Chụp ảnh bằng chứng
    await page.screenshot({
      path: 'test-results/admin-reports-cutoff-and-separated-buttons.png',
      fullPage: false
    });
  });

  test('3. Warehouse Orders UI: 3 Quick Metric boxes (Số lượng, Số kg, CBM) & Hub Filter for Super Admin', async ({
    page
  }) => {
    const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
    await loginAs(page, superAdmin, 'http://localhost:4000');

    await page.goto('http://localhost:4000/dashboard/warehouse/orders');
    await page.waitForLoadState('domcontentloaded');

    // 1. Kiểm tra Hub Filter xuất hiện ngay ở Page Header
    const headerHubFilter = page.getByTestId('admin-header-hub-filter');
    await expect(headerHubFilter).toBeVisible({ timeout: 15000 });

    // 2. Kiểm tra 3 ô tính tổng (Số lượng, Số kg, CBM)
    const metricsBoxes = page.getByTestId('admin-orders-metrics-boxes');
    await expect(metricsBoxes).toBeVisible({ timeout: 15000 });

    const qtyBox = page.getByTestId('admin-metric-quantity');
    const weightBox = page.getByTestId('admin-metric-weight');
    const volumeBox = page.getByTestId('admin-metric-volume');

    await expect(qtyBox).toBeVisible();
    await expect(weightBox).toBeVisible();
    await expect(volumeBox).toBeVisible();

    // 3. Chuyển sang tab LƯU KHO
    const storedTab = page.getByTestId('warehouse-tab-inbound');
    await storedTab.click();
    await page.waitForTimeout(1000);

    // Đảm bảo số lượng hiển thị không rỗng
    const qtyText = await qtyBox.innerText();
    const weightText = await weightBox.innerText();
    const volumeText = await volumeBox.innerText();

    expect(qtyText).toContain('SỐ LƯỢNG');
    expect(weightText).toContain('SỐ KG');
    expect(volumeText).toContain('SỐ KHỐI');

    // Chụp ảnh bằng chứng nghiệm thu
    await page.screenshot({
      path: 'test-results/warehouse-orders-admin-quick-totals-and-hub-select.png',
      fullPage: false
    });
  });

  test('4. RBAC Safety: Regular user (Dispatcher / Warehouse Manager) does NOT see admin quick boxes or header hub select', async ({
    page
  }) => {
    const managerUser = TEST_USERS.find((u) => u.role === 'WAREHOUSE_MANAGER')!;
    await loginAs(page, managerUser, 'http://localhost:4000');

    await page.goto('http://localhost:4000/dashboard/warehouse/orders');
    await page.waitForLoadState('domcontentloaded');

    // Đảm bảo user thường không có 3 ô tính tổng riêng của Super Admin
    await expect(page.getByTestId('admin-orders-metrics-boxes')).toHaveCount(0);
    await expect(page.getByTestId('admin-header-hub-filter')).toHaveCount(0);
  });
});
