import { test, expect } from '@playwright/test';
import path from 'path';
import { loginAs, USER_WAREHOUSE_HCM, waitForTableLoaded } from './helpers/auth';

test.describe('Task #109: Inbound & Outbound Tablet Filter Responsive Layout (Zero Overlap)', () => {
  test('EC-01..EC-10: Tablet viewports (820px & 900px) preserve search width and prevent Date Range / Status Tabs collision', async ({
    page
  }) => {
    // 1. Set tablet viewport matching iPad Air / narrow desktop split-screen (820x1180)
    await page.setViewportSize({ width: 820, height: 1180 });

    // 2. Authenticate with Hub-scoped account Andromeda Hub - HCM (USER_WAREHOUSE_HCM)
    await loginAs(page, USER_WAREHOUSE_HCM);

    // 3. Navigate to Inbound Board
    await page.goto('/dashboard/warehouse/inbound');
    await waitForTableLoaded(page);

    const header = page.locator('h1', { hasText: 'Nhập kho' });
    await expect(header).toBeVisible();

    // Wait for real data rows (not loading/empty state row)
    const dataRows = page.locator('tbody tr').filter({
      hasNotText: /Đang tải|Không tìm thấy|Chưa có/i
    });
    await expect(dataRows.first()).toBeVisible({ timeout: 20000 });
    const count = await dataRows.count();
    expect(count).toBeGreaterThan(0);

    // 4. Verify Search Box is visible and NOT crushed to 0px
    const searchInput = page.locator('input[placeholder*="Tìm mã chuyến"]');
    await expect(searchInput).toBeVisible();
    const searchBox = await searchInput.boundingBox();
    expect(searchBox).not.toBeNull();
    expect(searchBox!.width).toBeGreaterThanOrEqual(180);

    // 5. Verify Date Range "Áp dụng" button and Status Tab "Tất cả" do NOT overlap
    const btnApply = page.locator('button', { hasText: 'Áp dụng' });
    const tabAll = page.locator('button', { hasText: /Tất cả \(\d+\)/ });
    await expect(btnApply).toBeVisible();
    await expect(tabAll).toBeVisible();

    const boxApply = await btnApply.boundingBox();
    const boxTabAll = await tabAll.boundingBox();
    expect(boxApply).not.toBeNull();
    expect(boxTabAll).not.toBeNull();

    // Mathematical bounding-box non-collision check:
    // Either separated horizontally (right of Apply <= left of TabAll) OR separated vertically (bottom of Apply <= top of TabAll)
    const separatedHorizontally = boxApply!.x + boxApply!.width <= boxTabAll!.x + 1;
    const separatedVertically = boxApply!.y + boxApply!.height <= boxTabAll!.y + 1;
    expect(separatedHorizontally || separatedVertically).toBe(true);

    // 6. Capture verified evidence screenshot at tablet viewport
    const screenshotPath = path.resolve(
      process.cwd(),
      '..',
      'feedbacks',
      'feedback_27_10_task_109_inbound_tablet_filter_overlap',
      'screenshot_01_verified.png'
    );
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // 7. Interactive filter verification (EC-03, EC-05, EC-07):
    // Click "Áp dụng" and switch status tabs without collision interception
    await btnApply.click();
    const tabPending = page.locator('button', { hasText: /Chờ xử lý \(\d+\)/ });
    await expect(tabPending).toBeVisible();
    await tabPending.click();
    await tabAll.click();

    // Type into Search Box and clear
    await searchInput.fill('SD');
    await expect(searchInput).toHaveValue('SD');
    const clearBtn = page.locator('button[title="Xóa tìm kiếm"]');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');

    // 8. Check 900px split-screen viewport (EC-03)
    await page.setViewportSize({ width: 900, height: 800 });
    const searchBox900 = await searchInput.boundingBox();
    const boxApply900 = await btnApply.boundingBox();
    const boxTabAll900 = await tabAll.boundingBox();
    expect(searchBox900!.width).toBeGreaterThanOrEqual(180);
    const nonOverlapping900 =
      boxApply900!.x + boxApply900!.width <= boxTabAll900!.x + 1 ||
      boxApply900!.y + boxApply900!.height <= boxTabAll900!.y + 1;
    expect(nonOverlapping900).toBe(true);

    // 9. Verify Outbound Board parity at tablet viewport (EC-10)
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto('/dashboard/warehouse/outbound');
    await waitForTableLoaded(page);

    const outHeader = page.locator('h1', { hasText: 'Xuất kho' });
    await expect(outHeader).toBeVisible();

    const outSearchInput = page.locator('input[placeholder*="Tìm mã đơn"]');
    await expect(outSearchInput).toBeVisible();
    const outSearchBox = await outSearchInput.boundingBox();
    expect(outSearchBox).not.toBeNull();
    expect(outSearchBox!.width).toBeGreaterThanOrEqual(180);

    const outBtnApply = page.locator('button', { hasText: 'Áp dụng' });
    const outTabAll = page.locator('button', { hasText: /Tất cả \(\d+\)/ });
    await expect(outBtnApply).toBeVisible();
    await expect(outTabAll).toBeVisible();

    const outBoxApply = await outBtnApply.boundingBox();
    const outBoxTabAll = await outTabAll.boundingBox();
    const outNonOverlapping =
      outBoxApply!.x + outBoxApply!.width <= outBoxTabAll!.x + 1 ||
      outBoxApply!.y + outBoxApply!.height <= outBoxTabAll!.y + 1;
    expect(outNonOverlapping).toBe(true);
  });
});
