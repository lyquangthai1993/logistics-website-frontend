import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'http://localhost:4000';

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../feedbacks/feedback_29_10_pending_inbound_trip_draft_lock'
);

test.describe.serial('Feedback 29/10 — Khóa Xác Nhận Xuất Kho & Kiểm Thử Toàn Diện Nút Tiếp Nhận Đơn Lẻ', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Giao diện Xuất Kho MODE 1 (Khách) phát hiện đơn còn chuyến nhập nháp -> Hiển thị cảnh báo và khóa Xác nhận xuất kho', async ({
    page
  }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Đăng nhập với tài khoản Thủ kho HCM
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    // 2. Vào trang Xuất Kho (/dashboard/warehouse/outbound)
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);

    // 3. Mở form Xuất kho bằng nút "Xuất kho" ở header
    const outboundBtn = page.locator('button:has-text("Xuất kho")').first();
    await expect(outboundBtn).toBeVisible({ timeout: 15000 });
    await outboundBtn.click();
    await page.waitForTimeout(2000);

    // 4. Tìm ô nhập mã vận đơn trong cột 1 của dòng 01
    const cell = page.locator('tbody tr').first().locator('td').nth(1);
    const codeInput = cell.locator('input');
    await expect(codeInput).toBeVisible({ timeout: 15000 });
    
    // Gõ mã đơn hàng NMT2611-0003 (đơn thuộc chuyến nhập PENDING SD627)
    await codeInput.fill('NMT2611-0003');
    await page.waitForTimeout(500);
    await codeInput.press('Enter');
    await page.waitForTimeout(3500);

    // 5. Kiểm tra cảnh báo hiển thị trên giao diện
    const warningBadge = page.locator('text=Chỉ được Lưu nháp').first();
    await expect(warningBadge).toBeVisible({ timeout: 10000 });

    // 6. Kiểm tra nút "Xác nhận xuất kho" bị DISABLED
    const confirmBtn = page.locator('button:has-text("Xác nhận xuất kho")').first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    expect(await confirmBtn.isDisabled()).toBe(true);

    // 7. Kiểm tra nút "Lưu nháp (Chờ xử lý)" màu cam sẵn sàng
    const draftBtn = page.locator('button:has-text("Lưu nháp (Chờ xử lý)")').first();
    await expect(draftBtn).toBeVisible({ timeout: 5000 });
    expect(await draftBtn.isDisabled()).toBe(false);

    // Chụp ảnh bằng chứng
    const screenshotPath = path.join(EVIDENCE_DIR, 'step_01_outbound_locked_draft_only.png');
    await page.screenshot({ path: screenshotPath });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test('CASE-02: Modal chuyến xe nhập kho Chờ xử lý: Kiểm tra hiển thị nút tiếp nhận đơn lẻ, bấm tiếp nhận -> dòng bị làm mờ & chuyển sang Checkmark xanh (không mở phiếu in lẻ)', async ({
    page
  }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Đăng nhập với tài khoản Thủ kho HCM
    await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

    // 2. Vào trang Nhập Kho (/dashboard/warehouse/inbound)
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);

    // Chuyển sang tab "Chờ xử lý"
    const pendingTab = page.locator('button:has-text("Chờ xử lý")').first();
    if (await pendingTab.isVisible()) {
      await pendingTab.click();
      await page.waitForTimeout(1500);
    }

    // 3. Tìm chuyến xe gom khách Chờ xử lý có nút "Tiếp tục" (ưu tiên chuyến có nhiều đơn như SD685)
    const tripRows = page.locator('table tbody tr', { has: page.locator('button:has-text("Tiếp tục")') });
    await expect(tripRows.first()).toBeVisible({ timeout: 15000 });
    const multiOrderTrip = tripRows.filter({ hasText: 'đơn' }).first();
    const targetTrip = (await multiOrderTrip.isVisible().catch(() => false)) ? multiOrderTrip : tripRows.first();
    const continueBtn = targetTrip.locator('button:has-text("Tiếp tục")').first();
    await expect(continueBtn).toBeVisible({ timeout: 15000 });

    // Click nút Tiếp tục để mở modal chi tiết chuyến xe
    await continueBtn.click();
    await page.waitForTimeout(3000);

    // 4. Kiểm tra modal chi tiết chuyến xe mở ra
    const modalContent = page.locator('div[role="dialog"]').first();
    await expect(modalContent).toBeVisible({ timeout: 15000 });

    // 5. Kiểm tra các nút thao tác tiếp nhận đơn lẻ trong bảng (IconBuildingWarehouse)
    const singleInboundBtns = modalContent.locator('button[title*="Nhập kho đơn hàng này"]');
    const initialCount = await singleInboundBtns.count();
    expect(initialCount).toBeGreaterThan(0);

    // 6. EDGE CASE TEST: Bấm nút tiếp nhận đơn lẻ đầu tiên
    const firstSingleBtn = singleInboundBtns.first();
    await firstSingleBtn.click();

    // Đợi phản hồi thành công từ backend
    await page.waitForTimeout(4000);

    // Kiểm tra toast thông báo thành công xuất hiện
    const toastSuccess = page.locator('text=thành công! Sẵn sàng xuất kho');
    await expect(toastSuccess).toBeVisible({ timeout: 10000 });

    // 7. EDGE CASE TEST: Sau khi nhận lẻ thành công:
    // a. Nút của dòng đó chuyển thành Checkmark xanh (IconCircleCheck) có title="Đơn hàng đã nhập kho"
    const checkedBtns = modalContent.locator('button[title*="Đơn hàng đã nhập kho"]');
    const checkedCount = await checkedBtns.count();
    expect(checkedCount).toBeGreaterThan(0);

    // b. Tuyệt đối KHÔNG mở modal in phiếu nhập kho lẻ
    const receiptModal = page.locator('text=PHIẾU NHẬP KHO');
    expect(await receiptModal.isVisible()).toBe(false);

    // c. Chuyến xe VẪN GIỮ TRẠNG THÁI Chờ xử lý (Modal không bị tự đóng hay đóng chuyến)
    expect(await modalContent.isVisible()).toBe(true);

    // Chụp ảnh bằng chứng modal tiếp nhận
    const screenshotPath = path.join(EVIDENCE_DIR, 'step_02_inbound_single_buttons_active.png');
    await modalContent.screenshot({ path: screenshotPath });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });
});
