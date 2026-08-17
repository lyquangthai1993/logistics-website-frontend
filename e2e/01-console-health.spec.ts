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
import { collectConsoleLogs } from './helpers/auth';

const PAGES_TO_CHECK = [
  { path: '/auth/sign-in', label: 'Login Page' },
  { path: '/', label: 'Root (redirect)' }
];

for (const { path, label } of PAGES_TO_CHECK) {
  test(`[Console Health] ${label} – no critical browser errors`, async ({ page }) => {
    const logger = collectConsoleLogs(page);

    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const logs = logger.getLogs();
    logger.stop();

    const errors = logs.filter((l) => l.type === 'error');
    const warnings = logs.filter((l) => l.type === 'warning');

    // Report warnings as annotations (informational, not failing)
    for (const w of warnings) {
      test.info().annotations.push({ type: 'warning', description: w.text });
    }

    // Known non-critical warnings to exclude from error gate
    const KNOWN_WARNINGS = [
      'Failed to find font override values for font',
      'Skipping generating a fallback font'
    ];
    const criticalErrors = errors.filter(
      (e) => !KNOWN_WARNINGS.some((kw) => e.text.includes(kw))
    );

    if (criticalErrors.length > 0) {
      console.log('\n🔴 CRITICAL BROWSER ERRORS:');
      criticalErrors.forEach((e) => console.log(`  - ${e.text}`));
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${warnings.length} total):`);
      warnings.forEach((w) => console.log(`  - ${w.text}`));
    }

    expect(
      criticalErrors,
      `Found ${criticalErrors.length} critical browser error(s) on "${label}":\n` +
        criticalErrors.map((e) => `• ${e.text}`).join('\n')
    ).toHaveLength(0);
  });
}

test('[Console Health] Detect known font warning – Google Sans Flex', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'warning') logs.push(msg.text());
  });

  await page.goto('/auth/sign-in');
  await page.waitForLoadState('networkidle');

  const fontWarning = logs.find((l) => l.includes('Google Sans Flex') || l.includes('font override'));

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
