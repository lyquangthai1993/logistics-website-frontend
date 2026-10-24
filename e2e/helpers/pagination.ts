/**
 * e2e/helpers/pagination.ts
 * Fast, pagination-aware TRIP & Order lookup helpers for Playwright E2E tests.
 * Prevents /e2e-gate from getting stuck on Page 1 when a target TRIP code is on another page
 * or requires pressing Enter on the search bar.
 */
import type { Locator, Page } from '@playwright/test';

export interface TablePaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number | null;
  rawText: string;
  hasPaginationBar: boolean;
}

export interface FindTripOptions {
  /** Maximum number of pages to walk when scanning pagination (default: 10) */
  maxScanPages?: number;
  /** Try search input + Enter first for O(1) instant lookup before walking pages (default: true) */
  useSearchFirst?: boolean;
  /** Clear stale search input before scanning pages if tripCode is not found (default: true) */
  clearStaleSearch?: boolean;
  /** Expand date range filter to "Tất cả" if tripCode is not found in default date window (default: true) */
  expandDateFilterOnMiss?: boolean;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wait for table body to finish loading (spinner gone & table visible).
 */
export async function waitForTableLoaded(page: Page, timeoutMs = 10_000): Promise<void> {
  const table = page.locator('table').first();
  await table.waitFor({ state: 'visible', timeout: timeoutMs }).catch(() => {});

  const loadingCell = page
    .locator('tbody tr td')
    .filter({ hasText: /Đang tải|Loading/i })
    .first();
  if (await loadingCell.isVisible().catch(() => false)) {
    await loadingCell.waitFor({ state: 'hidden', timeout: timeoutMs }).catch(() => {});
  }

  const spinner = page.locator('tbody .animate-spin').first();
  if (await spinner.isVisible().catch(() => false)) {
    await spinner.waitFor({ state: 'hidden', timeout: timeoutMs }).catch(() => {});
  }
}

/**
 * Inspect the pagination bar at the bottom of the current table view.
 * Parses "Trang X / Y" or "Page X of Y" and total item count ("1–15 / 42 chuyến xe").
 */
export async function readTablePagination(page: Page): Promise<TablePaginationState> {
  return page.evaluate(() => {
    const bodyText = document.body.innerText || '';

    // Match Vietnamese "Trang X / Y" or English "Page X of Y"
    const vnMatch = bodyText.match(/Trang\s+(\d+)\s*\/\s*(\d+)/i);
    const enMatch = bodyText.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
    const pageMatch = vnMatch || enMatch;

    const currentPage = pageMatch ? Math.max(1, parseInt(pageMatch[1], 10)) : 1;
    const totalPages = pageMatch ? Math.max(1, parseInt(pageMatch[2], 10)) : 1;

    // Match "1–15 / 42" or "Hiển thị 10 / 42"
    const countMatch =
      bodyText.match(/\d+\s*[–-]\s*\d+\s*\/\s*(\d+)/) ||
      bodyText.match(/Hiển thị\s+\d+\s*\/\s*(\d+)/i);
    const totalItems = countMatch ? parseInt(countMatch[1], 10) : null;

    return {
      currentPage,
      totalPages,
      totalItems,
      rawText: pageMatch ? pageMatch[0] : 'Trang 1 / 1',
      hasPaginationBar: Boolean(pageMatch)
    };
  });
}

/**
 * Build a precise locator for a clickable trip code cell/button inside the table.
 */
export function getTripLocator(page: Page, tripCode: string): Locator {
  const exactCodeRegex = new RegExp(`\\b${escapeRegex(tripCode.trim())}\\b`, 'i');
  return page
    .locator('tbody button, tbody td, tbody a, tbody span, [role="dialog"] span, [role="dialog"] div')
    .filter({ hasText: exactCodeRegex })
    .first();
}

/**
 * Trigger the table search input properly (fill + Enter + click search button if present).
 */
async function submitTableSearch(page: Page, query: string): Promise<boolean> {
  const searchInput = page
    .locator(
      'input[placeholder*="Tìm theo mã chuyến"], input[placeholder*="Tìm mã chuyến"], input[placeholder*="Tìm kiếm"], input[placeholder*="Tìm"]'
    )
    .first();

  if (!(await searchInput.isVisible().catch(() => false))) {
    return false;
  }

  await searchInput.fill(query);
  await searchInput.press('Enter');

  const searchBtn = page.locator('button[title="Nhấn để tìm kiếm"]').first();
  if (await searchBtn.isVisible().catch(() => false)) {
    await searchBtn.click().catch(() => {});
  }

  await waitForTableLoaded(page, 8_000);
  return true;
}

/**
 * Clear any active search filter in the current table view.
 */
async function clearTableSearchIfNeeded(page: Page): Promise<boolean> {
  const clearBtn = page.locator('button[title="Xóa tìm kiếm"]').first();
  if (await clearBtn.isVisible().catch(() => false)) {
    await clearBtn.click();
    await waitForTableLoaded(page, 8_000);
    return true;
  }

  const searchInput = page
    .locator(
      'input[placeholder*="Tìm theo mã chuyến"], input[placeholder*="Tìm mã chuyến"], input[placeholder*="Tìm kiếm"], input[placeholder*="Tìm"]'
    )
    .first();

  if (await searchInput.isVisible().catch(() => false)) {
    const val = (await searchInput.inputValue().catch(() => '')).trim();
    if (val.length > 0) {
      await searchInput.fill('');
      await searchInput.press('Enter');
      await waitForTableLoaded(page, 8_000);
      return true;
    }
  }
  return false;
}

/**
 * Fast, pagination-aware lookup for a TRIP code (`SD...` / `TRIP-...`).
 *
 * Execution Flow:
 * 1. Check if `tripCode` is immediately visible on the current page (0ms overhead).
 * 2. Read bottom pagination (`Trang X / Y`, total items) to understand how many pages exist.
 * 3. Fast Path A (Search + Enter): Fill search input with `tripCode` and press `Enter` to bring
 *    the target trip directly to Page 1 in a single query.
 * 4. Fast Path B (Pagination Walk): If search is disabled or did not isolate the row, clear stale
 *    search, check `totalPages` from `Trang X / Y`, reset to Page 1 if needed, and walk through
 *    pages `1..min(totalPages, maxScanPages)` via the Next Page button (`Trang sau` / `›`).
 * 5. Fast Path C (Date Filter Expansion): If still not found, click the `Tất cả` date filter
 *    button (if present) and retry search/scan.
 */
export async function findTripInPaginatedTable(
  page: Page,
  tripCode: string,
  options: FindTripOptions = {}
): Promise<Locator> {
  const {
    maxScanPages = 10,
    useSearchFirst = true,
    clearStaleSearch = true,
    expandDateFilterOnMiss = true
  } = options;

  await waitForTableLoaded(page, 10_000);
  const tripLoc = getTripLocator(page, tripCode);

  // Step 1: Instant check on current page
  if (await tripLoc.isVisible().catch(() => false)) {
    return tripLoc;
  }

  // Step 2: Inspect bottom pagination bar ("Trang X / Y")
  const initialPag = await readTablePagination(page);
  console.log(
    `[E2E Pagination] Trip "${tripCode}" not on current view (${initialPag.rawText}, totalItems=${initialPag.totalItems ?? 'unknown'}). Starting fast lookup...`
  );

  // Step 3: Fast Path A — Direct Search + Enter (O(1) backend filter)
  if (useSearchFirst) {
    const searched = await submitTableSearch(page, tripCode);
    if (searched && (await tripLoc.isVisible().catch(() => false))) {
      return tripLoc;
    }
  }

  // Step 4: Fast Path B — Clear stale search and walk pages using bottom pagination ("Trang X / Y")
  if (clearStaleSearch) {
    await clearTableSearchIfNeeded(page);
  }

  const pagAfterClear = await readTablePagination(page);
  if (await tripLoc.isVisible().catch(() => false)) {
    return tripLoc;
  }

  // Reset to Page 1 if currently on Page > 1
  if (pagAfterClear.currentPage > 1) {
    const firstPageBtn = page
      .locator('button[title="Trang đầu"], button:has-text("Go to first page")')
      .first();
    if (
      (await firstPageBtn.isVisible().catch(() => false)) &&
      (await firstPageBtn.isEnabled().catch(() => false))
    ) {
      await firstPageBtn.click();
      await waitForTableLoaded(page, 8_000);
      if (await tripLoc.isVisible().catch(() => false)) {
        return tripLoc;
      }
    }
  }

  const pag = await readTablePagination(page);
  const pagesToScan = Math.min(pag.totalPages, maxScanPages);

  for (let p = 1; p < pagesToScan; p++) {
    const nextBtn = page
      .locator(
        'button[title="Trang sau"], button:has-text("Go to next page"), button:has-text("Sau ›")'
      )
      .first();

    if (
      !(await nextBtn.isVisible().catch(() => false)) ||
      !(await nextBtn.isEnabled().catch(() => false))
    ) {
      break;
    }

    await nextBtn.click();
    await waitForTableLoaded(page, 8_000);

    if (await tripLoc.isVisible().catch(() => false)) {
      const foundPag = await readTablePagination(page);
      console.log(`[E2E Pagination] Found trip "${tripCode}" on ${foundPag.rawText}`);
      return tripLoc;
    }
  }

  // Step 5: Fast Path C — Expand Date Filter to "Tất cả" if trip is older than default window
  if (expandDateFilterOnMiss) {
    const allDatesBtn = page.locator('button').filter({ hasText: /^Tất cả$/i }).first();
    if (await allDatesBtn.isVisible().catch(() => false)) {
      await allDatesBtn.click();
      await waitForTableLoaded(page, 8_000);
      if (useSearchFirst) {
        await submitTableSearch(page, tripCode);
      }
      if (await tripLoc.isVisible().catch(() => false)) {
        return tripLoc;
      }
    }
  }

  return tripLoc;
}

/**
 * Alias for `findTripInPaginatedTable` — finds a TRIP code fast across paginated tables.
 */
export const findTripFast = findTripInPaginatedTable;

/**
 * Locate a TRIP code in a paginated table and click it to open its detail modal.
 */
export async function openTripFromPaginatedTable(
  page: Page,
  tripCode: string,
  options: FindTripOptions = {}
): Promise<Locator> {
  const tripLoc = await findTripInPaginatedTable(page, tripCode, options);
  await tripLoc.waitFor({ state: 'visible', timeout: 10_000 });
  await tripLoc.click();

  const dialog = page.locator('div[role="dialog"]').first();
  await dialog.waitFor({ state: 'visible', timeout: 15_000 });
  return dialog;
}

/**
 * Fast, pagination-aware lookup for an Order code (`NMT...`, `VD...`, etc.) in a paginated table.
 */
export async function findOrderInPaginatedTable(
  page: Page,
  orderCode: string,
  options: FindTripOptions = {}
): Promise<Locator> {
  await findTripInPaginatedTable(page, orderCode, options);
  return page.locator('tbody tr').filter({ hasText: orderCode }).first();
}
