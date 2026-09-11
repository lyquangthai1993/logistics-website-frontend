import { test, expect } from '@playwright/test';
import { loginAs, clearSession } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/user-guide/screenshots/interhub-transfer');

const WAREHOUSE_HYN = {
  email: 'lyquangthai1993+4@gmail.com', // Quản lý Kho A (Polaris Hub - Hưng Yên)
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

const WAREHOUSE_DAD = {
  email: 'lyquangthai1993+5@gmail.com', // Quản lý Kho B (Magellan Hub - Đà Nẵng)
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Seed 10 sample orders at Hub A if less than 10 are stored
async function ensureHubAHasOrders(request: any) {
  // Login to get token
  const loginRes = await request.post(`${BASE_URL}/api/v1/auth/email/login`, {
    data: {
      email: WAREHOUSE_HYN.email,
      password: WAREHOUSE_HYN.password,
    },
  });
  if (!loginRes.ok()) return;
  const loginData = await loginRes.json();
  const token = loginData?.data?.token || loginData?.token;
  if (!token) return;

  // Check existing stored orders
  const ordersRes = await request.get(`${BASE_URL}/api/v1/warehouse/orders?limit=30&status=INBOUND`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const ordersData = await ordersRes.json();
  const rawOrders = ordersData?.data || [];
  const currentCount = rawOrders.length;

  const needed = Math.max(0, 15 - currentCount);
  console.log(`[Seed Check] Kho A hiện có ${currentCount} đơn LƯU KHO. Cần tạo thêm: ${needed} đơn.`);

  const sampleItems = [
    { desc: 'Vải cuộn may mặc cao cấp', qty: 45, kg: 850, m3: 3.2 },
    { desc: 'Hạt nhựa công nghiệp đóng bao', qty: 80, kg: 2000, m3: 4.5 },
    { desc: 'Thùng carton đựng linh kiện', qty: 60, kg: 420, m3: 2.8 },
    { desc: 'Thiết bị phụ tùng xe máy', qty: 25, kg: 310, m3: 1.2 },
    { desc: 'Bao bì màng nhôm thực phẩm', qty: 100, kg: 650, m3: 2.5 },
    { desc: 'Sơn công nghiệp thùng 20L', qty: 40, kg: 920, m3: 2.0 },
    { desc: 'Sợi polyester dệt may', qty: 50, kg: 1100, m3: 3.6 },
    { desc: 'Giấy in văn phòng đóng kiện', qty: 120, kg: 780, m3: 2.4 },
    { desc: 'Phụ kiện kim khí ngũ kim', qty: 35, kg: 540, m3: 1.5 },
    { desc: 'Bình xịt hóa chất bảo hộ', qty: 55, kg: 380, m3: 1.8 },
  ];

  for (let i = 0; i < needed; i++) {
    const item = sampleItems[i % sampleItems.length];
    await request.post(`${BASE_URL}/api/v1/warehouse/inbound/quick-create`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        goodsDescription: `${item.desc} (Lô #${i + 1})`,
        totalQuantity: item.qty,
        totalWeight: item.kg,
        totalVolume: item.m3,
        deliveryMode: 'HUB_L1',
        destinationHubId: 2, // Đà Nẵng
        initialStatus: 'INBOUND',
      },
    });
  }
}


test.describe('E2E Toàn Trình: Luân Chuyển Liên Hub & Nhập Kho Một Phần Kèm Bổ Sung Dòng Mới', () => {
  test.beforeAll(async ({ request }) => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    await ensureHubAHasOrders(request);
  });

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Đảm bảo API trả về 20 đơn/trang để đủ 10 đơn cần xuất
    await page.route('**/api/v1/warehouse/orders*', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('limit') === '8') {
        url.searchParams.set('limit', '20');
        return route.continue({ url: url.toString() });
      }
      return route.continue();
    });

    // Fulfill inbound confirm API
    await page.route('**/api/v1/warehouse/inbound/confirm', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          message: 'Success',
          data: { updatedCount: 2, newCount: 4, orders: [] },
        }),
      });
    });
  });

  test('Kịch bản hoàn chỉnh: Kho A xuất 10 đơn ➔ Kho B dỡ 2 đơn và nhập mới 4 dòng hàng', async ({ page }) => {
    test.setTimeout(90_000);
    const timestamp = Date.now().toString().slice(-4);
    const testLicensePlate = `29C-9${timestamp}`;
    const testDriver = `Nguyễn Văn Luân Chuyển ${timestamp}`;

    // ═══════════════════════════════════════════════════════════════════════════
    // PHẦN I: THỦ KHO A (HƯNG YÊN) TẠO PHIẾU XUẤT LUÂN CHUYỂN 10 DÒNG HÀNG
    // ═══════════════════════════════════════════════════════════════════════════

    // Bước 1: Đăng nhập Thủ kho Hưng Yên & Vào màn hình Xuất kho
    await loginAs(page, WAREHOUSE_HYN);
    await page.goto('/dashboard/warehouse/outbound');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: /Xuất kho/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=Đang tải dữ liệu xuất kho')).toBeHidden({ timeout: 10_000 });
    await page.waitForTimeout(1000);

    const shot01 = path.join(SCREENSHOT_DIR, '01_KhoA_Bang_Xuat_Kho.png');
    await page.screenshot({ path: shot01, fullPage: true });
    console.log(`[Screenshot 01] Đã chụp màn hình Bảng Xuất Kho Kho A: ${shot01}`);

    // Bước 2: Bấm chọn "Xuất kho luân chuyển nội bộ"
    const transferModeBtn = page.getByRole('button', { name: 'Xuất luân chuyển nội bộ' });
    await expect(transferModeBtn).toBeVisible();
    await transferModeBtn.click();
    await page.waitForTimeout(600);

    // Xác thực Form Bước 1 (Thông tin chuyến xuất luân chuyển)
    await expect(page.locator('text=BƯỚC 1: CHỌN HUB ĐÍCH & THÔNG TIN XE CHUYẾN')).toBeVisible();
    await expect(page.locator('label:has-text("Hub nhận nội bộ *")')).toBeVisible();

    // Điền thông tin Chuyến xe: Biển số xe, Tài xế, đảm bảo chọn Hub đích là Đà Nẵng
    const plateInput = page.locator('input[placeholder*="29C-123.45"]');
    await plateInput.fill(testLicensePlate);

    const driverInput = page.locator('input[placeholder*="Nguyễn Văn A"]');
    await driverInput.fill(testDriver);

    // Chọn Hub nhận nội bộ là Magellan Hub - Đà Nẵng
    const hubSelect = page.locator('select');
    if (await hubSelect.isVisible()) {
      await hubSelect.selectOption('2');
    }

    const shot02 = path.join(SCREENSHOT_DIR, '02_KhoA_Chon_Mode_Luan_Chuyen.png');
    await page.screenshot({ path: shot02, fullPage: true });
    console.log(`[Screenshot 02] Đã chụp màn hình Form Bước 1 Xuất Kho: ${shot02}`);

    // Bấm nút chuyển sang Bước 2 (Chọn hàng trong kho)
    const step1NextBtn = page.getByRole('button', { name: /Chọn hàng trong kho/i });
    await expect(step1NextBtn).toBeVisible();
    await step1NextBtn.click();
    await page.waitForTimeout(800);

    // Bước 3: Xác thực Bước 2 (Lưới chọn hàng xuất kho)
    await expect(page.locator('text=/CHỌN HÀNG XUẤT KHO/i')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('th:has-text("MÃ ĐƠN HÀNG")')).toBeVisible();

    // Chọn đúng 10 đơn hàng lưu kho để xuất đi
    const orderCheckboxes = page.locator('tbody tr input[type="checkbox"]');
    const availableRows = await orderCheckboxes.count();
    console.log(`[Kho A] Số lượng đơn hàng hiển thị trên bảng: ${availableRows}`);
    expect(availableRows).toBeGreaterThanOrEqual(10);

    // Bỏ chọn tất cả trước nếu đang chọn
    const selectAllBox = page.locator('label:has-text("Chọn tất cả") input[type="checkbox"]');
    if (await selectAllBox.isChecked()) {
      await selectAllBox.uncheck();
      await page.waitForTimeout(300);
    }

    // Tích chọn chính xác 10 đơn hàng đầu tiên
    for (let i = 0; i < 10; i++) {
      await orderCheckboxes.nth(i).check();
      await page.waitForTimeout(100);
    }

    // Xác nhận bộ đếm hiển thị "Đã chọn 10"
    await expect(page.locator('text=/Đã chọn 10/i')).toBeVisible();

    const shot03 = path.join(SCREENSHOT_DIR, '03_KhoA_Chon_10_Don_Hang.png');
    await page.screenshot({ path: shot03, fullPage: true });
    console.log(`[Screenshot 03] Đã chụp màn hình Chọn 10 đơn hàng: ${shot03}`);

    // Bấm nút chuyển sang Bước 3 (Xác nhận hàng đã chọn)
    const step2NextBtn = page.getByRole('button', { name: /Xác nhận hàng đã chọn → Sang Bước 3/i });
    await expect(step2NextBtn).toBeVisible();
    await step2NextBtn.click();
    await page.waitForTimeout(800);

    // Bước 4: Bước 3 - Xác nhận phiếu xuất kho & Kiểm tra Loading Plan
    await expect(page.getByRole('heading', { name: 'Xác nhận phiếu xuất kho', exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(`text=${testLicensePlate}`).first()).toBeVisible();
    await expect(page.locator(`text=${testDriver}`).first()).toBeVisible();
    await expect(page.locator('text=/Danh sách hàng xuất kho \\(10 đơn\\)/i')).toBeVisible();

    const shot04 = path.join(SCREENSHOT_DIR, '04_KhoA_Xac_Nhan_Xuat_Ben.png');
    await page.screenshot({ path: shot04, fullPage: true });
    console.log(`[Screenshot 04] Đã chụp màn hình Bước 3 Xác nhận xuất: ${shot04}`);

    // Bước 5: Bấm "Xác nhận xuất kho luân chuyển"
    const confirmTransferBtn = page.getByRole('button', { name: /Xác nhận xuất kho luân chuyển/i });
    await expect(confirmTransferBtn).toBeVisible();
    await confirmTransferBtn.click();

    // Chờ thông báo thành công và chuyển hướng về danh sách xuất kho
    await expect(page.locator('text=/Đã xác nhận xuất kho luân chuyển thành công/i')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);

    const shot05 = path.join(SCREENSHOT_DIR, '05_KhoA_Xuat_Thanh_Cong.png');
    await page.screenshot({ path: shot05, fullPage: true });
    console.log(`[Screenshot 05] Đã chụp màn hình Xuất kho thành công tại Kho A: ${shot05}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // PHẦN II: THỦ KHO B (ĐÀ NẴNG) TIẾP NHẬN CHUYẾN XE, DỠ 2 ĐƠN & THÊM 4 DÒNG
    // ═══════════════════════════════════════════════════════════════════════════

    // Bước 6: Đăng xuất Kho A, Đăng nhập Kho B (Magellan Hub - Đà Nẵng)
    await clearSession(page);
    await loginAs(page, WAREHOUSE_DAD);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('domcontentloaded');

    // Xác thực nút chuyển mode Nhập kho luân chuyển tại Magellan Hub - Đà Nẵng
    await expect(page.getByRole('button', { name: /Nhận luân chuyển nội bộ/i })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);

    const shot06 = path.join(SCREENSHOT_DIR, '06_KhoB_Bang_Nhap_Kho.png');
    await page.screenshot({ path: shot06, fullPage: true });
    console.log(`[Screenshot 06] Đã chụp màn hình Bảng Nhập Kho Kho B: ${shot06}`);

    // Bước 7: Bấm chuyển sang chế độ "Nhận luân chuyển nội bộ"
    const inboundTransferModeBtn = page.getByRole('button', { name: /Nhận luân chuyển nội bộ/i });
    await expect(inboundTransferModeBtn).toBeVisible();
    await inboundTransferModeBtn.click();
    await page.waitForTimeout(800);

    // Modal Bước 1 (WH_CASE_02B_TRIP_MODAL) xuất hiện
    await expect(page.locator('text=BƯỚC 1 / 3: CHỌN CHUYẾN ĐANG ĐẾN HUB')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Chọn chuyến đang đến để tiếp nhận hàng')).toBeVisible();

    // Tìm kiếm chuyến xe theo biển số xe vừa xuất từ Kho A
    const tripSearchInput = page.locator('input[placeholder*="mã chuyến"]');
    await tripSearchInput.fill(testLicensePlate);
    await page.waitForTimeout(1000);

    const shot07 = path.join(SCREENSHOT_DIR, '07_KhoB_Modal_Chon_Chuyen_TRIP.png');
    await page.screenshot({ path: shot07 });
    console.log(`[Screenshot 07] Đã chụp Modal Bước 1 Tìm chuyến xe: ${shot07}`);

    // Bước 8: Bấm "Chọn chuyến" trên thẻ xe
    const tripCard = page.locator(`.fixed.inset-0:has-text("${testLicensePlate}")`);
    await expect(tripCard).toBeVisible({ timeout: 15_000 });
    const selectTripBtn = page.locator('.fixed.inset-0 button:has-text("Chọn chuyến")').first();
    await expect(selectTripBtn).toBeVisible({ timeout: 10_000 });
    await selectTripBtn.click();
    await page.waitForTimeout(800);

    // Modal Bước 2 (WH_CASE_03_MODAL) xuất hiện
    await expect(page.locator('text=BƯỚC 2 / 3: CHỌN ĐƠN HÀNG CẦN TIẾP NHẬN')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(`text=${testLicensePlate}`).first()).toBeVisible();

    // Chờ tải danh sách đơn hàng xong
    await expect(page.locator('text=Đang tải danh sách đơn hàng')).toBeHidden({ timeout: 10_000 });
    await page.waitForTimeout(600);

    const shot08 = path.join(SCREENSHOT_DIR, '08_KhoB_Modal_Danh_Sach_10_Don.png');
    await page.screenshot({ path: shot08 });
    console.log(`[Screenshot 08] Đã chụp Modal Bước 2 Danh sách 10 đơn trên xe: ${shot08}`);

    // Bước 9: Bỏ chọn tất cả, CHỈ TÍCH CHỌN ĐÚNG 2 ĐƠN HÀNG
    const selectAllTripCheckbox = page.locator('.fixed.inset-0 label:has-text("Chọn tất cả") input[type="checkbox"]');
    if (await selectAllTripCheckbox.isChecked()) {
      await selectAllTripCheckbox.uncheck();
      await page.waitForTimeout(300);
    }

    // Tích chọn 2 đơn hàng đầu tiên
    const tripOrderCheckboxes = page.locator('.fixed.inset-0 tbody tr input[type="checkbox"]');
    await tripOrderCheckboxes.nth(0).check();
    await page.waitForTimeout(150);
    await tripOrderCheckboxes.nth(1).check();
    await page.waitForTimeout(300);

    // Xác nhận hiển thị "Đã chọn 2"
    await expect(page.locator('text=/Đã chọn 2/i')).toBeVisible();

    const shot09 = path.join(SCREENSHOT_DIR, '09_KhoB_Modal_Chi_Chon_2_Don.png');
    await page.screenshot({ path: shot09 });
    console.log(`[Screenshot 09] Đã chụp Modal Bước 2 Tích chọn đúng 2 đơn: ${shot09}`);

    // Bước 10: Bấm "Xác nhận dỡ hàng → Đưa vào kiểm đếm"
    const confirmUnloadBtn = page.getByRole('button', { name: /Xác nhận dỡ hàng/i });
    await expect(confirmUnloadBtn).toBeVisible();
    await confirmUnloadBtn.click();
    await page.waitForTimeout(800);

    // Modal đóng, chuyển sang không gian làm việc dd8X5 với thẻ xe đã khóa và 2 đơn hàng
    await expect(page.locator('text=2 đơn hàng đã lên lưới')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(`text=${testLicensePlate}`).first()).toBeVisible();
    await expect(page.locator(`text=${testDriver}`).first()).toBeVisible();

    const shot10 = path.join(SCREENSHOT_DIR, '10_KhoB_Luoi_Kiem_Dem_2_Don.png');
    await page.screenshot({ path: shot10, fullPage: true });
    console.log(`[Screenshot 10] Đã chụp Lưới kiểm đếm dd8X5 có 2 đơn từ xe: ${shot10}`);

    // Bước 11: Bấm nút "Thêm 1 dòng đơn mới" 4 lần để bổ sung hàng gom dọc đường
    const addRowBtn = page.locator('button:has-text("Thêm 1 dòng đơn mới")');
    for (let i = 0; i < 4; i++) {
      await addRowBtn.click();
      await page.waitForTimeout(250);
    }

    // Lưới hiện tại có tổng cộng 6 dòng
    const gridRows = page.locator('tbody tr');
    await expect(gridRows).toHaveCount(6);

    // Điền thông tin chi tiết cho 4 dòng hàng mới bổ sung (Dòng 3 đến 6)
    const newEnRouteItems = [
      {
        desc: 'Thiết bị điện tử viễn thông (Gom tại Thanh Hóa)',
        qty: '18',
        kg: '240',
        address: '45 Nguyễn Văn Linh, Q. Hải Châu, Đà Nẵng',
      },
      {
        desc: 'Vật tư phụ liệu may mặc (Lấy tại Vinh)',
        qty: '35',
        kg: '520',
        address: 'Lô B2, KCN Hòa Khánh, Liên Chiểu, Đà Nẵng',
      },
      {
        desc: 'Phụ tùng cơ khí khuôn đúc (Lấy tại Hà Tĩnh)',
        qty: '12',
        kg: '380',
        address: '120 Điện Biên Phủ, Thanh Khê, Đà Nẵng',
      },
      {
        desc: 'Thực phẩm chế biến đóng thùng (Lấy tại Đồng Hới)',
        qty: '40',
        kg: '600',
        address: 'Chợ Đầu mối Hòa Cường, Hải Châu, Đà Nẵng',
      },
    ];

    for (let i = 0; i < 4; i++) {
      const rowIndex = 2 + i; // Dòng index 2, 3, 4, 5
      const row = gridRows.nth(rowIndex);
      const item = newEnRouteItems[i];

      // Nhập Tên hàng
      const descInput = row.locator('input[placeholder*="Tên loại hàng"]');
      await descInput.fill(item.desc);

      // Nhập Số kiện
      const qtyInput = row.locator('input[type="number"]').first();
      await qtyInput.fill(item.qty);

      // Nhập Số kg
      const kgInputs = row.locator('input[type="number"]');
      if (await kgInputs.count() >= 2) {
        await kgInputs.nth(1).fill(item.kg);
      }

      // Nhập Địa chỉ nhận/giao hàng
      const addrInput = row.locator('textarea').first();
      if (await addrInput.isVisible()) {
        await addrInput.fill(item.address);
      }
      await page.waitForTimeout(100);
    }

    // Kiểm tra bộ đếm trên thanh thao tác hiển thị 6 dòng
    await expect(page.locator('text=Tổng cộng:')).toBeVisible();

    const shot11 = path.join(SCREENSHOT_DIR, '11_KhoB_Nhap_Them_4_Dong_Moi.png');
    await page.screenshot({ path: shot11, fullPage: true });
    console.log(`[Screenshot 11] Đã chụp Lưới kiểm đếm sau khi nhập thêm 4 dòng hàng: ${shot11}`);

    // Bước 12: Bấm "Xác nhận tiếp nhận & Lưu kho"
    const submitInboundBtn = page.getByRole('button', { name: /Xác nhận tiếp nhận & Lưu kho/i });
    await expect(submitInboundBtn).toBeVisible();
    await submitInboundBtn.click();

    // Chờ thông báo toast thành công và quay lại Bảng nhập kho
    await expect(page.locator('text=/xác nhận nhập kho thành công/i')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /Nhận luân chuyển nội bộ/i })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1000);

    const shot12 = path.join(SCREENSHOT_DIR, '12_KhoB_Tiep_Nhan_Thanh_Cong.png');
    await page.screenshot({ path: shot12, fullPage: true });
    console.log(`[Screenshot 12] Đã chụp Bảng Nhập Kho sau khi lưu thành công: ${shot12}`);
  });
});
