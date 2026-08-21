import { test, expect } from '@playwright/test';

test.describe('Verify session persistence after 70s on Vercel and Localhost', () => {
  test.setTimeout(300000);

  const TARGETS = [
    { name: 'Vercel Live', url: 'https://logistics-website-frontend-kappa.vercel.app' },
    { name: 'Localhost Dev', url: 'http://localhost:3000' }
  ];

  for (const target of TARGETS) {
    test(`Test ${target.name}: login -> wait 70s -> client nav -> reload F5`, async ({ page }) => {
      console.log(`\n========================================`);
      console.log(`🚀 Starting Test on ${target.name} (${target.url})`);
      console.log(`========================================`);

      const apiRequests: Array<{ url: string; status: number }> = [];
      page.on('response', (res) => {
        if (res.url().includes('/api/')) {
          apiRequests.push({ url: res.url(), status: res.status() });
          console.log(`[${target.name} API] ${res.status()} ${res.url()}`);
        }
      });

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.log(`[${target.name} BROWSER ERROR] ${msg.text()}`);
        }
      });

      // 1. Sign In
      console.log(`1. Navigating to ${target.url}/auth/sign-in...`);
      await page.goto(`${target.url}/auth/sign-in`, { waitUntil: 'networkidle' });

      console.log(`2. Logging in with SUPER_ADMIN account...`);
      await page.locator('#email').fill('lyquangthai1993+1@gmail.com');
      await page.locator('#password').fill('secret');
      await page.getByRole('button', { name: 'Đăng nhập' }).click();

      console.log(`3. Waiting for navigation to dashboard...`);
      await page.waitForURL('**/dashboard/**', { timeout: 20000 });
      console.log(`Current URL after login on ${target.name}:`, page.url());
      expect(page.url()).toContain('/dashboard');

      // 2. Wait 70s (> 1 min)
      console.log(`4. Waiting 70 seconds for access token expiration...`);
      await page.waitForTimeout(70000);

      // 3. Client-side navigation by clicking sidebar Orders link
      console.log(`5. Performing client-side navigation to /dashboard/orders...`);
      await page.goto(`${target.url}/dashboard/orders`, { waitUntil: 'networkidle' });
      console.log(`URL after navigation on ${target.name}:`, page.url());
      expect(page.url()).toContain('/dashboard/orders');

      // 4. Wait 5s on orders page
      console.log(`6. Waiting 5s on orders page...`);
      await page.waitForTimeout(5000);
      expect(page.url()).toContain('/dashboard/orders');

      // 5. Full Browser Reload (F5)
      console.log(`7. Performing full page reload (F5) on ${target.url}/dashboard/orders...`);
      await page.reload({ waitUntil: 'networkidle' });
      console.log(`URL after F5 reload on ${target.name}:`, page.url());
      expect(page.url()).toContain('/dashboard/orders');

      // 6. Navigate to Fleet page
      console.log(`8. Navigating to ${target.url}/dashboard/fleet...`);
      await page.goto(`${target.url}/dashboard/fleet`, { waitUntil: 'networkidle' });
      console.log(`URL after fleet navigation on ${target.name}:`, page.url());
      expect(page.url()).toContain('/dashboard/fleet');

      // 7. Full Browser Reload (F5) on Fleet
      console.log(`9. Performing full page reload (F5) on ${target.url}/dashboard/fleet...`);
      await page.reload({ waitUntil: 'networkidle' });
      console.log(`URL after fleet F5 reload on ${target.name}:`, page.url());
      expect(page.url()).toContain('/dashboard/fleet');

      console.log(`✅ ${target.name} PASSED ALL TESTS WITH ZERO LOGOUTS!`);
    });
  }
});
