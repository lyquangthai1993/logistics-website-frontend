import Image from 'next/image';
import { AUTH_BRAND, AUTH_HERO_IMAGE } from '../constants/auth-assets';

export interface AuthHeroBannerProps {
  tagBadge?: string;
  cardTitle?: string;
  cardDescription?: string;
  quoteText?: string;
  quoteFooter?: string;
}

export function AuthHeroBanner({
  tagBadge = AUTH_BRAND.slogan,
  cardTitle = AUTH_BRAND.tagline,
  cardDescription = AUTH_BRAND.description,
  quoteText = AUTH_BRAND.quote,
  quoteFooter = AUTH_BRAND.platformFooter
}: AuthHeroBannerProps) {
  return (
    <div className='relative hidden h-full flex-col justify-between p-10 lg:flex dark:border-r bg-slate-900 text-white overflow-hidden select-none'>
      {/* Background Image with Atmospheric Overlays */}
      <div className='absolute inset-0 z-0'>
        <Image
          src={AUTH_HERO_IMAGE}
          alt={AUTH_BRAND.fullName}
          fill
          priority
          sizes='50vw'
          quality={85}
          className='object-cover opacity-95 scale-100 transition-transform duration-700'
        />
        {/* Gradients for text readability & tech atmosphere - lightened for visual clarity */}
        <div className='absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/15 to-slate-950/70' />
        <div className='absolute inset-0 bg-gradient-to-r from-slate-950/30 via-transparent to-transparent' />
      </div>

      {/* Top Brand Logo */}
      <div className='relative z-20 flex items-start justify-between'>
        <div className='flex flex-col items-start'>
          <div className='relative overflow-hidden rounded-xl border border-white/20 shadow-xl bg-slate-950/80 backdrop-blur-md p-1.5'>
            <Image
              src='/images/logo_phieu_xuat_nhap_kho.jpg'
              alt={AUTH_BRAND.name}
              width={200}
              height={55}
              priority
              className='h-11 w-auto object-contain rounded-md'
            />
          </div>
          <span className='text-xs text-cyan-400 font-semibold tracking-wider mt-2 pl-1 drop-shadow-sm'>
            S-Hub
          </span>
        </div>

        <div className='rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300 ring-1 ring-cyan-400/30 backdrop-blur-md flex items-center gap-1.5 mt-1'>
          <span className='h-1.5 w-1.5 rounded-full bg-amber-400' />
          <span>{tagBadge}</span>
        </div>
      </div>

      {/* Center Floating Tech Badge */}
      <div className='relative z-20 my-auto flex flex-col items-start'>
        <div className='max-w-md rounded-2xl bg-slate-900/40 p-5 ring-1 ring-white/25 backdrop-blur-md shadow-2xl space-y-2'>
          <div className='flex items-center gap-2 text-xs font-semibold text-cyan-300'>
            <span className='h-2 w-2 rounded-full bg-emerald-400 animate-ping' />
            <span>{cardTitle}</span>
          </div>
          <p className='text-sm text-slate-100 leading-relaxed drop-shadow-sm'>{cardDescription}</p>
        </div>
      </div>

      {/* Bottom Testimonial / System Info */}
      <div className='relative z-20 mt-auto'>
        <blockquote className='space-y-2 rounded-xl bg-slate-900/40 p-4 ring-1 ring-white/20 backdrop-blur-md'>
          <p className='text-sm text-slate-100 italic drop-shadow-sm'>&ldquo;{quoteText}&rdquo;</p>
          <footer className='text-xs font-medium text-slate-300'>{quoteFooter}</footer>
        </blockquote>
      </div>
    </div>
  );
}
