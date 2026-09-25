import { test, expect } from '@playwright/test';
import { loginAs, clearSession } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

const EVIDENCE_DIR = 'C:/Users/Lenovo/.gemini/antigravity/brain/ed7ebd18-a41f-4256-b1d5-9a3f8e264115/evidence';

const WAREHOUSE_USER = {
  email: 'lyquangthai1993+4@gmail.com',
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

test.describe('Phân Hệ Nhập Kho - Bổ Sung Cột Chứng Từ Đi Kèm (Optional) & Kiểm Chứng Đối Soát UI', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Flow nhập đơn mới có cột Chứng từ đi kèm, lưu kho thành công và kiểm chứng đối soát trên UI', async ({ page }) => {
    // ── 1. Đăng nhập với quyền Quản lý Kho ───────────────────────────────────
    await loginAs(page, WAREHOUSE_USER);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    // Chờ tiêu đề trang xuất hiện
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 15_000 });

    // ── 2. Chuyển sang Mode 1 (Tạo đơn nhập mới từ khách hàng) ────────────────
    const newOrderBtn = page.getByRole('button', { name: /Tạo đơn nhập mới/ });
    await expect(newOrderBtn).toBeVisible();
    await newOrderBtn.click();

    // Xác nhận tiêu đề và form tạo đơn nhập kho xuất hiện
    await expect(page.locator('text=1. Ngày tiếp nhận')).toBeVisible();
    await expect(page.locator('text=2. Biển số xe')).toBeVisible();

    // ── 3. Kiểm tra sự hiện diện của Cột CHỨNG TỪ ĐI KÈM ─────────────────────
    const docsHeader = page.locator('th:has-text("CHỨNG TỪ ĐI KÈM")');
    await expect(docsHeader).toBeVisible();

    // ── 4. Nhập thông tin xe tiếp nhận ───────────────────────────────────────
    const licensePlateInput = page.locator('input[placeholder*="29C-123.45"]');
    const testPlate = '51D-' + Math.floor(100 + Math.random() * 900) + '.99';
    await licensePlateInput.fill(testPlate);

    const driverNameInput = page.locator('input[placeholder*="Nguyễn Văn A"]');
    await driverNameInput.fill('Nguyễn Văn Đối Soát');

    // ── 5. Nhập Dòng 1: Đơn có 1 BCT (sử dụng pill chọn nhanh "1 BCT") ────────
    const goodsInput1 = page.locator('input[placeholder="Tên loại hàng..."]').nth(0);
    await goodsInput1.fill('Hàng điện tử đóng kiện E2E');

    const qtyInput1 = page.locator('table tbody tr').nth(0).locator('td:nth-child(5) input');
    await qtyInput1.fill('15');

    const weightInput1 = page.locator('table tbody tr').nth(0).locator('td:nth-child(6) input');
    await weightInput1.fill('120');

    const volumeInput1 = page.locator('table tbody tr').nth(0).locator('td:nth-child(7) input');
    await volumeInput1.fill('0.8');

    const addressInput1 = page.locator('table tbody tr').nth(0).locator('textarea[placeholder*="địa chỉ giao hàng"]');
    await addressInput1.fill('123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM');

    const provinceInput1 = page.locator('table tbody tr').nth(0).locator('textarea[placeholder*="Hà Nội, TP.HCM"]');
    await provinceInput1.fill('TP.HCM');

    // Click quick pill "1 BCT" trên dòng 1
    const pill1BCT = page.locator('table tbody tr').nth(0).getByRole('button', { name: '1 BCT' });
    await expect(pill1BCT).toBeVisible();
    await pill1BCT.click();

    // Xác nhận ô input chứng từ đã nhận giá trị "1 BCT"
    const docsInput1 = page.locator('table tbody tr').nth(0).locator('input[placeholder*="1 BCT, KHÔNG CÓ"]');
    await expect(docsInput1).toHaveValue('1 BCT');

    const notesInput1 = page.locator('table tbody tr').nth(0).locator('textarea[placeholder*="Ghi chú bốc dỡ"]');
    await notesInput1.fill('Đơn hàng có 1 bộ chứng từ gốc kèm xe');

    // ── 6. Thêm Dòng 2: Đơn KHÔNG CÓ chứng từ (sử dụng pill "Không có") ────────
    const addRowBtn = page.getByRole('button', { name: /Thêm 1 dòng đơn mới/ });
    await addRowBtn.click();

    // Chờ dòng 2 xuất hiện
    await expect(page.locator('table tbody tr').nth(1)).toBeVisible();

    const goodsInput2 = page.locator('input[placeholder="Tên loại hàng..."]').nth(1);
    await goodsInput2.fill('Bao bì carton phụ liệu không chứng từ');

    const qtyInput2 = page.locator('table tbody tr').nth(1).locator('td:nth-child(5) input');
    await qtyInput2.fill('10');

    const weightInput2 = page.locator('table tbody tr').nth(1).locator('td:nth-child(6) input');
    await weightInput2.fill('50');

    const volumeInput2 = page.locator('table tbody tr').nth(1).locator('td:nth-child(7) input');
    await volumeInput2.fill('0.3');

    const addressInput2 = page.locator('table tbody tr').nth(1).locator('textarea[placeholder*="địa chỉ giao hàng"]');
    await addressInput2.fill('456 Đường Võ Văn Tần, Quận 3, TP.HCM');

    const provinceInput2 = page.locator('table tbody tr').nth(1).locator('textarea[placeholder*="Hà Nội, TP.HCM"]');
    await provinceInput2.fill('TP.HCM');

    // Click quick pill "Không có" trên dòng 2
    const pillNoDocs = page.locator('table tbody tr').nth(1).getByRole('button', { name: 'Không có' });
    await expect(pillNoDocs).toBeVisible();
    await pillNoDocs.click();

    // Xác nhận ô input chứng từ dòng 2 đã nhận giá trị "KHÔNG CÓ"
    const docsInput2 = page.locator('table tbody tr').nth(1).locator('input[placeholder*="1 BCT, KHÔNG CÓ"]');
    await expect(docsInput2).toHaveValue('KHÔNG CÓ');

    const notesInput2 = page.locator('table tbody tr').nth(1).locator('textarea[placeholder*="Ghi chú bốc dỡ"]');
    await notesInput2.fill('Hàng lẻ nội địa không kèm chứng từ');

    // Chụp ảnh bằng chứng 1: Bảng tạo đơn nhập kho có Cột Chứng từ đi kèm
    const screenshot1 = path.join(EVIDENCE_DIR, '01_INBOUND_CREATE_WITH_ACCOMPANYING_DOCS.png');
    await page.screenshot({ path: screenshot1, fullPage: true });
    console.log('Saved screenshot 1:', screenshot1);

    // ── 7. Xác nhận Tiếp Nhận & Lưu Kho ──────────────────────────────────────
    const submitBtn = page.getByRole('button', { name: /Xác nhận tiếp nhận & Lưu kho/ });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Chờ quay trở lại Inbound Board
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2000);

    // ── 8. Đối soát trên UI Inbound Board ─────────────────────────────────────
    // Tìm chuyến xe vừa tạo theo biển số xe
    const vehicleRow = page.locator(`tr:has-text("${testPlate}")`).first();
    await expect(vehicleRow).toBeVisible({ timeout: 10_000 });

    // Mở rộng chi tiết các đơn của xe
    const expandBtn = vehicleRow.getByRole('button', { name: /Xem đơn/i });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }
    await page.waitForTimeout(1000);

    // Hàng mở rộng chi tiết nằm ngay sau vehicleRow
    const expandedRow = vehicleRow.locator('+ tr');
    const nestedTable = expandedRow.locator('table');
    await expect(nestedTable).toBeVisible();
    await expect(nestedTable.locator('th:has-text("CHỨNG TỪ")')).toBeVisible();

    // Kiểm tra Badge "1 BCT" (xanh lá) và Badge "KHÔNG CÓ" / "Không có"
    await expect(nestedTable.locator('text=1 BCT')).toBeVisible();
    await expect(nestedTable.locator('text=KHÔNG CÓ').or(nestedTable.locator('text=Không có'))).toBeVisible();

    // Chụp ảnh bằng chứng 2: Bảng đối soát Inbound Board hiển thị cột Chứng từ đi kèm
    const screenshot2 = path.join(EVIDENCE_DIR, '02_INBOUND_BOARD_RECONCILIATION_DOCS.png');
    await page.screenshot({ path: screenshot2, fullPage: true });
    console.log('Saved screenshot 2:', screenshot2);

    // ── 9. Kiểm tra Modal Chi Tiết Vận Đơn (Waybill Detail) ───────────────────
    const rowWith1BCT = nestedTable.locator('tbody tr:has-text("1 BCT")').first();
    const orderLinkBtn = rowWith1BCT.locator('button').first();
    if (await orderLinkBtn.isVisible()) {
      await orderLinkBtn.click();

      // Xác nhận Modal chi tiết mở ra
      const detailModal = page.locator('[role="dialog"]');
      await expect(detailModal.locator('text=Chi tiết đơn hàng tiếp nhận kho')).toBeVisible({ timeout: 5_000 });

      // Bảng danh mục hàng hóa trong modal phải có cột CHỨNG TỪ
      await expect(detailModal.locator('th:has-text("CHỨNG TỪ")')).toBeVisible();
      await expect(detailModal.locator('td:has-text("1 BCT")')).toBeVisible();

      // Chụp ảnh bằng chứng 3: Modal chi tiết đơn hàng hiển thị cột Chứng từ
      const screenshot3 = path.join(EVIDENCE_DIR, '03_WAYBILL_DETAIL_MODAL_DOCS.png');
      await page.screenshot({ path: screenshot3 });
      console.log('Saved screenshot 3:', screenshot3);

      // Đóng modal
      await detailModal.getByRole('button', { name: 'Đóng' }).click();
      await expect(detailModal).not.toBeVisible({ timeout: 5_000 });
      await page.waitForTimeout(500);
    }

    // ── 10. Kiểm tra Phiếu Nhập Kho A4 (Inbound Receipt Modal) ───────────────
    const printReceiptBtn = vehicleRow.getByRole('button', { name: /In phiếu nhập/i }).first();
    if (await printReceiptBtn.isVisible()) {
      await printReceiptBtn.click();

      // Xác nhận Modal In Phiếu Nhập hiển thị
      const receiptModal = page.locator('[role="dialog"]');
      await expect(receiptModal.locator('text=Phiếu Nhập Kho').first()).toBeVisible({ timeout: 5_000 });

      // Kiểm tra cột Chứng từ đi kèm hiển thị giá trị thực tế
      await expect(receiptModal.locator('th:has-text("Chứng từ đi kèm")')).toBeVisible();
      await expect(receiptModal.locator('td:has-text("1 BCT")')).toBeVisible();

      // Chụp ảnh bằng chứng 4: Modal Phiếu Nhập Kho A4 hiển thị cột Chứng từ kèm theo
      const screenshot4 = path.join(EVIDENCE_DIR, '04_INBOUND_RECEIPT_MODAL_DOCS.png');
      await page.screenshot({ path: screenshot4 });
      console.log('Saved screenshot 4:', screenshot4);

      // Đóng modal phiếu nhập
      await receiptModal.getByRole('button', { name: 'Đóng' }).click();
      await expect(receiptModal).not.toBeVisible({ timeout: 5_000 });
    }
  });
});

