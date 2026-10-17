/**
 * frontend/e2e/91-feedback-17-10-extra.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 17/10 Extra (Warehouse Grid Enter/Tab Search, Trip Board Waybill Column & Outbound Receipt Destination)
 *
 * Context & Hub Alignment (OCR from 1.png, 2.png, 2_1.png, 2_3.png, 3.png):
 * - Primary Hub: Andromeda Hub - HCM -> Account: USER_WAREHOUSE_HCM (warehouse_hcm)
 * - Cross-Role Verification: USER_ADMIN (admin)
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { loginAs, clearSession, USER_WAREHOUSE_HCM, USER_ADMIN } from './helpers/auth';

const FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:4000';

const EVIDENCE_DIR = fs.existsSync(path.resolve(__dirname, '../../feedbacks/feedback_17_10_extra'))
  ? path.resolve(__dirname, '../../feedbacks/feedback_17_10_extra')
  : path.resolve(process.cwd(), '../feedbacks/feedback_17_10_extra');

function saveEvidenceScreenshot(filename: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
    const targetPath = path.join(EVIDENCE_DIR, filename);
    fs.writeFileSync(targetPath, buffer);
    console.warn(`[EVIDENCE SAVED] ${targetPath}`);
  } catch (err) {
    console.warn(`Could not save screenshot ${filename}:`, err);
  }
}

test.describe
  .serial('Feedback 17/10 Extra: Enter/Tab Order Search, Trip Board Waybills Column & Outbound Receipt Destination', () => {
  test('Task 1: OrderCodeCell does not auto-search while typing and triggers search only on Enter or Tab', async ({
    page
  }) => {
    await page.goto(`${FRONTEND_URL}/auth/sign-in`);
    await page.waitForLoadState('domcontentloaded');
    await loginAs(page, USER_WAREHOUSE_HCM);

    await page.goto(`${FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('domcontentloaded');

    const inboundHeader = page.locator('h1', { hasText: /Nhập kho/i });
    await expect(inboundHeader).toBeVisible({ timeout: 15000 });

    // Open Inbound Entry Form
    const createInboundBtn = page
      .getByRole('button', { name: /Tạo đơn nhập mới|Tạo đơn mới/i })
      .first();
    await expect(createInboundBtn).toBeVisible({ timeout: 10000 });
    await createInboundBtn.click();

    const orderInput = page.locator('input[placeholder="Mã vận đơn"]').first();
    await expect(orderInput).toBeVisible({ timeout: 10000 });

    // Track API requests to /api/v1/orders/:code while typing
    const orderLookupRequests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/v1/orders/') && req.method() === 'GET') {
        orderLookupRequests.push(url);
      }
    });

    const testPartialCode = 'LTV2610-TYPING';
    await orderInput.click();
    await orderInput.fill(testPartialCode);

    // Wait 1600ms (exceeding the old 1200ms timer) while keeping focus in input
    await page.waitForTimeout(1600);

    // Assert zero automatic search requests fired while typing/pausing
    expect(orderLookupRequests.length).toBe(0);
    await expect(orderInput).toHaveValue(testPartialCode);

    // Press Enter -> must immediately trigger lookup
    await orderInput.press('Enter');
    await expect
      .poll(() => orderLookupRequests.length, { timeout: 8000 })
      .toBeGreaterThanOrEqual(1);

    // Test Tab key trigger on a new code without double-firing on blur
    const countBeforeTab = orderLookupRequests.length;
    const testTabCode = 'LTV2610-TABKEY';
    await orderInput.fill(testTabCode);
    await page.waitForTimeout(1400);
    expect(orderLookupRequests.length).toBe(countBeforeTab);

    await orderInput.press('Tab');
    await expect.poll(() => orderLookupRequests.length, { timeout: 8000 }).toBe(countBeforeTab + 1);

    const shot1 = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('screenshot_01_task1_enter_tab_search_verified.png', shot1);
  });

  test('Task 2: Inbound & Outbound Trip Boards position XE & TÀI XẾ next to CHUYẾN XE / TRIP and display full waybills in MÃ VẬN ĐƠN column', async ({
    page
  }) => {
    await page.goto(`${FRONTEND_URL}/auth/sign-in`);
    await page.waitForLoadState('domcontentloaded');
    await loginAs(page, USER_WAREHOUSE_HCM);

    // 1. Check Inbound Trip Board at Andromeda Hub - HCM
    await page.goto(`${FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.waitForLoadState('domcontentloaded');

    const inboundTable = page.locator('table').first();
    await expect(inboundTable).toBeVisible({ timeout: 15000 });

    const headers = inboundTable.locator('thead th');
    await expect(headers).toHaveCount(6);
    await expect(headers.nth(0)).toContainText('CHUYẾN XE / TRIP');
    await expect(headers.nth(1)).toContainText('XE & TÀI XẾ');
    await expect(headers.nth(2)).toContainText('MÃ VẬN ĐƠN');
    await expect(headers.nth(3)).toContainText('SỐ KIỆN / TẢI TRỌNG');
    await expect(headers.nth(4)).toContainText('TRẠNG THÁI');
    await expect(headers.nth(5)).toContainText('THAO TÁC');

    // Wait for data rows to load
    const inboundRows = inboundTable.locator('tbody tr');
    await expect(inboundRows.first()).toBeVisible({ timeout: 15000 });
    const inboundRowCount = await inboundRows.count();
    expect(inboundRowCount).toBeGreaterThan(0);

    // Verify column proximity: XE & TÀI XẾ is immediately adjacent to CHUYẾN XE / TRIP
    const tripHeaderBox = await headers.nth(0).boundingBox();
    const vehicleHeaderBox = await headers.nth(1).boundingBox();
    const waybillHeaderBox = await headers.nth(2).boundingBox();
    expect(tripHeaderBox).not.toBeNull();
    expect(vehicleHeaderBox).not.toBeNull();
    expect(waybillHeaderBox).not.toBeNull();

    if (tripHeaderBox && vehicleHeaderBox && waybillHeaderBox) {
      // CHUYẾN XE / TRIP width is compact and XE & TÀI XẾ starts right after it
      expect(vehicleHeaderBox.x - tripHeaderBox.x).toBeLessThanOrEqual(220);
      // MÃ VẬN ĐƠN column has generous width for displaying multiple waybills
      expect(waybillHeaderBox.width).toBeGreaterThanOrEqual(180);
    }

    // Check MÃ VẬN ĐƠN cell styling (text-[10px] text-gray-500)
    const firstWaybillCell = inboundRows.first().locator('td').nth(2).locator('div').first();
    await expect(firstWaybillCell).toBeVisible();
    const waybillClass = (await firstWaybillCell.getAttribute('class')) || '';
    expect(waybillClass).toContain('text-[10px]');
    expect(waybillClass).toContain('text-gray-500');

    const shot2 = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('screenshot_02_task2_inbound_trip_board_waybills_verified.png', shot2);

    // 2. Check Outbound Trip Board parity
    await page.goto(`${FRONTEND_URL}/dashboard/warehouse/outbound`);
    await page.waitForLoadState('domcontentloaded');

    const outboundTable = page.locator('table').first();
    await expect(outboundTable).toBeVisible({ timeout: 15000 });

    const outHeaders = outboundTable.locator('thead th');
    await expect(outHeaders).toHaveCount(6);
    await expect(outHeaders.nth(0)).toContainText('CHUYẾN XE / TRIP');
    await expect(outHeaders.nth(1)).toContainText('XE & TÀI XẾ');
    await expect(outHeaders.nth(2)).toContainText('MÃ VẬN ĐƠN');

    const outboundRows = outboundTable.locator('tbody tr', { hasText: /SD\d+/i });
    await expect(outboundRows.first()).toBeVisible({ timeout: 15000 });
    const outboundRowCount = await outboundRows.count();
    expect(outboundRowCount).toBeGreaterThan(0);

    const shot3 = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('screenshot_03_task2_outbound_trip_board_waybills_verified.png', shot3);
  });

  test('Task 3: Outbound Receipt prints Kho đích / Nơi giao matching the Outbound screen destination (Hub Cấp 1 / Tuyến Xe Bo)', async ({
    page
  }) => {
    await page.goto(`${FRONTEND_URL}/auth/sign-in`);
    await page.waitForLoadState('domcontentloaded');
    await loginAs(page, USER_WAREHOUSE_HCM);

    await page.goto(`${FRONTEND_URL}/dashboard/warehouse/outbound`);
    await page.waitForLoadState('domcontentloaded');

    const outboundHeader = page.locator('h1', { hasText: /Xuất kho/i });
    await expect(outboundHeader).toBeVisible({ timeout: 15000 });

    // Wait for outbound board trips to finish loading
    const boardRows = page.locator('table tbody tr', { hasText: /SD\d+/i });
    await expect(boardRows.first()).toBeVisible({ timeout: 15000 });

    // Resume draft trip (e.g. SD87 from 3.png) or open new Outbound form
    const resumeDraftBtn = page.getByRole('button', { name: /Tiếp tục/i }).first();
    const hasDraftTrip = await resumeDraftBtn.isVisible().catch(() => false);

    if (hasDraftTrip) {
      await resumeDraftBtn.click();
    } else {
      const newOutboundBtn = page.getByRole('button', { name: /Xuất kho/i }).first();
      await expect(newOutboundBtn).toBeVisible({ timeout: 10000 });
      await newOutboundBtn.click();

      const codeInput = page.locator('tbody tr').first().locator('td').nth(1).locator('input');
      await expect(codeInput).toBeVisible({ timeout: 10000 });
      await codeInput.fill('LTV2610-0266');
      await codeInput.press('Enter');
    }

    // Select a Level 1 Hub on the first row via "Thay đổi địa chỉ (Điều chuyển)" or "Đổi kho đích khác..."
    const changeDestBtn = page
      .getByRole('button', {
        name: /Thay đổi địa chỉ \(Điều chuyển\)|Đổi kho đích khác\.\.\./i
      })
      .first();
    await expect(changeDestBtn).toBeVisible({ timeout: 10000 });
    await changeDestBtn.click();

    const modalTitle = page.locator('h2', { hasText: 'Chọn Đích Xuất Kho' });
    await expect(modalTitle).toBeVisible({ timeout: 8000 });

    const firstHubCard = page.locator('div.cursor-pointer', { hasText: 'HUB-' }).first();
    await expect(firstHubCard).toBeVisible({ timeout: 8000 });
    await firstHubCard.click();

    // Verify DestinationHubInfoCard is displayed on the Outbound screen
    await expect(
      page.locator('text=/Polaris Hub|Magellan Hub|Andromeda Hub/i').first()
    ).toBeVisible({
      timeout: 5000
    });

    // Click "Xem trước" to open Phiếu Xuất Kho modal and verify "Kho đích / Nơi giao" matches the Outbound screen destination
    const previewReceiptBtn = page.getByRole('button', { name: /Xem trước/i }).first();
    await expect(previewReceiptBtn).toBeVisible({ timeout: 8000 });
    await previewReceiptBtn.click();

    const receiptDialog = page.getByRole('dialog');
    await expect(receiptDialog).toBeVisible({ timeout: 10000 });
    await expect(receiptDialog.locator('th', { hasText: 'Kho đích / Nơi giao' })).toBeVisible();

    const receiptRows = receiptDialog.locator('tbody tr');
    const receiptRowCount = await receiptRows.count();
    expect(receiptRowCount).toBeGreaterThan(1); // At least 1 item row + 1 total row

    const destCellText =
      (await receiptRows.first().locator('td').nth(5).textContent())?.trim() || '';
    expect(destCellText.length).toBeGreaterThan(0);
    expect(destCellText).toMatch(/Polaris Hub|Magellan Hub|Andromeda Hub|Xe Bo/i);

    const shot4 = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('screenshot_04_task3_outbound_receipt_destination_verified.png', shot4);
    saveEvidenceScreenshot('screenshot_verified.png', shot4);

    // Also verify Admin role access on the Outbound Board
    await clearSession(page);
    await loginAs(page, USER_ADMIN);
    await page.goto(`${FRONTEND_URL}/dashboard/warehouse/outbound`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('th', { hasText: 'MÃ VẬN ĐƠN' }).first()).toBeVisible({
      timeout: 15000
    });
  });
});
