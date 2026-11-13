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
    expect(dayNov02.windowLabel).toBe('06:00 02/11/2026 → 05:59 03/11/2026');
  });

  test('2. Super Admin Reports UI: keep sync, show LƯU KHO, scope hub selector to HCM', async ({
    page
  }) => {
    const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
    await loginAs(page, superAdmin, 'http://localhost:4000');

    await page.goto('http://localhost:4000/dashboard/admin/reports');
    await page.waitForLoadState('domcontentloaded');

    // 1. Kiểm tra Banner quy chuẩn chốt sổ: 06:00 D-1 đến 05:59 D
    const banner = page.getByTestId('cron-cutoff-rule-banner');
    await expect(banner).toHaveCount(1);
    await expect(banner).toBeHidden();

    // 2. Kiểm tra slot drilldown-table & Widget mã TRIP đã được loại bỏ
    await expect(page.getByTestId('tab-confirmed-trips')).toHaveCount(0);

    // 3. Kiểm tra 2 nút bấm tách riêng báo cáo Nhập kho và Xuất kho
    await expect(page.getByTestId('report-sync-cron-btn')).toBeVisible();
    await expect(page.getByTestId('report-goto-daily-trips-btn')).toHaveCount(0);
    await expect(page.getByTestId('report-goto-cronjobs-btn')).toHaveCount(0);
    await expect(page.getByTestId('report-export-excel-btn')).toHaveCount(0);
    await expect(page.getByTestId('direction-inbound-btn')).toHaveCount(0);
    await expect(page.getByTestId('direction-outbound-btn')).toHaveCount(0);

    const hubSelector = page.getByTestId('warehouse-hub-filter-select');
    await expect(hubSelector).toContainText('Andromeda Hub - HCM', { timeout: 15000 });
    await hubSelector.click();
    await expect(
      page.locator('button[data-testid^="warehouse-hub-filter-item-"][disabled]')
    ).toHaveCount(2);
    await hubSelector.click();
    await expect(page.getByText('LƯU KHO', { exact: true }).first()).toBeVisible();

    // 4. Kiểm tra dòng TỔNG SẢN LƯỢNG / TRUNG BÌNH trùng lặp bên dưới biểu đồ cột đã được gỡ bỏ
    await expect(page.getByTestId('slide-2-summary-footer')).toHaveCount(0);

    // 5. Kiểm tra bấm vào 2 thẻ KPI (CBM và Số Tấn) để chuyển đổi biểu đồ tương ứng
    const cbmCard = page.getByTestId('kpi-card-cbm');
    const tonsCard = page.getByTestId('kpi-card-tons');
    const metricLabel = page.getByTestId('slide-2-chart-metric-label');

    await expect(cbmCard).toBeVisible();
    await expect(tonsCard).toBeVisible();
    await expect(metricLabel).toHaveText('CBM');
    await expect(cbmCard).toHaveAttribute('aria-pressed', 'true');

    // Bấm vào thẻ Tổng sản lượng tấn (Số Tấn) -> Biểu đồ chuyển sang SỐ TẤN
    await tonsCard.click();
    await expect(metricLabel).toHaveText('SỐ TẤN');
    await expect(tonsCard).toHaveAttribute('aria-pressed', 'true');
    await expect(cbmCard).toHaveAttribute('aria-pressed', 'false');

    // Chụp ảnh bằng chứng biểu đồ theo Số Tấn
    await page.screenshot({
      path: 'test-results/admin-reports-tons-chart-selected.png',
      fullPage: false
    });

    // Bấm lại vào thẻ Tổng sản lượng khối (CBM) -> Biểu đồ chuyển về CBM
    await cbmCard.click();
    await expect(metricLabel).toHaveText('CBM');
    await expect(cbmCard).toHaveAttribute('aria-pressed', 'true');

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

    // 3. Chuyển sang tab LƯU KHO và chờ số liệu tổng tải xong
    const storedTab = page.getByTestId('warehouse-tab-inbound');
    await storedTab.click();
    await expect(qtyBox).toHaveText(/^\d/, { timeout: 15000 });
    await expect(weightBox).toHaveText(/^\d/, { timeout: 15000 });
    await expect(volumeBox).toHaveText(/^\d/, { timeout: 15000 });

    // Đảm bảo chỉ hiển thị con số tổng gọn gàng, không lặp lại chữ tiêu đề cột
    const qtyText = (await qtyBox.innerText()).trim();
    const weightText = (await weightBox.innerText()).trim();
    const volumeText = (await volumeBox.innerText()).trim();

    expect(qtyText).not.toContain('SỐ LƯỢNG');
    expect(weightText).not.toContain('SỐ KG');
    expect(volumeText).not.toContain('SỐ KHỐI');

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
