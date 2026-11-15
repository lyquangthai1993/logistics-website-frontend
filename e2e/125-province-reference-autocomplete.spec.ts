import { test, expect } from '@playwright/test';
import { loginAs, clearSession, USER_WAREHOUSE_HCM } from './helpers/auth';
import type { Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const EVIDENCE_DIR = path.resolve(__dirname, '../playwright-report/evidence');

async function openProvinceInput(page: Page) {
  await loginAs(page, USER_WAREHOUSE_HCM);
  await page.goto('/dashboard/warehouse/inbound', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 15_000 });
  const pageUrlBeforeCreate = page.url();
  const createButton = page.getByRole('button', { name: /Tạo đơn nhập mới/ });
  await expect(createButton).toBeEnabled({ timeout: 15_000 });
    await createButton.click();
  expect(new URL(page.url()).pathname).toBe(new URL(pageUrlBeforeCreate).pathname);
  const provinceInput = page.locator('input[placeholder="Tìm tỉnh/thành..."]').first();
  await expect(provinceInput).toBeVisible();
  return provinceInput;
}

async function assertProvinceCase(page: Page, inputValue: string, expectedValue: string) {
  const provinceInput = await openProvinceInput(page);
  const datalistId = await provinceInput.getAttribute('list');
  expect(datalistId).toBeTruthy();
  await provinceInput.fill(inputValue);
  await provinceInput.press('Tab');
  await expect(provinceInput).toHaveValue(expectedValue);
}

test.describe('Province reference autocomplete in warehouse inbound', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Case 1: loads 63 DB references and canonicalizes TP. Huế', async ({ page }) => {
    const provinceInput = await openProvinceInput(page);
    const apiUrl = process.env.API_URL ?? 'http://localhost:4001/api/v1';
    const apiResult = await page.evaluate(async (url) => {
      const persisted = JSON.parse(window.localStorage.getItem('auth-storage') ?? '{}');
      const token = persisted?.state?.accessToken;
      const response = await fetch(`${url}/province-references`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return { status: response.status, payload: await response.json() };
    }, apiUrl);

    expect(apiResult.status).toBe(200);
    const references = apiResult.payload?.data;
    expect(Array.isArray(references)).toBeTruthy();
    expect(references).toHaveLength(63);
    expect(references.map((item: { name: string }) => item.name)).toContain('Thừa Thiên Huế');
    expect(references.map((item: { name: string }) => item.name)).toContain('Cần Thơ');

    const datalistId = await provinceInput.getAttribute('list');
    expect(datalistId).toBeTruthy();
    await expect(page.locator(`#${datalistId} option[value="Thừa Thiên Huế"]`)).toHaveCount(1);
    await expect(page.locator(`#${datalistId} option[value="TP. Huế"]`)).toHaveCount(1);

    await provinceInput.fill('TP. Huế');
    await provinceInput.press('Tab');
    await expect(provinceInput).toHaveValue('Thừa Thiên Huế');

    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'province-reference-autocomplete-5-cases-verified.png'),
      fullPage: true,
    });
  });

  test('Case 2: canonical province remains unchanged', async ({ page }) => {
    await assertProvinceCase(page, 'Đà Nẵng', 'Đà Nẵng');
  });

  test('Case 3: no-accent input resolves to Cần Thơ', async ({ page }) => {
    await assertProvinceCase(page, 'can tho', 'Cần Thơ');
  });

  test('Case 4: uppercase extra spaces resolve to Khánh Hòa', async ({ page }) => {
    await assertProvinceCase(page, '  KHÁNH   HÒA  ', 'Khánh Hòa');
  });

  test('Case 5: unknown province text is preserved for review', async ({ page }) => {
    await assertProvinceCase(page, '  Tỉnh Sao Hỏa  ', 'Tỉnh Sao Hỏa');
  });
});
