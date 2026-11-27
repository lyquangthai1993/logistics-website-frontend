import { test, expect } from '@playwright/test';
import { loginAs, USER_ADMIN, USER_WAREHOUSE_HCM } from './helpers/auth';

test.describe('Super Admin edit queue MVP', () => {
  test('Super Admin can search the real queue and open order editing', async ({ page }) => {
    await loginAs(page, USER_ADMIN);
    await page.goto('/dashboard/admin/edit-queue');

    const queue = page.getByTestId('admin-edit-queue-mvp');
    await expect(queue).toBeVisible();

    const queueButtons = queue.locator('[data-testid^="admin-edit-queue-open-"]');
    await expect(queueButtons.first()).toBeVisible();
    expect(await queueButtons.count()).toBeGreaterThan(0);

    const orderCode = (await queueButtons.first().getAttribute('data-testid'))?.replace(
      'admin-edit-queue-open-',
      ''
    );
    expect(orderCode).toBeTruthy();

    const search = page.getByTestId('admin-edit-queue-search');
    await search.fill(orderCode!);
    await search.press('Enter');

    await expect(queue.locator(`[data-testid="admin-edit-queue-open-${orderCode}"]`)).toHaveCount(
      1
    );
    await queue.locator(`[data-testid="admin-edit-queue-open-${orderCode}"]`).click();

    await expect(page.getByText('Chi tiết đơn hàng tiếp nhận kho', { exact: false })).toBeVisible();
    await expect(page.getByTestId('btn-admin-edit-waybill')).toBeVisible();
  });

  test('Warehouse Manager cannot see the Super Admin edit queue', async ({ page }) => {
    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto('/dashboard/warehouse/orders?hubId=1');

    await expect(page.getByTestId('admin-edit-queue-mvp')).toHaveCount(0);
    await expect(page.locator('[data-testid^="btn-admin-edit-field-"]')).toHaveCount(0);
  });
});
