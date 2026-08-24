'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover';
import { Icons } from '@/components/icons';
import {
  IconKey,
  IconCopy,
  IconCheck,
  IconUserCheck,
  IconEye,
  IconEyeOff,
  IconUser
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { formatApiError } from '@/lib/api-error';
import { apiClient } from '@/lib/api-client';
import { tokenManager } from '@/lib/token-manager';
import { cn } from '@/lib/utils';

const DEMO_ACCOUNTS = [
  {
    role: 'Super Admin',
    roleCode: 'SUPER_ADMIN',
    username: 'admin',
    email: 'lyquangthai1993+1@gmail.com',
    password: 'secret',
    altPassword: 'Admin@123',
    badgeVariant: 'destructive' as const,
    description: 'Quản trị hệ thống toàn quyền'
  },
  {
    role: 'Điều phối viên',
    roleCode: 'DISPATCHER',
    username: 'dispatcher',
    email: 'lyquangthai1993+2@gmail.com',
    password: 'secret',
    altPassword: 'Dispatcher@123',
    badgeVariant: 'default' as const,
    description: 'Tạo & điều phối đơn hàng, chuyến xe'
  },
  {
    role: 'Quản lý Đội xe',
    roleCode: 'FLEET_MANAGER',
    username: 'fleet',
    email: 'lyquangthai1993+3@gmail.com',
    password: 'secret',
    altPassword: 'Fleet@123',
    badgeVariant: 'secondary' as const,
    description: 'Quản lý phương tiện và tài xế'
  },
  {
    role: 'Quản lý Kho',
    roleCode: 'WAREHOUSE_MANAGER',
    username: 'warehouse',
    email: 'lyquangthai1993+4@gmail.com',
    password: 'secret',
    altPassword: 'Warehouse@123',
    badgeVariant: 'outline' as const,
    description: 'Quản lý kho hàng & xuất nhập tồn'
  }
];

export function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleQuickFill = (identifier: string, accPass: string) => {
    setEmail(identifier);
    setPassword(accPass);
    setError(null);
    setPopoverOpen(false);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1500);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post('/api/v1/auth/email/login', {
        email,
        password
      });

      const payload = data?.data || data || {};
      const token = payload.token || payload.access_token;
      const refreshToken = payload.refreshToken || payload.refresh_token;
      const rawUser = payload.user || {};

      // Map numerical or object role to string role enum used in frontend
      const roleMap: Record<number | string, any> = {
        1: 'SUPER_ADMIN',
        2: 'DISPATCHER',
        3: 'FLEET_MANAGER',
        4: 'WAREHOUSE_MANAGER'
      };

      const roleCode =
        typeof rawUser.role === 'object' && rawUser.role?.id
          ? roleMap[rawUser.role.id] || 'SUPER_ADMIN'
          : roleMap[rawUser.role] || rawUser.role || 'SUPER_ADMIN';

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

      router.push('/dashboard/overview');
    } catch (err: unknown) {
      const message = formatApiError(err, 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className='w-full space-y-4'>
      {/* Demo Accounts Popover Header */}
      <div className='flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/10'>
        <span className='text-xs font-medium text-amber-700 dark:text-amber-300'>
          💡 Thử nghiệm phiên bản Demo?
        </span>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            render={
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-7 gap-1.5 text-xs font-medium border-amber-500/30 bg-background hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-300'
              />
            }
          >
            <IconKey className='h-3.5 w-3.5 text-amber-500' />
            Xem tài khoản Demo
          </PopoverTrigger>

          <PopoverContent className='w-84 p-4 sm:w-96' align='end' sideOffset={8}>
            <PopoverHeader className='pb-2 border-b border-border/40'>
              <PopoverTitle className='flex items-center gap-2 text-sm font-semibold'>
                <IconKey className='h-4 w-4 text-amber-500' />
                Tài khoản Demo có sẵn
              </PopoverTitle>
              <PopoverDescription className='text-xs text-muted-foreground'>
                Hỗ trợ đăng nhập bằng <b>Username</b> hoặc <b>Email</b>
              </PopoverDescription>
            </PopoverHeader>

            <div className='mt-3 space-y-2.5 max-h-[340px] overflow-y-auto pr-1'>
              {DEMO_ACCOUNTS.map((acc) => (
                <div
                  key={acc.email}
                  className='group relative flex flex-col justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5 transition-all hover:bg-muted/70 hover:border-border'
                >
                  <div className='flex items-center justify-between mb-1.5'>
                    <div className='flex items-center gap-1.5'>
                      <Badge variant={acc.badgeVariant} className='text-[10px] px-1.5 py-0'>
                        {acc.role}
                      </Badge>
                      <span className='inline-flex items-center gap-1 text-[11px] font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded'>
                        <IconUser className='h-3 w-3' />
                        {acc.username}
                      </span>
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-7 px-2 text-xs gap-1 text-primary font-medium hover:bg-primary/10'
                      onClick={() => handleQuickFill(acc.username, acc.password)}
                    >
                      <IconUserCheck className='h-3.5 w-3.5' />
                      Điền form
                    </Button>
                  </div>

                  <div className='space-y-1 text-xs'>
                    <div className='flex items-center justify-between text-muted-foreground'>
                      <span className='font-mono text-[11px] text-foreground font-medium selection:bg-amber-500/20 truncate max-w-[200px]'>
                        {acc.email}
                      </span>
                      <div className='flex items-center gap-1'>
                        <button
                          type='button'
                          onClick={() => handleCopy(acc.username, `user-${acc.username}`)}
                          className='text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-pointer text-[10px] font-mono bg-background px-1 rounded border border-border/40'
                          title='Copy username'
                        >
                          {copiedField === `user-${acc.username}` ? (
                            <span className='text-emerald-500 font-semibold'>Copied</span>
                          ) : (
                            'user'
                          )}
                        </button>
                        <button
                          type='button'
                          onClick={() => handleCopy(acc.email, `email-${acc.email}`)}
                          className='text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-pointer text-[10px] font-mono bg-background px-1 rounded border border-border/40'
                          title='Copy email'
                        >
                          {copiedField === `email-${acc.email}` ? (
                            <span className='text-emerald-500 font-semibold'>Copied</span>
                          ) : (
                            'email'
                          )}
                        </button>
                      </div>
                    </div>
                    <div className='flex items-center justify-between text-muted-foreground text-[11px]'>
                      <span>
                        Mật khẩu:{' '}
                        <code className='font-mono text-foreground bg-background px-1 rounded border border-border/40'>
                          {acc.password}
                        </code>{' '}
                        <span className='text-[10px] text-muted-foreground'>
                          (hoặc {acc.altPassword})
                        </span>
                      </span>
                      <button
                        type='button'
                        onClick={() => handleCopy(acc.password, `pass-${acc.email}`)}
                        className='text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-pointer'
                        title='Copy mật khẩu'
                      >
                        {copiedField === `pass-${acc.email}` ? (
                          <IconCheck className='h-3.5 w-3.5 text-emerald-500' />
                        ) : (
                          <IconCopy className='h-3.5 w-3.5' />
                        )}
                      </button>
                    </div>
                    <p className='text-[10px] text-muted-foreground/80 italic mt-0.5'>
                      {acc.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <form onSubmit={onSubmit} className='w-full space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='email'>Email hoặc Tên đăng nhập</Label>
          <Input
            id='email'
            name='email'
            type='text'
            placeholder='Nhập email hoặc tên đăng nhập...'
            required
            autoComplete='username'
            disabled={isLoading}
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
              disabled={isLoading}
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
              <input type='checkbox' className='rounded border-border text-primary shadow-sm focus:ring-primary h-3.5 w-3.5' />
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
        <Button type='submit' className='w-full' disabled={isLoading}>
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
