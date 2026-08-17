import Image from 'next/image';
import { BrandLogoIcon } from '@/components/brand-logo';
import { LoginForm } from './login-form';

export default function SignInViewPage() {
  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background'>
      {/* Left Visual Column */}
      <div className='relative hidden h-full flex-col justify-between p-10 lg:flex dark:border-r bg-slate-950 text-white overflow-hidden select-none'>
        {/* Background Image with Atmospheric Overlays */}
        <div className='absolute inset-0 z-0'>
          <Image
            src='/images/auth-hero.jpg'
            alt='Smart Logistics Hub'
            fill
            priority
            sizes='50vw'
            className='object-cover opacity-65 scale-105 transition-transform duration-1000'
          />
          {/* Gradients for text readability & tech atmosphere */}
          <div className='absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/40 to-slate-950/90' />
          <div className='absolute inset-0 bg-gradient-to-r from-slate-950/60 to-transparent' />
        </div>

        {/* Top Brand Logo */}
        <div className='relative z-20 flex items-center justify-between'>
          <div className='flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white'>
            <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-cyan-400 ring-1 ring-white/20 shadow-lg shadow-cyan-500/20 backdrop-blur-md'>
              <BrandLogoIcon size={22} glow />
            </div>
            <span>Logistics TMS</span>
          </div>

          <div className='rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300 ring-1 ring-cyan-400/30 backdrop-blur-md'>
            Enterprise TMS
          </div>
        </div>

        {/* Center Floating Tech Badge */}
        <div className='relative z-20 my-auto flex flex-col items-start'>
          <div className='max-w-md rounded-2xl bg-slate-900/60 p-5 ring-1 ring-white/15 backdrop-blur-xl shadow-2xl space-y-2'>
            <div className='flex items-center gap-2 text-xs font-semibold text-cyan-300'>
              <span className='h-2 w-2 rounded-full bg-emerald-400 animate-ping' />
              <span>Hệ thống Quản trị Vận tải Số hóa</span>
            </div>
            <p className='text-sm text-slate-200 leading-relaxed'>
              Quản lý đơn hàng, điều phối vận chuyển, theo dõi tiến độ giao nhận và quản trị đội xe
              chuyên nghiệp trên một nền tảng tập trung.
            </p>
          </div>
        </div>

        {/* Bottom Testimonial / System Info */}
        <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2 rounded-xl bg-slate-950/60 p-4 ring-1 ring-white/10 backdrop-blur-md'>
            <p className='text-sm text-slate-200 italic'>
              &ldquo;Hệ thống quản lý vận tải giúp tối ưu hóa quy trình giao nhận và quản lý đội xe
              hiệu quả.&rdquo;
            </p>
            <footer className='text-xs font-medium text-slate-400'>Logistics TMS Platform</footer>
          </blockquote>
        </div>
      </div>

      {/* Right Login Form Column */}
      <div className='flex h-full items-center justify-center p-4 lg:p-8 bg-background'>
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>
          <div className='flex flex-col space-y-2 text-center'>
            <h1 className='text-2xl font-semibold tracking-tight text-foreground'>Đăng nhập</h1>
            <p className='text-muted-foreground text-sm'>
              Nhập email và mật khẩu được cung cấp bởi quản trị viên
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
