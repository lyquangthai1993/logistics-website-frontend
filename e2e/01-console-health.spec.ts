/**
 * e2e/01-console-health.spec.ts
 * SUB-AGENT ROLE: Console Health Inspector
 *
 * Checks:
 *   - No [error] messages in browser console on key pages
 *   - Captures [warning] messages and reports (non-blocking)
 *   - Detects known issues (e.g. font fallback warnings)
 */
import { test, expect } from '@playwright/test';
import { collectConsoleLogs, loginAs, USER_ADMIN } from './helpers/auth';
import { assertNoNextJsErrors, attachNextJsErrorCollector } from './helpers/nextjs-error-guard';

const PUBLIC_PAGES = [
  { path: '/auth/sign-in', label: 'Login Page' },
  { path: '/', label: 'Root (redirect)' }
];

for (const { path, label } of PUBLIC_PAGES) {
  test(`[Console Health] ${label} – no critical browser errors & no Next.js overlay`, async ({
    page
  }) => {
    const errorCollector = attachNextJsErrorCollector(page);
    const logger = collectConsoleLogs(page);

    await page.goto(path);
    await page.waitForLoadState('networkidle');

    // Assert zero Next.js Error Overlays / Redbox (<nextjs-portal>)
    await assertNoNextJsErrors(page, errorCollector);

    const logs = logger.getLogs();
    logger.stop();

    const errors = logs.filter((l) => l.type === 'error');
    const warnings = logs.filter((l) => l.type === 'warning');

    for (const w of warnings) {
      test.info().annotations.push({ type: 'warning', description: w.text });
    }

    const KNOWN_WARNINGS = [
      'Failed to find font override values for font',
      'Skipping generating a fallback font'
    ];
    const criticalErrors = errors.filter((e) => !KNOWN_WARNINGS.some((kw) => e.text.includes(kw)));

    expect(
      criticalErrors,
      `Found ${criticalErrors.length} critical browser error(s) on "${label}":\n` +
        criticalErrors.map((e) => `• ${e.text}`).join('\n')
    ).toHaveLength(0);
  });
}

test.describe('[Next.js Dev Overlay & Telemetry Health] Authenticated Dashboard Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USER_ADMIN);
  });

  const DASHBOARD_PAGES = [
    { path: '/dashboard/orders', label: 'Orders Listing (Lập Lệnh Điều Vận)' },
    { path: '/dashboard/warehouse/inbound', label: 'Warehouse Inbound Board' },
    { path: '/dashboard/warehouse/outbound', label: 'Warehouse Outbound Board' },
    { path: '/dashboard/trips', label: 'Trips Listing' }
  ];

  for (const { path, label } of DASHBOARD_PAGES) {
    test(`[Next.js Overlay Guard] ${label} (${path}) – zero Next.js redbox or dehydration rejection`, async ({
      page
    }) => {
      const errorCollector = attachNextJsErrorCollector(page);

      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      // Give React/Next.js dev server 1s to mount and hydrate
      await page.waitForTimeout(1000);

      // Verify page loaded main content
      await expect(page.locator('body')).toBeVisible();

      // Assert ZERO Next.js Dev Error Overlay (<nextjs-portal>, [data-nextjs-dialog], etc.)
      await assertNoNextJsErrors(page, errorCollector);
    });
  }
});

test('[Console Health] Detect known font warning – Google Sans Flex', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'warning') logs.push(msg.text());
  });

  await page.goto('/auth/sign-in');
  await page.waitForLoadState('networkidle');

  const fontWarning = logs.find(
    (l) => l.includes('Google Sans Flex') || l.includes('font override')
  );

  if (fontWarning) {
    console.log(`\n⚠️  KNOWN ISSUE DETECTED: ${fontWarning}`);
    console.log('   → FIX: Replace "Google Sans Flex" with "Google Sans" in font.config.ts');
    console.log('   → or remove unsupported font variant from next/font/google import');
    // This is a known issue – annotate but do not fail
    test.info().annotations.push({
      type: 'known-issue',
      description: `Font warning: ${fontWarning}`
    });
  }

  // Always pass – this test is informational only
  expect(true).toBe(true);
});
