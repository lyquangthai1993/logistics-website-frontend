import { test, expect } from '@playwright/test';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4000';
const API_URL = process.env.API_URL ?? 'http://localhost:4001/api/v1';

test('auto-calculates outbound weight and volume after quantity settles', async ({
  page,
  request
}) => {
  const loginResponse = await request.post(`${API_URL}/auth/email/login`, {
    data: {
      email: USER_WAREHOUSE_HCM.username || USER_WAREHOUSE_HCM.email,
      password: USER_WAREHOUSE_HCM.password
    },
    timeout: 15000
  });
  expect(loginResponse.ok()).toBeTruthy();
  const loginBody = await loginResponse.json();
  const auth = loginBody?.data ?? loginBody;
  const token = auth?.token || auth?.accessToken;
  expect(token).toBeTruthy();

  const suffix = Date.now().toString().slice(-7);
  const orderCode = `AUTO-CALC-${suffix}`;
  const hubId = Number(auth.user?.hub?.id || auth.user?.hubId);
  expect(hubId).toBeGreaterThan(0);

  const createResponse = await request.post(`${API_URL}/warehouse/inbound/batch-create`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      licensePlate: `51C-${suffix}`,
      driverName: 'E2E Tam Suất',
      receiveDate: new Date().toISOString().slice(0, 10),
      hubId,
      items: [
        {
          orderCode,
          pickupAddress: 'Kho kiểm thử HCM',
          goodsDescription: 'Hàng kiểm thử tính tỷ lệ',
          totalQuantity: 20,
          totalVolume: 10,
          totalWeight: 8,
          deliveryMode: 'DIRECT_CUSTOMER',
          deliveryAddress: 'Quận 1, TP.HCM',
          province: 'Hồ Chí Minh',
          initialStatus: 'INBOUND'
        }
      ]
    },
    timeout: 15000
  });
  expect(createResponse.ok()).toBeTruthy();
  await loginAs(page, USER_WAREHOUSE_HCM, BASE_URL);
  await page.goto(`${BASE_URL}/dashboard/warehouse/outbound`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /Tất cả/i }).first()).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1500);

  const createNoteButton = page.getByRole('button', { name: 'Xuất kho', exact: true }).last();
  await expect(createNoteButton).toBeVisible({ timeout: 15000 });
  await createNoteButton.click();
  await expect(page.getByText('Tạo Phiếu Xuất Kho', { exact: true })).toBeVisible({ timeout: 5000 });
  const orderInput = page
    .locator('table tbody tr')
    .first()
    .locator('td:nth-child(2) input')
    .first();
  await expect(orderInput).toBeVisible({ timeout: 10000 });
  await orderInput.fill(orderCode);
  await orderInput.press('Enter');

  const quantityInput = page.getByTestId('input-quantity-0');
  const weightInput = page.getByTestId('input-weight-0');
  const volumeInput = page.getByTestId('input-volume-0');
  const status = page.getByTestId('proportional-calculation-status-0');
  await expect(quantityInput).toHaveValue('20', { timeout: 10000 });
  await expect(weightInput).toHaveValue('8');
  await expect(volumeInput).toHaveValue('10');

  await quantityInput.fill('10');
  await expect(weightInput).toHaveValue('8');
  await expect(volumeInput).toHaveValue('10');
  await expect(weightInput).toHaveValue('4', { timeout: 5000 });
  await expect(volumeInput).toHaveValue('5', { timeout: 1000 });
  await expect(status).toHaveText('Đã tự tính kg và m³ theo số kiện.');

  await quantityInput.fill('0');
  await expect(status).toHaveText('Nhập số kiện lớn hơn 0 để tính kg và m³.', { timeout: 5000 });
  await expect(weightInput).toHaveValue('4');
  await expect(volumeInput).toHaveValue('5');

  await quantityInput.fill('21');
  await expect(status).toHaveText('Số kiện xuất vượt tồn khả dụng (20 kiện).', { timeout: 5000 });
  await expect(weightInput).toHaveValue('4');
  await expect(volumeInput).toHaveValue('5');
});
