import Image from 'next/image';
import { BrandLogoIcon } from '@/components/brand-logo';
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
    <div className='relative hidden h-full flex-col justify-between p-10 lg:flex dark:border-r bg-slate-950 text-white overflow-hidden select-none'>
      {/* Background Image with Atmospheric Overlays */}
      <div className='absolute inset-0 z-0'>
        <Image
          src={AUTH_HERO_IMAGE}
          alt={AUTH_BRAND.fullName}
          fill
          priority
          sizes='50vw'
          quality={85}
          className='object-cover opacity-75 scale-100 transition-transform duration-700'
        />
        {/* Gradients for text readability & tech atmosphere */}
        <div className='absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-slate-950/95' />
        <div className='absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/40 to-transparent' />
      </div>

      {/* Top Brand Logo */}
      <div className='relative z-20 flex items-center justify-between'>
        <div className='flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white'>
          <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-cyan-400 ring-1 ring-white/20 shadow-lg shadow-cyan-500/20 backdrop-blur-md'>
            <BrandLogoIcon size={22} glow />
          </div>
          <div className='flex flex-col'>
            <span className='font-bold leading-none tracking-tight'>{AUTH_BRAND.name}</span>
            <span className='text-[10px] text-cyan-400 font-mono tracking-wider uppercase mt-0.5'>
              Logistics TMS
            </span>
          </div>
        </div>

        <div className='rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300 ring-1 ring-cyan-400/30 backdrop-blur-md flex items-center gap-1.5'>
          <span className='h-1.5 w-1.5 rounded-full bg-amber-400' />
          <span>{tagBadge}</span>
        </div>
      </div>

      {/* Center Floating Tech Badge */}
      <div className='relative z-20 my-auto flex flex-col items-start'>
        <div className='max-w-md rounded-2xl bg-slate-900/60 p-5 ring-1 ring-white/15 backdrop-blur-xl shadow-2xl space-y-2'>
          <div className='flex items-center gap-2 text-xs font-semibold text-cyan-300'>
            <span className='h-2 w-2 rounded-full bg-emerald-400 animate-ping' />
            <span>{cardTitle}</span>
          </div>
          <p className='text-sm text-slate-200 leading-relaxed'>{cardDescription}</p>
        </div>
      </div>

      {/* Bottom Testimonial / System Info */}
      <div className='relative z-20 mt-auto'>
        <blockquote className='space-y-2 rounded-xl bg-slate-950/60 p-4 ring-1 ring-white/10 backdrop-blur-md'>
          <p className='text-sm text-slate-200 italic'>&ldquo;{quoteText}&rdquo;</p>
          <footer className='text-xs font-medium text-slate-400'>{quoteFooter}</footer>
        </blockquote>
      </div>
    </div>
  );
}
