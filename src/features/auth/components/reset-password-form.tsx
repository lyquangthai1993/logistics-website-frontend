'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { IconLock, IconEye, IconEyeOff, IconCheck, IconArrowLeft } from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';
import { formatApiError } from '@/lib/api-error';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hash = searchParams.get('hash') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!hash) {
      setError('Mã xác nhận khôi phục không hợp lệ hoặc đã hết hạn. Vui lòng gửi lại yêu cầu.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.post('/api/v1/auth/reset/password', {
        hash,
        password
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      const message = formatApiError(
        err,
        'Đặt lại mật khẩu thất bại. Mã liên kết có thể đã hết hạn hoặc không hợp lệ.'
      );
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div className='w-full space-y-6 animate-in fade-in-50 duration-300'>
        <div className='rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center space-y-3 dark:border-emerald-500/30 dark:bg-emerald-500/15'>
          <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-500/10'>
            <IconCheck className='h-6 w-6' />
          </div>
          <h3 className='text-lg font-semibold text-foreground'>Đặt lại mật khẩu thành công!</h3>
          <p className='text-sm text-muted-foreground leading-relaxed'>
            Mật khẩu mới của bạn đã được cập nhật thành công vào hệ thống. Bây giờ bạn có thể đăng
            nhập bằng mật khẩu mới.
          </p>
        </div>

        <Link href='/auth/sign-in' className='block w-full'>
          <Button className='w-full h-10 font-medium gap-2'>
            <IconLock className='h-4 w-4' />
            Đăng nhập ngay
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className='w-full space-y-6'>
      {!hash && (
        <div className='bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl p-3.5 text-xs flex items-start gap-2.5'>
          <Icons.warning className='h-4 w-4 shrink-0 mt-0.5' />
          <span>
            <b>Cảnh báo:</b> Không tìm thấy mã liên kết khôi phục (hash). Vui lòng đảm bảo bạn truy
            cập qua liên kết trong Email.
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} className='w-full space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='password'>
            Mật khẩu mới <span className='text-destructive'>*</span>
          </Label>
          <div className='relative'>
            <Input
              id='password'
              name='password'
              type={showPassword ? 'text' : 'password'}
              placeholder='••••••••'
              required
              minLength={6}
              disabled={isLoading || !hash}
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
              tabIndex={-1}
            >
              {showPassword ? <IconEyeOff className='h-4 w-4' /> : <IconEye className='h-4 w-4' />}
            </button>
          </div>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='confirmPassword'>
            Xác nhận mật khẩu mới <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='confirmPassword'
            name='confirmPassword'
            type={showPassword ? 'text' : 'password'}
            placeholder='••••••••'
            required
            minLength={6}
            disabled={isLoading || !hash}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (error) setError(null);
            }}
          />
        </div>

        {error && (
          <div className='bg-destructive/10 text-destructive rounded-md p-3 text-sm flex items-start gap-2 animate-in fade-in-50 duration-200'>
            <Icons.warning className='h-4 w-4 shrink-0 mt-0.5' />
            <span>{error}</span>
          </div>
        )}

        <Button type='submit' className='w-full h-10 font-medium' disabled={isLoading || !hash}>
          {isLoading && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
          Cập nhật mật khẩu mới
        </Button>

        <div className='pt-2 text-center'>
          <Link
            href='/auth/sign-in'
            className='inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors hover:underline'
          >
            <IconArrowLeft className='h-4 w-4' />
            Quay lại trang đăng nhập
          </Link>
        </div>
      </form>
    </div>
  );
}
