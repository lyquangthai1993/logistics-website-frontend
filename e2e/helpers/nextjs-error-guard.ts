/**
 * e2e/helpers/nextjs-error-guard.ts
 *
 * Next.js Development Error Overlay & Telemetry Feedback Guard
 * Reference: https://nextjs.org/telemetry#error-feedback
 *
 * In Next.js (Turbopack / App Router dev mode), unhandled server/client runtime errors,
 * hydration errors, or dehydrated query rejections trigger the Next.js Error Overlay (<nextjs-portal>).
 *
 * This helper listens to page errors, intercepts Next.js error dialogs,
 * extracts stack traces and file locations, and enforces zero-error health across pages.
 */
import { expect, type Page } from '@playwright/test';

export interface NextJsErrorReport {
  pageErrors: string[];
  consoleErrors: string[];
  overlayErrors: string[];
}

/**
 * Attaches pageerror and console error collectors to a Playwright page.
 */
export function attachNextJsErrorCollector(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  const KNOWN_BENIGN_ERRORS = [
    'Failed to find font override values for font',
    'Skipping generating a fallback font',
    'favicon.ico',
    'Download the React DevTools'
  ];

  page.on('pageerror', (err) => {
    const msg = err.message || String(err);
    if (!KNOWN_BENIGN_ERRORS.some((k) => msg.includes(k))) {
      pageErrors.push(msg);
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!KNOWN_BENIGN_ERRORS.some((k) => text.includes(k))) {
        consoleErrors.push(text);
      }
    }
  });

  return {
    getErrors: () => ({ pageErrors: [...pageErrors], consoleErrors: [...consoleErrors] }),
    clear: () => {
      pageErrors.length = 0;
      consoleErrors.length = 0;
    }
  };
}

/**
 * Asserts that no Next.js error overlay, Redbox, or critical runtime exceptions are active on the page.
 */
export async function assertNoNextJsErrors(
  page: Page,
  collector?: { getErrors: () => { pageErrors: string[]; consoleErrors: string[] } }
) {
  // 1. Check for Next.js Dev Overlay DOM elements (<nextjs-portal>, [data-nextjs-dialog], etc.)
  const overlaySelectors = [
    'nextjs-portal',
    '[data-nextjs-dialog]',
    '[data-nextjs-dialog-overlay]',
    '[data-nextjs-toast]',
    '#nextjs__container_errors_desc',
    '[data-nextjs-error-feedback]'
  ];

  const foundOverlayErrors: string[] = [];

  for (const selector of overlaySelectors) {
    const locators = page.locator(selector);
    const count = await locators.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = (
          await locators
            .nth(i)
            .innerText()
            .catch(() => '')
        )?.trim();
        // Ignore empty portals or hidden elements
        if (
          text &&
          (text.includes('Error') ||
            text.includes('TypeError') ||
            text.includes('Was this helpful?') ||
            text.includes('Turbopack'))
        ) {
          foundOverlayErrors.push(`[${selector}] ${text}`);
        }
      }
    }
  }

  // 2. Gather collected page errors
  const errors = collector ? collector.getErrors() : { pageErrors: [], consoleErrors: [] };

  const allProblems = [
    ...foundOverlayErrors.map((o) => `[Next.js Error Overlay]: ${o}`),
    ...errors.pageErrors.map((pe) => `[Uncaught Page Error]: ${pe}`),
    ...errors.consoleErrors.map((ce) => `[Console Error]: ${ce}`)
  ];

  if (allProblems.length > 0) {
    console.error('\n🚨 [Next.js Error Guard] Phất hiện lỗi Next.js / Runtime Error trên trang:');
    allProblems.forEach((p) => console.error(`   ${p}`));
  }

  expect(
    allProblems,
    `Trang xuất hiện lỗi Next.js Dev Overlay hoặc Exception:\n` + allProblems.join('\n')
  ).toHaveLength(0);
}
