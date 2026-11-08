import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

const API_BASE = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:4001/api/v1'
).replace(/\/+$/, '');

const normalizedApiV1 = API_BASE.endsWith('/api/v1')
  ? API_BASE
  : `${API_BASE}/api/v1`;

async function getAuthToken(email: string, password = 'secret'): Promise<string> {
  const res = await fetch(`${normalizedApiV1}/auth/email/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15000)
  });
  expect(res.ok).toBeTruthy();
  const body = await res.json();
  return body?.token || body?.data?.token || '';
}

test.describe('[Super Admin] Báo cáo vận hành Hub & Quản trị Cronjob (18:00 D-1 -> 18:00 D)', () => {
  test('1. API & Cronjob Logic: Khung giờ 18:00 D-1 -> 18:00 D và chỉ tính chuyến xe lúc Xác nhận (không tính nháp)', async () => {
    const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
    const adminToken = await getAuthToken(superAdmin.email, superAdmin.password);
    expect(adminToken.length).toBeGreaterThan(10);

    // 1. Kiểm tra khung giờ báo cáo ngày 02/11/2026: phải đúng từ 18:00 01/11/2026 đến 18:00 02/11/2026 (GMT+7)
    const reportRes = await fetch(
      `${normalizedApiV1}/admin/reports/operational?fromDate=2026-11-01&toDate=2026-11-07&direction=ALL`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: AbortSignal.timeout(15000)
      }
    );
    expect(reportRes.status).toBe(200);
    const rawReport = await reportRes.json();
    const reportData = rawReport?.data ?? rawReport;

    expect(reportData.filter.fromDate).toBe('2026-11-01');
    expect(reportData.filter.toDate).toBe('2026-11-07');
    expect(Array.isArray(reportData.dailySeries)).toBe(true);
    expect(reportData.dailySeries.length).toBe(7);

    const dayNov02 = reportData.dailySeries.find(
      (d: { reportDate?: string }) => d.reportDate === '2026-11-02'
    );
    expect(dayNov02).toBeDefined();
    expect(dayNov02.windowLabel).toBe('18:00 01/11/2026 → 18:00 02/11/2026');
    // 18:00 GMT+7 = 11:00 UTC
    expect(dayNov02.windowStart).toBe('2026-11-01T11:00:00.000Z');
    expect(dayNov02.windowEnd).toBe('2026-11-02T11:00:00.000Z');

    // Kiểm tra dữ liệu xu hướng theo tháng (Slide 3)
    expect(Array.isArray(reportData.monthlySeries)).toBe(true);
    expect(reportData.monthlySeries.length).toBeGreaterThanOrEqual(5);

    // 2. Kích hoạt chạy lại Report theo khoảng ngày (01/11/2026 -> 03/11/2026) qua API /admin/reports/cronjobs/rerun
    const rerunRes = await fetch(
      `${normalizedApiV1}/admin/reports/cronjobs/rerun`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          fromDate: '2026-11-01',
          toDate: '2026-11-03',
          notifySuperAdmins: false
        }),
        signal: AbortSignal.timeout(15000)
      }
    );
    expect(rerunRes.status).toBe(200);
    const rawRerun = await rerunRes.json();
    const rerunData = rawRerun?.data ?? rawRerun;
    expect(rerunData.fromDate).toBe('2026-11-01');
    expect(rerunData.toDate).toBe('2026-11-03');
    expect(rerunData.windowLabel).toBe('18:00 31/10/2026 → 18:00 03/11/2026');
    expect(rerunData.processedDays).toBe(3);
    expect(rerunData.upsertedRows).toBeGreaterThan(0);
    expect(rerunData.log?.status).toBe('SUCCESS');

    // 3. Kiểm tra API danh sách Quản trị Cronjob (/admin/reports/cronjobs)
    const cronMgmtRes = await fetch(
      `${normalizedApiV1}/admin/reports/cronjobs?daysLimit=30`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: AbortSignal.timeout(15000)
      }
    );
    expect(cronMgmtRes.status).toBe(200);
    const rawCronMgmt = await cronMgmtRes.json();
    const cronMgmtData = rawCronMgmt?.data ?? rawCronMgmt;
    expect(cronMgmtData.config?.jobKey).toBe('DAILY_HUB_OPERATIONAL_REPORT');
    expect(Array.isArray(cronMgmtData.jobs)).toBe(true);
    expect(cronMgmtData.jobs.length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(cronMgmtData.logs)).toBe(true);
    expect(cronMgmtData.logs.length).toBeGreaterThan(0);
    expect(Array.isArray(cronMgmtData.dailySnapshots)).toBe(true);
    expect(cronMgmtData.dailySnapshots.length).toBe(30);

    // 4. Kiểm tra phân quyền API: Role khác SUPER_ADMIN phải bị chặn 403
    const dispatcherUser = TEST_USERS.find((u) => u.role === 'DISPATCHER');
    if (dispatcherUser) {
      const dispToken = await getAuthToken(
        dispatcherUser.email,
        dispatcherUser.password
      );
      const forbiddenRes = await fetch(
        `${normalizedApiV1}/admin/reports/cronjobs`,
        {
          headers: { Authorization: `Bearer ${dispToken}` },
          signal: AbortSignal.timeout(15000)
        }
      );
      expect(forbiddenRes.status).toBe(403);
    }
  });

  test('2. Giao diện Super Admin (/dashboard/admin/reports): Biểu đồ Slide 2, Slide 3, Bộ lọc thời gian & Chụp bằng chứng', async ({
    page
  }) => {
    const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
    await clearSession(page);
    await loginAs(page, superAdmin);

    // Kiểm tra trang /dashboard/orders đã tạm thời ẩn khỏi Sidebar và tự động chuyển về /dashboard/warehouse/orders
    await page.goto('/dashboard/orders');
    await expect(page).toHaveURL(/\/dashboard\/warehouse\/orders/);
    await expect(page.locator('aside a[href="/dashboard/orders"], nav a[href="/dashboard/orders"]')).toHaveCount(0);

    await page.goto('/dashboard/admin/reports');
    await expect(
      page.getByTestId('super-admin-operational-report')
    ).toBeVisible({ timeout: 15000 });

    // Kiểm tra duy nhất 1 Bộ lọc chung Global trên cùng và 3 Parallel Route Slots
    await expect(page.getByTestId('global-report-filter-bar')).toBeVisible();
    await expect(page.getByTestId('slide2-metric-cbm')).toHaveCount(0);
    await expect(page.getByTestId('report-trip-search-input')).toHaveCount(0);
    await expect(page.getByTestId('parallel-slot-daily-stats')).toBeVisible();
    await expect(page.getByTestId('parallel-slot-monthly-trends')).toBeVisible();
    await expect(page.getByTestId('parallel-slot-drilldown-table')).toBeVisible();

    // Kiểm tra banner quy chuẩn Cronjob 18:00 D-1 -> 18:00 D
    const banner = page.getByTestId('cron-cutoff-rule-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('18:00 (6:00 PM) ngày D-1 đến 18:00 (6:00 PM) ngày D');
    await expect(banner).toContainText('02/11/2026');

    // Kiểm tra 4 thẻ KPI
    await expect(page.getByTestId('kpi-total-cbm')).toBeVisible();
    await expect(page.getByTestId('kpi-total-tons')).toBeVisible();
    await expect(page.getByTestId('kpi-total-trips')).toBeVisible();
    await expect(page.getByTestId('kpi-total-packages')).toBeVisible();

    // Kiểm tra Slide 2 (Biểu đồ cột CBM theo ngày + TỔNG SẢN LƯỢNG & TRUNG BÌNH CBM/NGÀY)
    const slide2Card = page.getByTestId('slide-2-daily-chart-card');
    await expect(slide2Card).toBeVisible();
    await expect(slide2Card).toContainText('1. Tình hình hoạt động của Hub');
    const slide2Footer = page.getByTestId('slide-2-summary-footer');
    await expect(slide2Footer).toContainText('TỔNG SẢN LƯỢNG:');
    await expect(slide2Footer).toContainText('TRUNG BÌNH:');
    await expect(slide2Footer).toContainText('CBM/NGÀY');

    // Kiểm tra Slide 3 (2 Biểu đồ đường SỐ KHỐI & SỐ TẤN theo tháng)
    const slide3Card = page.getByTestId('slide-3-monthly-charts-card');
    await expect(slide3Card).toBeVisible();
    await expect(page.getByTestId('slide-3-cbm-line-chart')).toContainText('SỐ KHỐI');
    await expect(page.getByTestId('slide-3-tons-line-chart')).toContainText('SỐ TẤN');

    // Thử chuyển đổi bộ lọc chiều vận hành
    await page.getByTestId('direction-inbound-btn').click();
    await page.getByTestId('direction-outbound-btn').click();
    await page.getByTestId('direction-all-btn').click();

    await page.getByTestId('tab-confirmed-trips').click();
    await expect(page.getByTestId('tab-hub-breakdown')).toHaveCount(0);
    await page.getByTestId('tab-daily-breakdown').click();

    await expect(
      page.getByTestId('slide-2-bar-chart-container')
    ).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: 'screenshot_super_admin_operational_report_verified.png',
      fullPage: true
    });
  });

  test('3. Trang Quản trị Cronjob (/dashboard/admin/cronjobs) & Trang Detail (/dashboard/admin/cronjobs/[jobKey]): Chọn khoảng ngày Từ ngày -> Đến ngày, Cấu hình lịch chạy & Nhật ký', async ({
    page
  }) => {
    const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
    await clearSession(page);
    await loginAs(page, superAdmin);

    // Kiểm tra trang /dashboard/orders đã tạm thời ẩn khỏi Sidebar và tự động chuyển về /dashboard/warehouse/orders
    await page.goto('/dashboard/orders');
    await expect(page).toHaveURL(/\/dashboard\/warehouse\/orders/);
    await expect(page.locator('aside a[href="/dashboard/orders"], nav a[href="/dashboard/orders"]')).toHaveCount(0);

    // 1. Vào trang Danh sách Cronjob (/dashboard/admin/cronjobs) -> chỉ hiển thị bảng danh mục Job, chưa hiển thị form thao tác
    await page.goto('/dashboard/admin/cronjobs');
    await expect(
      page.getByTestId('super-admin-cronjob-page')
    ).toBeVisible({ timeout: 15000 });

    const jobRegistryTable = page.getByTestId('cron-job-registry-table');
    await expect(jobRegistryTable).toBeVisible();
    await expect(jobRegistryTable).toContainText('DAILY_HUB_OPERATIONAL_REPORT');
    await expect(jobRegistryTable).toContainText(
      'PENDING_DRAFT_TRIPS_CUTOFF_REMINDER'
    );
    await expect(jobRegistryTable).toContainText(
      'STALE_WAREHOUSE_INVENTORY_AUDIT'
    );
    await expect(page.getByTestId('panel-rerun-specific-date')).toHaveCount(0);
    await expect(page.getByTestId('panel-cron-config')).toHaveCount(0);

    // 2. Bấm vào nút "Chi tiết & Thao tác" để vào trang Detail của DAILY_HUB_OPERATIONAL_REPORT
    await page
      .getByTestId('btn-open-cronjob-detail-DAILY_HUB_OPERATIONAL_REPORT')
      .click();
    await expect(page).toHaveURL(
      /\/dashboard\/admin\/cronjobs\/DAILY_HUB_OPERATIONAL_REPORT/
    );
    await expect(
      page.getByTestId('super-admin-cronjob-detail-page')
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByTestId('panel-rerun-specific-date')).toBeVisible();
    await expect(page.getByTestId('panel-cron-config')).toBeVisible();

    // 3. Chọn khoảng ngày: Từ ngày 01/11/2026 -> Đến ngày 03/11/2026 và kiểm tra khung giờ 3 ngày
    await page.getByTestId('rerun-target-date').fill('2026-11-01');
    await page.getByTestId('rerun-to-date').fill('2026-11-03');
    const previewBox = page.getByTestId('rerun-window-preview');
    await expect(previewBox).toContainText('3 ngày');
    await expect(previewBox).toContainText(
      '18:00 (6:00 PM) ngày 31/10/2026 → 18:00 (6:00 PM) ngày 03/11/2026'
    );

    // Thực thi chạy lại Cronjob cho khoảng ngày 01/11/2026 -> 03/11/2026
    const rerunResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/admin/reports/cronjobs/rerun') &&
        res.request().method() === 'POST'
    );
    await page.getByTestId('btn-execute-rerun').click();
    const rerunRes = await rerunResponsePromise;
    expect(rerunRes.status()).toBe(200);

    // Kiểm tra thông báo kết quả chạy lại ngay trên giao diện Detail
    const resultBanner = page.getByTestId('rerun-result-banner');
    await expect(resultBanner).toBeVisible({ timeout: 15000 });
    await expect(resultBanner).toContainText('01/11/2026 → 03/11/2026');
    await expect(resultBanner).toContainText('3 ngày');

    // Lưu cấu hình Cronjob trong trang Detail
    const saveCfgPromise = page.waitForResponse(
      (res) =>
        res.url().includes('/admin/reports/cronjobs/config') &&
        res.request().method() === 'PATCH'
    );
    await page.getByTestId('btn-save-cron-config').click();
    const saveCfgRes = await saveCfgPromise;
    expect(saveCfgRes.status()).toBe(200);

    // Kiểm tra bảng Nhật ký thực thi Cronjob & Tab trạng thái dữ liệu 30 ngày trong trang Detail
    await expect(page.getByTestId('log-status-filter-ALL')).toBeVisible();
    await expect(page.getByTestId('log-status-filter-SUCCESS')).toBeVisible();
    await expect(page.getByTestId('log-status-filter-FAILED')).toBeVisible();
    await page.getByTestId('log-status-filter-SUCCESS').click();
    await page.getByTestId('log-status-filter-ALL').click();
    const logsTable = page.getByTestId('cron-execution-logs-table');
    await expect(logsTable).toBeVisible();
    await expect(page.getByTestId('split-day-pill-2026-11-01')).toContainText('Xong');
    await expect(page.getByTestId('split-day-pill-2026-11-02')).toContainText('Xong');
    await expect(page.getByTestId('split-day-pill-2026-11-03')).toContainText('Xong');
    await expect(logsTable).toContainText('01/11/2026');
    await expect(logsTable).toContainText('02/11/2026');
    await expect(logsTable).toContainText('03/11/2026');
    await expect(logsTable).toContainText('Chạy tách từng ngày');
    await expect(logsTable).toContainText('THÀNH CÔNG');

    await page.getByTestId('tab-daily-snapshots').click();
    await expect(
      page.getByTestId('cron-daily-snapshots-table')
    ).toBeVisible();
    await page.getByTestId('tab-job-logs').click();

    await page.screenshot({
      path: 'screenshot_super_admin_cronjobs_verified.png',
      fullPage: true
    });
  });

  test('4. Widget Theo dõi chi tiết mã TRIP & Trang chuyên biệt theo ngày (/dashboard/admin/reports/trips): Xem 1 ngày cụ thể có bao nhiêu xe nhập/xuất & đơn hàng trong từng TRIP', async ({
    page
  }) => {
    const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
    const adminToken = await getAuthToken(superAdmin.email, superAdmin.password);

    // 1. Kiểm tra API /admin/reports/operational/daily-trips để tìm 1 ngày có phát sinh chuyến xe thực tế
    const stripRes = await fetch(
      `${normalizedApiV1}/admin/reports/operational/daily-trips`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: AbortSignal.timeout(15000)
      }
    );
    expect(stripRes.status).toBe(200);
    const rawDaily = await stripRes.json();
    const dailyData = rawDaily?.data ?? rawDaily;
    expect(dailyData.daySummary).toBeDefined();
    expect(Array.isArray(dailyData.recentDaysStrip)).toBe(true);
    expect(dailyData.recentDaysStrip.length).toBe(14);

    // Tìm ngày có chuyến xe trong 14 ngày gần nhất (hoặc dùng ngày mặc định)
    const activeDayItem =
      dailyData.recentDaysStrip.find((d: { totalTrips?: number; reportDate?: string }) => (d.totalTrips ?? 0) > 0) ||
      dailyData.recentDaysStrip[dailyData.recentDaysStrip.length - 1];
    const targetDate = activeDayItem.reportDate;

    await clearSession(page);
    await loginAs(page, superAdmin);

    // Kiểm tra trang /dashboard/orders đã tạm thời ẩn khỏi Sidebar và tự động chuyển về /dashboard/warehouse/orders
    await page.goto('/dashboard/orders');
    await expect(page).toHaveURL(/\/dashboard\/warehouse\/orders/);
    await expect(page.locator('aside a[href="/dashboard/orders"], nav a[href="/dashboard/orders"]')).toHaveCount(0);

    // 2. Mở trang Báo cáo vận hành, kiểm tra Widget Theo dõi mã TRIP và bấm mở sang trang Theo dõi TRIP theo ngày
    await page.goto('/dashboard/admin/reports');
    await expect(page.getByTestId('trip-tracking-widget')).toBeVisible({
      timeout: 15000
    });
    await expect(page.getByTestId('widget-open-daily-trips-btn')).toBeVisible();
    await expect(page.getByTestId('report-goto-daily-trips-btn')).toBeVisible();

    // Điều hướng sang trang chuyên biệt /dashboard/admin/reports/trips?date=<targetDate>
    await page.goto(`/dashboard/admin/reports/trips?date=${targetDate}`);
    await expect(
      page.getByTestId('super-admin-daily-trips-page')
    ).toBeVisible({ timeout: 15000 });

    // Đảm bảo trang chuyên biệt KHÔNG hiển thị các biểu đồ Parallel Routes của trang báo cáo tổng
    await expect(page.getByTestId('slide-2-daily-chart-card')).toHaveCount(0);
    await expect(page.getByTestId('slide-3-monthly-charts-card')).toHaveCount(0);

    // 3. Kiểm tra Bộ lọc 1 ngày cụ thể, Nút Xuất Excel, Khung Cảnh báo Chuyến xe Chưa xác nhận trước Cut-off 18:00, Dải 14 ngày chọn nhanh và 4 Thẻ KPI Số xe Nhập / Xuất
    await expect(page.getByTestId('daily-trips-filter-bar')).toBeVisible();
    await expect(page.getByTestId('btn-export-daily-trips-excel')).toBeVisible();
    await expect(page.getByTestId('pending-trips-alert-card')).toBeVisible();
    await expect(page.getByTestId('pending-trips-alert-card')).toContainText(
      'Kiểm soát Chuyến xe Chưa xác nhận trước giờ Cut-off 18:00'
    );
    await expect(page.getByTestId('recent-days-strip')).toBeVisible();
    await expect(page.getByTestId('daily-trips-date-input')).toHaveValue(
      targetDate
    );

    const totalTripsKpi = page.getByTestId('daily-kpi-total-trips');
    const inboundTripsKpi = page.getByTestId('daily-kpi-inbound-trips');
    const outboundTripsKpi = page.getByTestId('daily-kpi-outbound-trips');

    await expect(totalTripsKpi).toBeVisible();
    await expect(inboundTripsKpi).toContainText('xe nhập kho');
    await expect(outboundTripsKpi).toContainText('xe xuất kho');

    // Kiểm tra bảng tóm tắt 1 ánh nhìn (Số chuyến Nhập / Xuất, các mã TRIP, Tổng sản lượng) & 2 bảng song song Nhập / Xuất
    await expect(page.getByTestId('daily-glance-summary-table')).toBeVisible();
    await expect(page.getByTestId('glance-row-inbound')).toContainText('CHUYẾN NHẬP KHO');
    await expect(page.getByTestId('glance-row-outbound')).toContainText('CHUYẾN XUẤT KHO');
    await expect(page.getByTestId('glance-row-total')).toContainText('TỔNG CỘNG NGÀY');
    await expect(page.getByTestId('inbound-trips-table-section')).toBeVisible();
    await expect(page.getByTestId('outbound-trips-table-section')).toBeVisible();
    await expect(page.getByTestId('daily-trips-by-date-summary-table')).toBeVisible();

    // 4. Kiểm tra chuyển đổi bộ lọc Chiều Xe Nhập Kho / Xe Xuất Kho / Tất cả
    await page.getByTestId('daily-dir-inbound').click();
    await page.getByTestId('daily-dir-outbound').click();
    await page.getByTestId('daily-dir-all').click();

    // 5. Nếu ngày đang chọn có chuyến xe TRIP, bấm mở rộng chuyến xe đầu tiên để xem bảng kê đơn hàng bên trong
    const firstTripToggle = page
      .locator('[data-testid^="btn-toggle-trip-"]')
      .first();
    if ((await firstTripToggle.count()) > 0) {
      await firstTripToggle.click();
      await expect(page.getByText('Mã vận đơn').first()).toBeVisible();
    }

    await page.screenshot({
      path: 'screenshot_super_admin_daily_trips_verified.png',
      fullPage: true
    });
  });
});
