import http from 'node:http';

/**
 * Pre-flight server check for Playwright E2E tests
 * Verifies that:
 * 1. Next.js Frontend is running on http://localhost:3000
 * 2. NestJS Backend is running on http://localhost:3001
 */

async function checkUrl(url, timeoutMs = 3000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);
    return { ok: res.status < 500, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log('🔍 [Pre-Flight Check] Verifying dev servers before running E2E tests...');
  
  const frontendUrl = 'http://localhost:3000';
  const backendUrl = 'http://localhost:3001';
  
  const frontend = await checkUrl(frontendUrl);
  // Try backend root first, fallback to /api/v1 if root returned 404
  let backend = await checkUrl(backendUrl);
  if (!backend.ok && backend.status === 404) {
    backend = await checkUrl(`${backendUrl}/api/v1`);
  }

  let failed = false;

  if (frontend.ok) {
    console.log(`✅ Frontend (${frontendUrl}) is UP [HTTP ${frontend.status}]`);
  } else {
    console.error(`❌ Frontend (${frontendUrl}) is DOWN! Error: ${frontend.error || `HTTP ${frontend.status}`}`);
    failed = true;
  }

  if (backend.ok) {
    console.log(`✅ Backend (${backendUrl}) is UP [HTTP ${backend.status}]`);
  } else {
    console.error(`❌ Backend (${backendUrl}) is DOWN! Error: ${backend.error || `HTTP ${backend.status}`}`);
    failed = true;
  }

  if (failed) {
    console.error('\n🚨 Pre-flight check FAILED! E2E tests cannot run without both servers active.');
    console.error('💡 Solution: Run "npm run dev" in the root directory to start both servers.\n');
    process.exit(1);
  }

  console.log('🚀 Pre-flight check PASSED! Both servers are active and ready.\n');
}

main();
