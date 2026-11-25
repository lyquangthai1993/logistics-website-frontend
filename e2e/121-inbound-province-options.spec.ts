import { test, expect } from '@playwright/test';
import { loginAs, USER_WAREHOUSE_HCM } from './helpers/auth';

test('inbound province autocomplete keeps all provinces and adds Ký Gửi Kho', async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, USER_WAREHOUSE_HCM);
  await page.goto('/dashboard/warehouse/inbound');
  await page.getByRole('button', { name: /Tạo đơn nhập mới/ }).click();
  await expect(page.getByText(/1\. Ngày tiếp nhận/)).toBeVisible({ timeout: 15_000 });

  const provinceInput = page.locator('table tbody tr:first-child input[list]').first();
  await expect(provinceInput).toBeVisible({ timeout: 15_000 });
  const listId = await provinceInput.getAttribute('list');
  expect(listId).toBeTruthy();
  const provinceOptions = page.locator(`datalist#${listId} option`);
  await expect(provinceOptions).toHaveCount(64);
  await provinceInput.fill('TP. Hồ Chí Minh');
  await expect(provinceInput).toHaveValue('TP. Hồ Chí Minh');
  await provinceInput.fill('Ký Gửi Kho');
  await expect(provinceInput).toHaveValue('Ký Gửi Kho');
  await page.screenshot({
    path: 'e2e/screenshots/screenshot_inbound_province_options_verified.png',
    fullPage: false
  });
});
