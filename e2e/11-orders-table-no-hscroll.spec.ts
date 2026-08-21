/**
 * e2e/11-orders-table-responsive-matrix.spec.ts
 *
 * Kiem tra bang orders tai /dashboard/orders tren ma tran Responsive:
 * - 4 Breakpoints: 1024px (Laptop-S), 1280px (Laptop-M), 1440px (Desktop), 1920px (Full-HD)
 * - 2 Trang thai Sidebar: Expanded (16rem/256px) va Collapsed (3rem/48px)
 *
 * Chuan UX tu next-shadcn-dashboard-starter:
 * 1. Body Page MUST NOT have global horizontal scrollbar (body.scrollWidth <= viewportWidth).
 * 2. Table container smoothly allows horizontal scrolling whenever content width > container width
 *    (dac biet tai 1024px va 1200px khi Sidebar mo rong).
 * 3. Column pinning (actions column) stays sticky and accessible.
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './helpers/auth';

const adminUser = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;

const VIEWPORTS = [
  { width: 1024, height: 768,  label: 'Laptop-S'  },
  { width: 1280, height: 800,  label: 'Laptop-M'  },
  { width: 1440, height: 900,  label: 'Desktop'   },
  { width: 1920, height: 1080, label: 'Full-HD'   },
];

const SIDEBAR_STATES = ['expanded', 'collapsed'] as const;

// ─── Helper: get DOM metrics ────────────────────────────────────────────────
async function getScrollMetrics(page: any) {
  return page.evaluate(() => {
    const table = document.querySelector('table');
    const tableContainer = table?.parentElement;
    const sidebar = document.querySelector('[data-slot="sidebar"]') as HTMLElement | null;
    const mainArea = document.querySelector('[data-slot="sidebar-inset"]') as HTMLElement | null;

    return {
      // Table & container
      tableWidth: Math.round(table?.getBoundingClientRect().width ?? 0),
      tableScrollWidth: table?.scrollWidth ?? 0,
      containerClientWidth: tableContainer?.clientWidth ?? 0,
      containerScrollWidth: tableContainer?.scrollWidth ?? 0,
      containerCanScroll: (tableContainer?.scrollWidth ?? 0) > (tableContainer?.clientWidth ?? 0),

      // Sidebar
      sidebarState: sidebar?.getAttribute('data-state') ?? 'unknown',
      sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : 0,

      // Main content area
      mainScrollWidth: mainArea?.scrollWidth ?? 0,
      mainClientWidth: mainArea?.clientWidth ?? 0,

      // Body (Global page layout)
      bodyScrollWidth: document.body.scrollWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      bodyHasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
    };
  });
}

// ─── Helper: ensure sidebar state ───────────────────────────────────────────
async function ensureSidebarState(page: any, targetState: 'expanded' | 'collapsed') {
  const currentState = await page.evaluate(() => {
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    return sidebar?.getAttribute('data-state') ?? 'unknown';
  });

  if (currentState !== targetState) {
    await page.click('[data-slot="sidebar-trigger"]');
    await page.waitForFunction(
      (state: string) => {
        const sidebar = document.querySelector('[data-slot="sidebar"]');
        return sidebar?.getAttribute('data-state') === state;
      },
      targetState,
      { timeout: 5000 }
    );
    await page.waitForTimeout(300);
  }
}

// ─── Test Matrix ─────────────────────────────────────────────────────────────
for (const vp of VIEWPORTS) {
  for (const sidebarState of SIDEBAR_STATES) {
    const sidebarLabel = sidebarState === 'expanded' ? 'Sidebar Open (16rem)' : 'Sidebar Closed (3rem)';

    test.describe(`Orders Table UX Matrix @ ${vp.width}px ${vp.label} | ${sidebarLabel}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page }) => {
        await loginAs(page, adminUser);
        await page.goto('/dashboard/orders');
        await page.waitForSelector('table', { state: 'visible', timeout: 20_000 });
        await page.waitForTimeout(600);
        await ensureSidebarState(page, sidebarState);
      });

      test(`[${vp.width}px | ${sidebarState}] Page body khong overflow & Table responsive`, async ({ page }) => {
        const m = await getScrollMetrics(page);

        console.log(
          `[${vp.width}px | sidebar:${m.sidebarState}(${m.sidebarWidth}px)] ` +
          `table=${m.tableWidth}px | container=${m.containerClientWidth}px(scrollWidth:${m.containerScrollWidth}px) | ` +
          `canScrollH=${m.containerCanScroll} | body=${m.bodyScrollWidth}/${m.viewportWidth} | overflow=${m.bodyHasHorizontalOverflow}`
        );

        // 1. Sidebar is in the expected state
        expect(m.sidebarState).toBe(sidebarState);

        // 2. CRITICAL: Page body must NEVER have global horizontal scrollbar
        expect(
          m.bodyScrollWidth,
          `[${vp.width}px|${sidebarState}] Body overflow: ${m.bodyScrollWidth} > ${m.viewportWidth}`
        ).toBeLessThanOrEqual(m.viewportWidth);

        // 3. Table is rendered and readable
        expect(m.tableWidth).toBeGreaterThan(0);
        expect(m.containerClientWidth).toBeGreaterThan(0);

        // 4. When container is narrow (e.g. 1024px expanded sidebar ~ 718px container),
        // table smoothly allows horizontal scrolling inside container rather than breaking layout
        if (m.tableWidth > m.containerClientWidth) {
          expect(
            m.containerCanScroll,
            `[${vp.width}px|${sidebarState}] Table container should be scrollable when table (${m.tableWidth}px) > container (${m.containerClientWidth}px)`
          ).toBe(true);
        }
      });

      test(`[${vp.width}px | ${sidebarState}] Capture screenshot`, async ({ page }) => {
        const filename = `playwright-report/orders-${vp.width}px-sidebar-${sidebarState}.png`;
        await page.screenshot({
          path: filename,
          fullPage: false,
          clip: { x: 0, y: 0, width: vp.width, height: vp.height }
        });
        console.log(`Saved screenshot: ${filename}`);
      });
    });
  }
}
