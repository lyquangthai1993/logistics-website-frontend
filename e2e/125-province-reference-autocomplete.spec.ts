import { test, expect } from '@playwright/test';
import { loginAs, clearSession, USER_WAREHOUSE_HCM } from './helpers/auth';
import * as fs from 'node:fs';
import * as path from 'node:path';

const EVIDENCE_DIR = path.resolve(__dirname, '../playwright-report/evidence');

test.describe('Province reference autocomplete in warehouse inbound', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Warehouse HCM: loads 63 DB references and canonicalizes a province alias', async ({
    page,
  }) => {
    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto('/dashboard/warehouse/inbound', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Nhập kho/ })).toBeVisible({ timeout: 15_000 });

    const pageUrlBeforeCreate = page.url();
    await page.getByRole('button', { name: /Tạo đơn nhập mới/ }).click();
    await expect(page).toHaveURL(pageUrlBeforeCreate);
    const provinceInput = page.locator('input[placeholder="Tìm tỉnh/thành..."]').first();
    await expect(provinceInput).toBeVisible();

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
      path: path.join(EVIDENCE_DIR, 'province-reference-autocomplete-verified.png'),
      fullPage: true,
    });
  });
});
