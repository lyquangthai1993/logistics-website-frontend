'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { IconMail, IconKey, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';
import { formatApiError } from '@/lib/api-error';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.post('/api/v1/auth/forgot/password', {
        email: email.trim()
      });
      setIsSubmitted(true);
    } catch (err: unknown) {
      const message = formatApiError(
        err,
        'Gửi yêu cầu khôi phục thất bại. Vui lòng kiểm tra lại email hoặc thử lại sau.'
      );
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className='w-full space-y-6 animate-in fade-in-50 duration-300'>
        <div className='rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center space-y-3 dark:border-emerald-500/30 dark:bg-emerald-500/15'>
          <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-500/10'>
            <IconCheck className='h-6 w-6' />
          </div>
          <h3 className='text-lg font-semibold text-foreground'>Đã gửi yêu cầu khôi phục!</h3>
          <p className='text-sm text-muted-foreground leading-relaxed'>
            Chúng tôi đã gửi hướng dẫn và liên kết đặt lại mật khẩu đến địa chỉ email:
            <br />
            <strong className='font-mono text-foreground font-semibold'>{email}</strong>
          </p>
          <div className='rounded-lg bg-background/80 p-3 text-xs text-muted-foreground border border-border/50'>
            💡 Vui lòng kiểm tra cả hộp thư rác (Spam/Junk) nếu không thấy email trong hộp thư đến.
            Liên kết có hiệu lực trong <b>15 phút</b>.
          </div>
        </div>

        <div className='flex flex-col space-y-2'>
          <Link href='/auth/sign-in' className='w-full block'>
            <Button className='w-full h-10 font-medium gap-2'>
              <IconArrowLeft className='h-4 w-4' />
              Quay lại trang đăng nhập
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full space-y-6'>
      {/* Alert Badge Info */}
      <div className='flex items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium'>
        <span className='flex items-center gap-2'>
          <IconMail className='h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0' />
          Nhận mã OTP qua Email
        </span>
        <span className='flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono shrink-0'>
          <IconKey className='h-3.5 w-3.5' />
          Hiệu lực: 15 phút
        </span>
      </div>

      <form onSubmit={onSubmit} className='w-full space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='email'>
            Địa chỉ Email doanh nghiệp <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='email'
            name='email'
            type='email'
            placeholder='vd: dispatcher@logistics.vn, admin@logistics.vn'
            required
            autoComplete='email'
            disabled={isLoading}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
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

        <Button type='submit' className='w-full h-10 font-medium' disabled={isLoading}>
          {isLoading && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
          Gửi liên kết khôi phục
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
