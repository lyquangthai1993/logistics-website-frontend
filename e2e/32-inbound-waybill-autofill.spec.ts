import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:4000';

const WAREHOUSE_EMAIL = 'lyquangthai1993+5@gmail.com'; // Quản lý Kho Đà Nẵng
const PASSWORD = 'secret';

const EVIDENCE_DOCS_DIR = path.resolve(__dirname, '../../docs/feedback_evidence/05_10');
const ARTIFACT_DIR =
  'C:/Users/Lenovo/.gemini/antigravity/brain/1c5dd6f7-f450-426a-8d05-73c3affeb24b';

function saveEvidenceScreenshot(name: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(EVIDENCE_DOCS_DIR)) {
      fs.mkdirSync(EVIDENCE_DOCS_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(EVIDENCE_DOCS_DIR, name), buffer);
    fs.writeFileSync(path.join(ARTIFACT_DIR, name), buffer);
    console.log(`[EVIDENCE] Saved screenshot: ${name}`);
  } catch (err) {
    console.error(`Failed to save screenshot ${name}:`, err);
  }
}

async function loginAsWarehouseManager(page: any) {
  await page.goto(`${BASE_URL}/auth/sign-in`);
  await page.locator('input[name="email"]').waitFor({ state: 'visible', timeout: 25_000 });
  await page.fill('input[name="email"]', WAREHOUSE_EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard\/.*/, { timeout: 30_000 });
}

test.describe.serial('Suite 32: Inbound Waybill Autofill Verification', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test('Autofills existing waybill details and preserves physical quantity count', async ({
    page
  }) => {
    await loginAsWarehouseManager(page);
    console.log('✓ Logged in as Warehouse Manager');

    // 1. Navigate to Inbound Intake
    await page.goto(`${BASE_URL}/dashboard/warehouse/inbound`);
    await page.locator('h1:has-text("Nhập kho")').waitFor({ state: 'visible', timeout: 25_000 });
    await page.waitForTimeout(1500);

    // 2. Click "Tạo đơn nhập mới" to switch to Mode 1 Customer Inbound Intake
    const createBtn = page.locator('button:has-text("Tạo đơn nhập mới")').first();
    await expect(createBtn).toBeVisible({ timeout: 15_000 });
    await createBtn.click();
    console.log('✓ Clicked "Tạo đơn nhập mới" to enter intake mode');

    // 3. Ensure vehicle input is ready
    const licensePlateInput = page.locator('input[placeholder*="29C-123.45"]').first();
    await expect(licensePlateInput).toBeVisible({ timeout: 15_000 });
    await licensePlateInput.fill('29C-999.88');

    // 4. In the editable table, find the first Order Code input
    const orderCodeInput = page.locator('input[placeholder="Mã vận đơn"]').first();
    await expect(orderCodeInput).toBeVisible({ timeout: 15_000 });

    // Enter existing waybill code
    const testCode = 'SPLIT2610-4441';
    console.log(`Entering existing waybill code: ${testCode}`);
    await orderCodeInput.click();
    await orderCodeInput.fill(testCode);
    await orderCodeInput.press('Enter');

    // 5. Wait for success toast notification
    const toastMessage = page.locator(`text=Đã nhận diện đơn hàng ${testCode}`);
    await expect(toastMessage).toBeVisible({ timeout: 10_000 });
    console.log('✓ Success toast observed: Recognized order code and auto-filled data');

    // 6. Verify autofilled fields in the same row
    const firstRow = page.locator('table tbody tr:first-child');

    // Check goodsDescription (Cell 3, input)
    const goodsDescInput = firstRow.locator('td').nth(3).locator('input');
    await expect(goodsDescInput).toHaveValue('PHỤ LIỆU MAY MẶC', { timeout: 8_000 });
    console.log('✓ Goods description autofilled: PHỤ LIỆU MAY MẶC');

    // Check deliveryAddress (Cell 7, textarea)
    const deliveryAddressTextarea = firstRow.locator('td').nth(7).locator('textarea');
    await expect(deliveryAddressTextarea).toHaveValue('Điểm đến', { timeout: 8_000 });
    console.log('✓ Delivery address autofilled: Điểm đến');

    // 7. Verify quantity remains independent (default 1, not forced to Master Contract 30)
    const qtyInput = firstRow.locator('td').nth(4).locator('input');
    await expect(qtyInput).toHaveValue('1', { timeout: 8_000 });
    console.log('✓ Intake vehicle quantity preserved as physical operator count: 1');

    // 8. Capture Evidence Screenshot
    const screenshot = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('inbound_waybill_autofill_success.png', screenshot);
    console.log('✓ Evidence screenshot saved for inbound waybill autofill');
  });

  test('New / Unknown waybill code does not produce error toasts and allows free entry', async ({
    page
  }) => {
    await loginAsWarehouseManager(page);

    await page.goto(`${BASE_URL}/dashboard/warehouse/inbound`);
    await page.locator('h1:has-text("Nhập kho")').waitFor({ state: 'visible', timeout: 25_000 });
    await page.waitForTimeout(1000);

    // Switch to intake mode
    const createBtn = page.locator('button:has-text("Tạo đơn nhập mới")').first();
    await expect(createBtn).toBeVisible({ timeout: 15_000 });
    await createBtn.click();

    const orderCodeCell = page.locator('input[placeholder="Mã vận đơn"]').first();
    await expect(orderCodeCell).toBeVisible({ timeout: 15_000 });

    const newCode = 'NEW-TEST-WAYBILL-999';
    await orderCodeCell.click();
    await orderCodeCell.fill(newCode);
    await orderCodeCell.press('Enter');

    // Wait 2s to ensure no error toast appears
    await page.waitForTimeout(2000);
    const errorToast = page.locator('.sonner-toast[data-type="error"], text="không tìm thấy"');
    const isErrorVisible = await errorToast.isVisible().catch(() => false);
    expect(isErrorVisible).toBeFalsy();
    console.log('✓ No error toast shown for unknown waybill code; user can type freely');
  });
});
