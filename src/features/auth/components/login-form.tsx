'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { formatApiError } from '@/lib/api-error';
import { apiClient } from '@/lib/api-client';
import { normalizeRole } from '@/lib/role-utils';
import { tokenManager } from '@/lib/token-manager';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post(
        '/api/v1/auth/email/login',
        {
          email,
          password
        },
        { timeout: 35000 }
      );

      const payload = data?.data || data || {};
      const token = payload.token || payload.access_token;
      const refreshToken = payload.refreshToken || payload.refresh_token;
      const rawUser = payload.user || {};

      if (!token) {
        throw new Error('Máy chủ không trả về mã xác thực hợp lệ. Vui lòng thử lại.');
      }

      const roleCode = normalizeRole(rawUser.role);
      if (!roleCode) {
        throw new Error('Tài khoản chưa được gán vai trò hợp lệ. Vui lòng liên hệ quản trị viên.');
      }

      const user = {
        ...rawUser,
        name:
          rawUser.name ||
          `${rawUser.firstName || ''} ${rawUser.lastName || ''}`.trim() ||
          rawUser.username ||
          rawUser.email,
        role: roleCode
      };

      // Store auth state & notify all tabs
      tokenManager.notifyLogin(user, token, refreshToken);

      // Determine redirect destination from URL query params or user role
      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam =
        searchParams.get('redirect') || searchParams.get('callbackUrl') || searchParams.get('from');

      let targetUrl = '/dashboard/warehouse/orders';
      const role = normalizeRole(user.role);
      if (role === 'WAREHOUSE_MANAGER') {
        targetUrl = '/dashboard/warehouse/orders';
      } else if (role === 'REPORT_VIEWER') {
        targetUrl = '/dashboard/admin/reports';
      } else if (role === 'FLEET_MANAGER') {
        targetUrl = '/dashboard/trips';
      } else if (role === 'DISPATCHER') {
        targetUrl = '/dashboard/warehouse/orders';
      }

      if (
        redirectParam &&
        redirectParam.startsWith('/dashboard') &&
        redirectParam !== '/dashboard/overview' &&
        redirectParam !== '/dashboard/orders' &&
        redirectParam !== '/dashboard'
      ) {
        targetUrl = redirectParam;
      }

      // Hard redirect ensures fresh SSR load, transmits cookies to headers, and clears stale router cache
      window.location.replace(targetUrl);
    } catch (err: unknown) {
      const message = formatApiError(
        err,
        'Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.'
      );
      setError(message);
      setIsLoading(false);
    }
  }

  return (
    <div className='w-full space-y-4'>
      <form
        method='post'
        action='javascript:void(0);'
        onSubmit={onSubmit}
        className='w-full space-y-4'
        data-hydrated={mounted ? 'true' : 'false'}
      >
        <div className='space-y-2'>
          <Label htmlFor='email'>Email hoặc Tên đăng nhập</Label>
          <Input
            id='email'
            name='email'
            type='text'
            placeholder='Nhập email hoặc tên đăng nhập...'
            required
            autoComplete='username'
            disabled={isLoading || !mounted}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='password'>Mật khẩu</Label>
          <div className='relative'>
            <Input
              id='password'
              name='password'
              type={showPassword ? 'text' : 'password'}
              placeholder='••••••••'
              required
              autoComplete='current-password'
              disabled={isLoading || !mounted}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              className='pr-10'
            />
            <button
              type='button'
              onClick={() => setShowPassword((prev) => !prev)}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md cursor-pointer'
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              tabIndex={-1}
            >
              {showPassword ? <IconEyeOff className='h-4 w-4' /> : <IconEye className='h-4 w-4' />}
            </button>
          </div>
          <div className='flex items-center justify-between text-xs pt-1'>
            <label className='flex items-center gap-2 text-muted-foreground cursor-pointer select-none'>
              <input
                type='checkbox'
                className='rounded border-border text-primary shadow-sm focus:ring-primary h-3.5 w-3.5'
              />
              <span>Ghi nhớ tài khoản</span>
            </label>
            <Link
              href='/auth/forgot-password'
              className='font-medium text-blue-600 dark:text-cyan-400 hover:underline transition-colors flex items-center gap-1'
            >
              Quên mật khẩu? <span aria-hidden='true'>→</span>
            </Link>
          </div>
        </div>
        <Button
          type='submit'
          className='w-full'
          disabled={isLoading || !mounted}
          data-testid='login-submit-btn'
        >
          {isLoading && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
          Đăng nhập
        </Button>
        {error && (
          <div
            data-testid='login-error'
            className='bg-destructive/10 text-destructive rounded-md p-3 text-sm flex items-start gap-2 animate-in fade-in-50 duration-200'
          >
            <Icons.warning className='h-4 w-4 shrink-0 mt-0.5' />
            <span>{error}</span>
          </div>
        )}
      </form>
    </div>
  );
}
