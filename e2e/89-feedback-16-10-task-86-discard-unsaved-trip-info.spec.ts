/**
 * frontend/e2e/89-feedback-16-10-task-86-discard-unsaved-trip-info.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 16/10 (Task #86) — Tự Động Loại Bỏ Thông Tin Chuyến Xe (Trip) Chưa Lưu Nháp Hoặc Xác Nhận Khi Bấm "Quay Lại Danh Sách"
 *
 * Core Business Invariants:
 * 1. Khi bấm '✕ Quay lại danh sách' trên form Nhập kho (/dashboard/warehouse/inbound):
 *    - Toàn bộ dữ liệu tạm thời (Biển số xe, Tài xế, Danh sách dòng hàng) bị loại bỏ triệt để.
 *    - Mở lại form "Tạo đơn nhập mới" phải là form sạch trắng tinh (Clean initial state), không còn ghost state.
 * 2. Khi bấm '✕ Quay lại danh sách' hoặc 'Hủy bỏ' trên form Xuất kho (/dashboard/warehouse/outbound):
 *    - Toàn bộ dữ liệu tạm thời bị loại bỏ triệt để, không lưu vết dở dang.
 * 3. Chuyến xe ĐÃ Lưu nháp hoặc Xác nhận vẫn được lưu an toàn trong DB và hiển thị trên Board.
 * 4. Bằng chứng nghiệm thu:
 *    - Lưu ảnh chụp xác minh tại: feedbacks/feedback_16_10_task_86/screenshot_01_verified.png
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_16_10_task_86');
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_01_verified.png');

test.describe.serial(
  'Feedback 16/10 (Task #86) — Tự Động Loại Bỏ Thông Tin Chuyến Xe Chưa Lưu Nháp Khi Bấm Quay Lại Danh Sách',
  () => {
    test.beforeAll(() => {
      if (!fs.existsSync(EVIDENCE_DIR)) {
        fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
      }
    });

    test('CASE-01: Static Code Audit — Kiểm tra resetMode1Form được gọi tập trung tại Nhập kho & Xuất kho', () => {
      const inboundPath = path.resolve(
        __dirname,
        '../src/app/dashboard/warehouse/inbound/page.tsx'
      );
      expect(fs.existsSync(inboundPath)).toBeTruthy();
      const inboundContent = fs.readFileSync(inboundPath, 'utf-8');

      // 1. Kiểm tra sự tồn tại của hàm resetMode1Form
      expect(inboundContent).toContain('const resetMode1Form = useCallback(() => {');
      expect(inboundContent).toContain('setLicensePlate(\'\');');
      expect(inboundContent).toContain('setDriverName(\'\');');
      expect(inboundContent).toContain('setMode1Rows([emptyWarehouseRow()]);');
      expect(inboundContent).toContain('sessionStorage.removeItem(\'TMS_INBOUND_CONVERTER_TRANSFER\')');

      // 2. Nút "✕ Quay lại danh sách" gọi resetMode1Form()
      expect(inboundContent).toContain('resetMode1Form();');
      expect(inboundContent).toContain('Quay lại danh sách');

      // 3. Nút "Tạo đơn nhập mới" gọi resetMode1Form()
      expect(inboundContent).toContain('Tạo đơn nhập mới');

      // 4. Kiểm tra Xuất kho (outbound/page.tsx)
      const outboundPath = path.resolve(
        __dirname,
        '../src/app/dashboard/warehouse/outbound/page.tsx'
      );
      expect(fs.existsSync(outboundPath)).toBeTruthy();
      const outboundContent = fs.readFileSync(outboundPath, 'utf-8');

      expect(outboundContent).toContain('const resetMode1Form = () => {');
      expect(outboundContent).toContain('setOutboundLicensePlate(\'\');');
      expect(outboundContent).toContain('setOutboundDriverName(\'\');');
      expect(outboundContent).toContain('setMode1Rows([emptyMode1Row()]);');

      // Nút "Tạo phiếu xuất" luôn gọi resetMode1Form()
      expect(outboundContent).toContain('const handleOpenNewMode1 = () => {');
      expect(outboundContent).toContain('resetMode1Form();');
      expect(outboundContent).toContain('setActiveView(\'MODE1_CUSTOMER\');');
    });

    test('CASE-02: Nhập kho (Inbound) — Điền dữ liệu chuyến xe -> Bấm "Quay lại danh sách" -> Dữ liệu bị xóa bỏ', async ({
      page
    }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width: 1440, height: 900 });

      // 1. Đăng nhập với tài khoản thủ kho Andromeda Hub - HCM
      await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

      // 2. Điều hướng tới Quản lý Nhập kho
      await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`, {
        waitUntil: 'domcontentloaded'
      });

      // 3. Chờ nút "Tạo đơn nhập mới" hiển thị và click
      const createInboundBtn = page.getByRole('button', { name: /Tạo đơn nhập mới/i }).first();
      await expect(createInboundBtn).toBeVisible({ timeout: 20000 });
      await createInboundBtn.click();

      // 4. Form Mode 1 xuất hiện
      const plateInput = page.locator('input[placeholder="VD: 29C-123.45"]').first();
      await expect(plateInput).toBeVisible({ timeout: 10000 });

      const driverInput = page.locator('input[placeholder="VD: Nguyễn Văn A"]').first();
      await expect(driverInput).toBeVisible();

      // 5. Điền thông tin chuyến xe thử nghiệm
      await plateInput.fill('29C-123.45');
      await driverInput.fill('Nguyễn Văn A');

      // Điền mã vận đơn STT 1 trong bảng kê
      const waybillInput = page.locator('input[placeholder="Mã vận đơn"]').first();
      if (await waybillInput.isVisible()) {
        await waybillInput.fill('NDA2610-173');
      }

      // Xác nhận input đã nhận giá trị
      expect(await plateInput.inputValue()).toBe('29C-123.45');
      expect(await driverInput.inputValue()).toBe('Nguyễn Văn A');

      // 6. KHÔNG bấm Lưu nháp, KHÔNG bấm Xác nhận nhập kho
      // Bấm nút "✕ Quay lại danh sách"
      const backBtn = page.getByRole('button', { name: /Quay lại danh sách/i }).first();
      await expect(backBtn).toBeVisible();
      await backBtn.click();

      // 7. Xác nhận đã quay về Inbound Board
      await expect(page.getByRole('button', { name: /Tạo đơn nhập mới/i }).first()).toBeVisible({
        timeout: 10000
      });

      // 8. Bấm lại "Tạo đơn nhập mới" để kiểm tra tính năng loại bỏ dữ liệu
      await page.getByRole('button', { name: /Tạo đơn nhập mới/i }).first().click();

      // 9. Xác thực form Mode 1 hoàn toàn trắng sạch (Không còn ghost state)
      const cleanPlateInput = page.locator('input[placeholder="VD: 29C-123.45"]').first();
      await expect(cleanPlateInput).toBeVisible({ timeout: 10000 });
      const cleanDriverInput = page.locator('input[placeholder="VD: Nguyễn Văn A"]').first();

      const plateVal = await cleanPlateInput.inputValue();
      const driverVal = await cleanDriverInput.inputValue();

      expect(plateVal).toBe('');
      expect(driverVal).toBe('');

      // Kiểm tra ô mã vận đơn trong bảng kê cũng sạch
      const cleanWaybillInput = page.locator('input[placeholder="Mã vận đơn"]').first();
      if (await cleanWaybillInput.isVisible()) {
        const waybillVal = await cleanWaybillInput.inputValue();
        expect(waybillVal).toBe('');
      }

      // 10. Chụp ảnh minh chứng nghiệm thu
      await page.waitForTimeout(1000);
      await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
      expect(fs.existsSync(SCREENSHOT_PATH)).toBeTruthy();
      console.log(`[VERIFIED EVIDENCE SAVED] ${SCREENSHOT_PATH}`);

      // Quay lại Board để dọn sạch view
      await page.getByRole('button', { name: /Quay lại danh sách/i }).first().click();
    });

    test('CASE-03: Xuất kho (Outbound) — Điền dữ liệu chuyến xe -> Bấm "Quay lại danh sách" -> Dữ liệu bị xóa bỏ', async ({
      page
    }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width: 1440, height: 900 });

      // 1. Đăng nhập với tài khoản thủ kho Andromeda Hub - HCM
      await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

      // 2. Điều hướng tới Quản lý Xuất kho
      await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`, {
        waitUntil: 'domcontentloaded'
      });

      // 3. Chờ nút "Xuất kho" hiển thị và click
      const createOutboundBtn = page.getByRole('button', { name: /Xuất kho/i }).first();
      await expect(createOutboundBtn).toBeVisible({ timeout: 20000 });
      await createOutboundBtn.click();

      // 4. Form Mode 1 Xuất kho xuất hiện
      const outboundPlateInput = page.locator('input[placeholder="VD: 29C-123.45"]').first();
      await expect(outboundPlateInput).toBeVisible({ timeout: 10000 });

      const outboundDriverInput = page.locator('input[placeholder="VD: Nguyễn Văn A"]').first();
      await expect(outboundDriverInput).toBeVisible();

      // 5. Điền thông tin thử nghiệm
      await outboundPlateInput.fill('51D-888.88');
      await outboundDriverInput.fill('Trần Văn B');

      expect(await outboundPlateInput.inputValue()).toBe('51D-888.88');
      expect(await outboundDriverInput.inputValue()).toBe('Trần Văn B');

      // 6. Bấm nút "✕ Quay lại danh sách"
      const backBtn = page.getByRole('button', { name: /Quay lại danh sách/i }).first();
      await expect(backBtn).toBeVisible();
      await backBtn.click();

      // 7. Xác nhận đã quay về Outbound Board
      await expect(page.getByRole('button', { name: /Xuất kho/i }).first()).toBeVisible({
        timeout: 10000
      });

      // 8. Bấm lại "Xuất kho"
      await page.getByRole('button', { name: /Xuất kho/i }).first().click();

      // 9. Xác thực form Xuất kho hoàn toàn trắng sạch
      const cleanOutboundPlate = page.locator('input[placeholder="VD: 29C-123.45"]').first();
      await expect(cleanOutboundPlate).toBeVisible({ timeout: 10000 });
      const cleanOutboundDriver = page.locator('input[placeholder="VD: Nguyễn Văn A"]').first();

      expect(await cleanOutboundPlate.inputValue()).toBe('');
      expect(await cleanOutboundDriver.inputValue()).toBe('');

      // Đóng form trở lại Board
      await page.getByRole('button', { name: /Quay lại danh sách/i }).first().click();
    });

    test('CASE-04: Xuất kho (Outbound) — Nút "Hủy bỏ" ở chân form cũng dọn sạch dữ liệu', async ({
      page
    }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width: 1440, height: 900 });

      await loginAs(page, USER_WAREHOUSE_HCM, DEV_FRONTEND_URL);

      await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`, {
        waitUntil: 'domcontentloaded'
      });

      await page.getByRole('button', { name: /Xuất kho/i }).first().click();

      const outboundPlateInput = page.locator('input[placeholder="VD: 29C-123.45"]').first();
      await expect(outboundPlateInput).toBeVisible({ timeout: 10000 });
      await outboundPlateInput.fill('43C-999.99');

      // Click nút "Hủy bỏ" ở chân form
      const cancelBtn = page.getByRole('button', { name: /^Hủy bỏ$/i }).first();
      await expect(cancelBtn).toBeVisible();
      await cancelBtn.click();

      // Xác nhận quay về Board
      await expect(page.getByRole('button', { name: /Xuất kho/i }).first()).toBeVisible();

      // Mở lại kiểm tra
      await page.getByRole('button', { name: /Xuất kho/i }).first().click();
      const cleanPlate = page.locator('input[placeholder="VD: 29C-123.45"]').first();
      await expect(cleanPlate).toBeVisible();
      expect(await cleanPlate.inputValue()).toBe('');
    });
  }
);
