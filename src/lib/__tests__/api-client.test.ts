// @ts-ignore
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import axios from 'axios';
import { executeTokenRefresh } from '../api-client';
import { useAuthStore } from '@/stores/use-auth-store';

describe('apiClient Mutex Lock & Single In-Flight Refresh Test', () => {
  let cookieJar: Record<string, string> = {};

  beforeEach(() => {
    cookieJar = {
      refreshToken: 'test-valid-refresh-token',
      access_token: 'test-expired-token'
    };

    // Realistic document.cookie mock with getter/setter
    globalThis.document = {
      getElementsByTagName: () => [{ appendChild: () => {} }],
      createElement: () => ({ setAttribute: () => {}, style: {}, appendChild: () => {} }),
      createTextNode: () => ({}),
      head: { appendChild: () => {} },
      get cookie() {
        return Object.entries(cookieJar)
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');
      },
      set cookie(str: string) {
        const [cookiePart] = str.split(';');
        const [name, val] = cookiePart.split('=');
        if (name) {
          cookieJar[name.trim()] = val ? val.trim() : '';
        }
      }
    } as any;

    globalThis.window = {
      location: {
        pathname: '/dashboard/overview',
        href: ''
      }
    } as any;

    useAuthStore.getState().logout();
  });

  it('should only fire 1 network request when multiple calls to executeTokenRefresh occur concurrently', async () => {
    let networkCallCount = 0;

    // Spy/Mock axios.post
    const originalPost = axios.post;
    axios.post = mock(async (url: string) => {
      if (url.includes('/api/v1/auth/refresh')) {
        networkCallCount++;
        // Simulate network latency of 30ms
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
          data: {
            statusCode: 200,
            data: {
              token: 'new-mocked-access-token-12345',
              refreshToken: 'new-mocked-refresh-token-67890'
            }
          }
        };
      }
      return { data: {} };
    }) as any;

    try {
      // Fire 10 concurrent calls
      const promises = Array.from({ length: 10 }, () => executeTokenRefresh());
      const results = await Promise.all(promises);

      // Verify Mutex Lock: EXACTLY 1 network request was fired
      expect(networkCallCount).toBe(1);

      // All 10 callers must receive the exact same new token
      results.forEach((token) => {
        expect(token).toBe('new-mocked-access-token-12345');
      });

      // Verify store was updated
      expect(useAuthStore.getState().accessToken).toBe('new-mocked-access-token-12345');
      expect(useAuthStore.getState().refreshToken).toBe('new-mocked-refresh-token-67890');

      // Verify cookies were synced
      expect(document.cookie).toContain('access_token=new-mocked-access-token-12345');
      expect(document.cookie).toContain('refreshToken=new-mocked-refresh-token-67890');
    } finally {
      axios.post = originalPost;
    }
  });

  it('should reset mutex lock after resolution so subsequent calls can refresh again', async () => {
    let networkCallCount = 0;

    const originalPost = axios.post;
    axios.post = mock(async (url: string) => {
      if (url.includes('/api/v1/auth/refresh')) {
        networkCallCount++;
        return {
          data: {
            statusCode: 200,
            data: {
              token: `token-batch-${networkCallCount}`,
              refreshToken: `refresh-batch-${networkCallCount}`
            }
          }
        };
      }
      return { data: {} };
    }) as any;

    try {
      // Batch 1 (3 concurrent calls)
      const batch1 = await Promise.all([
        executeTokenRefresh(),
        executeTokenRefresh(),
        executeTokenRefresh()
      ]);
      expect(networkCallCount).toBe(1);
      expect(batch1[0]).toBe('token-batch-1');
      expect(batch1[1]).toBe('token-batch-1');
      expect(batch1[2]).toBe('token-batch-1');

      // Batch 2 (after Batch 1 completed, 2 concurrent calls)
      const batch2 = await Promise.all([executeTokenRefresh(), executeTokenRefresh()]);
      expect(networkCallCount).toBe(2);
      expect(batch2[0]).toBe('token-batch-2');
      expect(batch2[1]).toBe('token-batch-2');
    } finally {
      axios.post = originalPost;
    }
  });

  it('should handle refresh failure cleanly and clear state', async () => {
    let networkCallCount = 0;

    const originalPost = axios.post;
    axios.post = mock(async () => {
      networkCallCount++;
      throw new Error('Refresh Token Revoked');
    }) as any;

    try {
      // 5 concurrent calls that all fail
      const promises = Array.from({ length: 5 }, () => executeTokenRefresh());
      const results = await Promise.allSettled(promises);

      // Only 1 failed network call was made
      expect(networkCallCount).toBe(1);

      // All 5 promises were rejected
      results.forEach((res) => {
        expect(res.status).toBe('rejected');
      });

      // User state was cleared and redirected
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(window.location.href).toBe('/auth/sign-in');
    } finally {
      axios.post = originalPost;
    }
  });
});
