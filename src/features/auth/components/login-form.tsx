'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { useAuthStore } from '@/stores/use-auth-store';
import { apiClient } from '@/lib/api-client';

export function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { data } = await apiClient.post('/api/v1/auth/login', {
        email,
        password
      });

      const { access_token, user } = data;

      // Store auth state
      setAuth(user, access_token);

      // Also set access_token as cookie for middleware to read
      document.cookie = `access_token=${access_token}; path=/; max-age=${15 * 60}; SameSite=Strict`;

      router.push('/dashboard/overview');
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className='w-full space-y-4'>
      {error && (
        <div className='bg-destructive/10 text-destructive rounded-md p-3 text-sm'>{error}</div>
      )}
      <div className='space-y-2'>
        <Label htmlFor='email'>Email</Label>
        <Input
          id='email'
          name='email'
          type='email'
          placeholder='name@company.com'
          required
          autoComplete='email'
          disabled={isLoading}
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='password'>Mật khẩu</Label>
        <Input
          id='password'
          name='password'
          type='password'
          placeholder='••••••••'
          required
          autoComplete='current-password'
          disabled={isLoading}
        />
      </div>
      <Button type='submit' className='w-full' disabled={isLoading}>
        {isLoading && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
        Đăng nhập
      </Button>
    </form>
  );
}
