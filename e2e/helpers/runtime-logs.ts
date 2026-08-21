/**
 * e2e/helpers/runtime-logs.ts
 *
 * Captures server-side runtime logs from Next.js dev server and NestJS backend
 * by probing API routes that reflect recent server activity, and by intercepting
 * network responses that indicate server-side errors (500, 502, 503).
 *
 * Strategy:
 * - Network response interception: catch all non-2xx responses during test
 * - Next.js error overlay detection: check for __NEXT_ERROR__ in DOM
 * - NestJS health endpoint: GET /api/v1/health → confirms backend alive
 * - Server timing headers: parse Server-Timing for backend latency signals
 */
import type { Page, Response } from '@playwright/test';

export interface ServerError {
  url: string;
  status: number;
  method: string;
  body?: string;
}

export interface RuntimeLogSession {
  getServerErrors: () => ServerError[];
  getSlowRequests: (thresholdMs?: number) => Array<{ url: string; durationMs: number }>;
  stop: () => void;
}

/**
 * Start capturing server-side runtime errors for a Playwright page.
 * Records all non-2xx API responses and slow requests.
 */
export function captureRuntimeLogs(page: Page): RuntimeLogSession {
  const serverErrors: ServerError[] = [];
  const requestTimings: Array<{ url: string; startMs: number; endMs?: number }> = [];

  // Track request start times
  page.on('request', (req) => {
    const url = req.url();
    // Only track API and page calls (skip fonts, images, static)
    if (url.includes('/api/') || url.startsWith('http://localhost:3000/dashboard')) {
      requestTimings.push({ url, startMs: Date.now() });
    }
  });

  // Intercept ALL responses to detect server errors
  const responseHandler = async (response: Response) => {
    const status = response.status();
    const url = response.url();

    // Record timing
    const timing = requestTimings.find((t) => t.url === url && !t.endMs);
    if (timing) timing.endMs = Date.now();

    // Flag any server-side error (5xx) or unexpected client error
    if (status >= 400) {
      let body = '';
      try {
        // Only read body for JSON API responses to avoid hanging on streams
        const contentType = response.headers()['content-type'] ?? '';
        if (contentType.includes('application/json')) {
          body = await response.text();
        }
      } catch {
        body = '[unreadable]';
      }

      serverErrors.push({
        url,
        status,
        method: response.request().method(),
        body: body.slice(0, 500), // truncate to 500 chars
      });
    }
  };

  page.on('response', responseHandler);

  return {
    getServerErrors: () => serverErrors,
    getSlowRequests: (thresholdMs = 3000) =>
      requestTimings
        .filter((t) => t.endMs && t.endMs - t.startMs > thresholdMs)
        .map((t) => ({ url: t.url, durationMs: (t.endMs ?? 0) - t.startMs })),
    stop: () => {
      page.off('response', responseHandler);
    },
  };
}

/**
 * Check if Next.js has rendered a server-side error overlay on the page.
 * Returns the error message if found, null otherwise.
 */
export async function detectNextJsErrorOverlay(page: Page): Promise<string | null> {
  try {
    const errorDialog = page.locator(
      'nextjs-portal [role="dialog"], [data-nextjs-dialog-header], #__next-error-overlay'
    );
    const isVisible = await errorDialog.first().isVisible().catch(() => false);
    if (isVisible) {
      const text = (await errorDialog.first().textContent())?.trim();
      if (text && text.length > 0) return text;
    }

    // Check for explicit 500 Internal Server Error heading
    const errorHeading = page.locator('h1, h2').filter({ hasText: /500|Internal Server Error/i });
    if (await errorHeading.first().isVisible().catch(() => false)) {
      return 'SSR error detected on page (500 Internal Server Error heading visible)';
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Ping the NestJS backend health endpoint to confirm it's alive.
 * Returns status code and response time.
 */
export async function checkBackendHealth(
  page: Page,
  backendUrl = 'http://localhost:3001',
): Promise<{ alive: boolean; statusCode: number; latencyMs: number }> {
  const start = Date.now();
  let statusCode = 0;

  try {
    const response = await page.request.get(`${backendUrl}/api/v1`, {
      timeout: 5000,
      failOnStatusCode: false,
    });
    statusCode = response.status();
  } catch {
    statusCode = 0; // unreachable
  }

  return {
    alive: statusCode > 0 && statusCode < 500,
    statusCode,
    latencyMs: Date.now() - start,
  };
}
