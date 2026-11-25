import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { clearSession, loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:4000';
const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../feedbacks/feedback_24_11_inbound_receipt_confirmed_values'
);

type QuantityCase = {
  name: string;
  draft: number[];
  confirmed: number[];
};

const CASES: QuantityCase[] = [
  {
    name: 'three rows with large quantity corrections',
    draft: [38, 330, 1],
    confirmed: [2, 353, 4]
  },
  {
    name: 'three rows with near-boundary corrections',
    draft: [19, 306, 20],
    confirmed: [21, 305, 18]
  },
  {
    name: 'five rows with mixed corrections',
    draft: [2, 19, 306, 353, 1],
    confirmed: [3, 18, 300, 360, 2]
  }
];

async function createPendingInboundTrip(page: Page, quantities: number[]) {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-8);
  const orderCodes = quantities.map((_, index) => `TST2611-${suffix}-${index + 1}`);

  await page.goto(`${FRONTEND_URL}/dashboard/warehouse/inbound`);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('heading', { name: /Nhập kho/i })).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: /Tạo đơn nhập mới|Tạo đơn mới/i }).first().click();

  const form = page.locator('main').first();
  const plate = form.locator('input[placeholder*="29C"]').first();
  await expect(plate).toBeVisible({ timeout: 10000 });
  await plate.fill(`51T-${suffix.slice(-5)}`);

  const driver = form.locator('input[placeholder*="Nguyễn Văn A"]').first();
  await driver.fill(`Test receipt ${suffix}`);

  for (let index = 1; index < quantities.length; index += 1) {
    await form.getByRole('button', { name: /Thêm 1 dòng đơn mới/i }).click();
  }

  const orderInputs = form.locator('input[placeholder="Mã vận đơn"]');
  const provinceInputs = form.locator('input[placeholder="Tìm tỉnh/thành..."]');
  await expect(orderInputs).toHaveCount(quantities.length);
  await expect(provinceInputs).toHaveCount(quantities.length);

  for (let index = 0; index < quantities.length; index += 1) {
    await orderInputs.nth(index).fill(orderCodes[index]);
    await provinceInputs.nth(index).fill('Hồ Chí Minh');
    await form.getByTestId(`input-quantity-${index}`).fill(String(quantities[index]));
    await form.getByTestId(`input-weight-${index}`).fill(String(quantities[index] * 10));
    await form.getByTestId(`input-volume-${index}`).fill(String(quantities[index] / 10));
  }

  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/warehouse/inbound/batch-create') &&
      response.request().method() === 'POST',
    { timeout: 15000 }
  );
  await form.getByRole('button', { name: /Lưu nháp/i }).first().click();
  const savedDraftResponse = await saveResponse;
  expect(savedDraftResponse.ok()).toBeTruthy();
  const savedDraftBody = await savedDraftResponse.json();
  const savedDraft = savedDraftBody?.data ?? savedDraftBody;
  const tripCode = savedDraft?.tripCode as string | undefined;
  expect(tripCode).toMatch(/^SD\d+/i);

  const boardSearch = page.locator('input[placeholder*="Tìm mã chuyến"]').first();
  await expect(boardSearch).toBeVisible({ timeout: 10000 });
  await boardSearch.fill(tripCode as string);
  await boardSearch.press('Enter');

  const boardRow = page.locator('table tbody tr').filter({ hasText: tripCode as string }).first();
  await expect(boardRow).toBeVisible({ timeout: 15000 });
  const continueButton = boardRow.getByRole('button', { name: /Tiếp tục/i });
  await expect(continueButton).toBeVisible();
  await continueButton.click();

  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await expect(dialog.getByTestId('input-quantity-0')).toHaveValue(String(quantities[0]));

  return { dialog, orderCodes };
}

test.describe('Inbound receipt uses confirmed quantities', () => {
  test.describe.configure({ mode: 'serial' });

  for (const scenario of CASES) {
    test(`draft -> edit -> confirm: ${scenario.name}`, async ({ page }, testInfo) => {
      test.setTimeout(90000);
      await clearSession(page);
      await page.goto(`${FRONTEND_URL}/auth/sign-in`);
      await loginAs(page, USER_WAREHOUSE_HCM, FRONTEND_URL);

      const { dialog, orderCodes } = await createPendingInboundTrip(page, scenario.draft);

      for (let index = 0; index < scenario.confirmed.length; index += 1) {
        await dialog
          .getByTestId(`input-quantity-${index}`)
          .fill(String(scenario.confirmed[index]));
        await dialog
          .getByTestId(`input-weight-${index}`)
          .fill(String(scenario.confirmed[index] * 11));
        await dialog
          .getByTestId(`input-volume-${index}`)
          .fill(String(scenario.confirmed[index] / 10));
      }

      const expectedTotal = scenario.confirmed.reduce((sum, quantity) => sum + quantity, 0);
      const confirmRequest = page.waitForRequest(
        (request) =>
          request.url().includes('/api/v1/warehouse/inbound/confirm') &&
          request.method() === 'POST',
        { timeout: 15000 }
      );
      const confirmResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/warehouse/inbound/confirm') &&
          response.request().method() === 'POST',
        { timeout: 15000 }
      );
      const receiptResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/warehouse/inbound/receipt-data') &&
          response.request().method() === 'GET',
        { timeout: 15000 }
      );

      await dialog.getByRole('button', { name: /Xác nhận nhập kho/i }).first().click();

      const confirm = await confirmResponse;
      expect(confirm.ok()).toBeTruthy();
      const confirmPayload = (await confirmRequest).postDataJSON();
      const confirmOrders = confirmPayload?.orders ?? [];
      expect(confirmOrders).toHaveLength(scenario.confirmed.length);
      expect(confirmOrders.map((order: { totalQuantity: number }) => order.totalQuantity)).toEqual(
        scenario.confirmed
      );

      const receiptBody = await (await receiptResponse).json();
      const receipt = receiptBody?.data ?? receiptBody;
      const receiptItems = receipt.items as Array<{ orderCode: string; quantity: number }>;
      expect(receiptItems.length).toBeGreaterThanOrEqual(scenario.confirmed.length);
      expect(receipt.totalQuantity).toBe(expectedTotal);

      for (let index = 0; index < orderCodes.length; index += 1) {
        const item = receiptItems.find((candidate) => candidate.orderCode === orderCodes[index]);
        expect(item, `Missing receipt line for ${orderCodes[index]}`).toBeTruthy();
        expect(item?.quantity).toBe(scenario.confirmed[index]);
        expect(item?.quantity).not.toBe(scenario.draft[index]);
      }

      await expect(page.getByText(/Phiếu Nhập Kho/i).last()).toBeVisible({ timeout: 10000 });
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `screenshot_${testInfo.workerIndex + 1}_${testInfo.testId}.png`),
        fullPage: false
      });
    });
  }
});


