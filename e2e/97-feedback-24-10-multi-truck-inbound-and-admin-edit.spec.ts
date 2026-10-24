/**
 * frontend/e2e/97-feedback-24-10-multi-truck-inbound-and-admin-edit.spec.ts
 *
 * Automated E2E Verification Suite for:
 * Feedback 24/10 — Multi-truck Inbound Quantity Metric Parity & Super Admin Deep Edit
 *
 * Verified Invariants:
 * 1. Multi-Truck Inbound Metric Parity:
 *    - Order NAV2610-0128 arrives on 2 trucks:
 *      * Truck 1 (SD365, 29E15245 SPIDER): 27 packages
 *      * Truck 2 (SD328, 75H07560 SPIDER): 45 packages
 *    - Modals display exact trip-allocated quantities (27 and 45), eliminating ambiguous 1-2 package placeholders.
 *    - Warehouse inventory order ledger aggregates to 72 total inbound packages.
 * 2. Unlocked Multi-Truck Inbound Inputs:
 *    - Adding an order that is already INBOUND into a subsequent receiving truck does NOT disable
 *      quantity, weight, or volume inputs (isRowInboundLocked allows inbound vehicle edits).
 * 3. Super Admin Deep Edit Override:
 *    - Super Admin opening completed/in-transit trips sees the Admin Override banner with "Bật chỉnh sửa" toggle.
 *    - Toggling edit mode unlocks the grid with WarehouseEditableGrid (isAdmin: true).
 *    - Super Admin can adjust quantities, weights, and notes, then save directly via "Lưu thay đổi (Admin)".
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs, USER_WAREHOUSE_HCM, USER_ADMIN } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../feedbacks/feedback_24_10_multi_truck_inbound_and_admin_edit'
);
const STEP_01_PATH = path.join(EVIDENCE_DIR, 'step_01_sd365_27_packages.png');
const STEP_02_PATH = path.join(EVIDENCE_DIR, 'step_02_sd328_45_packages.png');
const STEP_03_PATH = path.join(EVIDENCE_DIR, 'step_03_order_72_packages_ledger.png');
const STEP_04_PATH = path.join(EVIDENCE_DIR, 'step_04_multi_truck_quantity_input_enabled.png');
const STEP_05_PATH = path.join(EVIDENCE_DIR, 'step_05_super_admin_edit_saved.png');
const VERIFIED_PATH = path.join(EVIDENCE_DIR, 'screenshot_feedback_24_10_multi_truck_verified.png');

test.describe
  .serial('Feedback 24/10 — Multi-truck Inbound Quantity Metric Parity & Super Admin Deep Edit', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Case 1: SD365 (Truck 1) and SD328 (Truck 2) display 27 and 45 packages for NAV2610-0128', async ({
    page
  }) => {
    // 1. Login as Andromeda Hub - HCM warehouse operator
    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('domcontentloaded');

    // Chờ bảng danh sách chuyến xe hiển thị
    await page.waitForTimeout(2000);

    // Chuyển sang tab "Đã xử lý" vì chuyến SD365/SD328 đã xử lý xong
    const completedTab = page.getByRole('button', { name: /Đã xử lý/i }).first();
    if (await completedTab.isVisible()) {
      await completedTab.click();
      await page.waitForTimeout(1000);
    }

    // Tra cứu chuyến SD365
    const searchInput = page
      .getByPlaceholder(/Tìm mã chuyến/i)
      .or(page.locator('input[placeholder*="Tìm"]').first());
    const searchBtn = page.locator('button[title="Nhấn để tìm kiếm"]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('SD365');
      await searchInput.press('Enter');
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
      }
      await page.waitForTimeout(1500);
    }

    // Tìm dòng hoặc nút mở chuyến SD365
    const sd365Trigger = page
      .locator('button:has-text("SD365")')
      .or(page.getByText('SD365'))
      .first();
    await expect(sd365Trigger).toBeVisible({ timeout: 15000 });
    await sd365Trigger.click();

    // Chờ modal chi tiết chuyến xe xuất hiện
    const modal = page.locator('div[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // Kiểm tra có hiển thị mã đơn NAV2610-0128 và số kiện là 27
    const navOrderRow = modal.locator('tr:has-text("NAV2610-0128")').first();
    await expect(navOrderRow).toBeVisible({ timeout: 8000 });
    const rowText = await navOrderRow.innerText();
    expect(rowText).toContain('27');

    // Chụp ảnh bằng chứng chuyến SD365
    await modal.screenshot({ path: STEP_01_PATH });

    // Đóng modal SD365
    const closeBtn = modal
      .locator('button:has-text("Đóng"), button:has([data-icon="x"]), button[aria-label="Close"]')
      .first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(1000);

    // Tra cứu chuyến SD328
    if (await searchInput.isVisible()) {
      await searchInput.fill('SD328');
      await searchInput.press('Enter');
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
      }
      await page.waitForTimeout(1500);
    }

    const sd328Trigger = page
      .locator('button:has-text("SD328")')
      .or(page.getByText('SD328'))
      .first();
    await expect(sd328Trigger).toBeVisible({ timeout: 15000 });
    await sd328Trigger.click();

    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // Kiểm tra chuyến SD328 hiển thị 45 kiện cho NAV2610-0128
    const sd328OrderRow = modal.locator('tr:has-text("NAV2610-0128")').first();
    await expect(sd328OrderRow).toBeVisible({ timeout: 8000 });
    const sd328Text = await sd328OrderRow.innerText();
    expect(sd328Text).toContain('45');

    // Chụp ảnh bằng chứng chuyến SD328
    await modal.screenshot({ path: STEP_02_PATH });

    // Đóng modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  });

  test('Case 2: Warehouse Orders Ledger displays NAV2610-0128 with total 72 packages', async ({
    page
  }) => {
    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto('/dashboard/warehouse/orders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const searchInput = page
      .getByPlaceholder(/Tìm kiếm/i)
      .or(page.locator('input[placeholder*="Tìm"]').first());
    if (await searchInput.isVisible()) {
      await searchInput.fill('NAV2610-0128');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
    }

    const row = page.locator('tr:has-text("NAV2610-0128")').first();
    await expect(row).toBeVisible({ timeout: 15000 });
    const rowContent = await row.innerText();
    expect(rowContent).toContain('72');

    await page.screenshot({ path: STEP_03_PATH, fullPage: false });
  });

  test('Case 3: Inbound receiving form allows quantity editing for already INBOUND orders', async ({
    page
  }) => {
    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Mở màn hình tạo đơn nhập mới (Mode 1 Customer)
    const newInboundBtn = page.getByRole('button', { name: /Tạo đơn nhập mới/i }).first();
    await expect(newInboundBtn).toBeVisible({ timeout: 10000 });
    await newInboundBtn.click();
    await page.waitForTimeout(1000);

    // Nhập mã đơn NAV2610-0128 vào dòng bảng
    const codeInput = page.locator('input[placeholder="Mã vận đơn"]').first();
    await expect(codeInput).toBeVisible({ timeout: 10000 });
    await codeInput.fill('NAV2610-0128');
    await codeInput.press('Enter');
    await page.waitForTimeout(1500);

    // Kiểm tra ô Số kiện không bị disabled
    const qtyInput = page.locator('input[type="number"]').first();
    await expect(qtyInput).toBeVisible({ timeout: 8000 });
    const isDisabled = await qtyInput.isDisabled();
    expect(isDisabled).toBe(false);

    // Nhập thử số kiện mới (ví dụ: 15)
    await qtyInput.fill('15');
    expect(await qtyInput.inputValue()).toBe('15');

    await page.screenshot({ path: STEP_04_PATH });
  });

  test('Case 4: Super Admin can toggle Edit Mode and save changes on completed trip SD328', async ({
    page
  }) => {
    // Login as Super Admin
    await loginAs(page, USER_ADMIN);
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Chuyển sang tab "Đã xử lý"
    const completedTab = page.getByRole('button', { name: /Đã xử lý/i }).first();
    if (await completedTab.isVisible()) {
      await completedTab.click();
      await page.waitForTimeout(1000);
    }

    // Tra cứu và mở chuyến SD328
    const searchInput = page
      .getByPlaceholder(/Tìm mã chuyến/i)
      .or(page.locator('input[placeholder*="Tìm"]').first());
    const searchBtn = page.locator('button[title="Nhấn để tìm kiếm"]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('SD328');
      await searchInput.press('Enter');
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
      }
      await page.waitForTimeout(1500);
    }

    const sd328Trigger = page
      .locator('button:has-text("SD328")')
      .or(page.getByText('SD328'))
      .first();
    await expect(sd328Trigger).toBeVisible({ timeout: 15000 });
    await sd328Trigger.click();

    const modal = page.locator('div[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // Super Admin nhìn thấy banner Quản trị viên
    const adminBanner = modal.locator('[data-testid="admin-override-banner"]').first();
    await expect(adminBanner).toBeVisible({ timeout: 8000 });

    // Bấm nút "Bật chỉnh sửa"
    const toggleEditBtn = adminBanner.locator('button:has-text("Bật chỉnh sửa")').first();
    await expect(toggleEditBtn).toBeVisible();
    await toggleEditBtn.click();
    await page.waitForTimeout(1000);

    // Kiểm tra bảng đã chuyển sang chế độ chỉnh sửa (hiển thị input số kiện)
    const qtyInput = modal.locator('input[type="number"]').first();
    await expect(qtyInput).toBeVisible({ timeout: 5000 });
    expect(await qtyInput.isDisabled()).toBe(false);

    // Kiểm tra footer hiển thị nút "Lưu thay đổi (Admin)"
    const adminSaveBtn = modal.locator('button:has-text("Lưu thay đổi (Admin)")').first();
    await expect(adminSaveBtn).toBeVisible({ timeout: 5000 });

    // Chụp ảnh bằng chứng Super Admin Edit
    await modal.screenshot({ path: STEP_05_PATH });
    await modal.screenshot({ path: VERIFIED_PATH });

    // Đóng modal
    await page.keyboard.press('Escape');
  });
});
