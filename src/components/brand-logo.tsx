import React from 'react';
import { cn } from '@/lib/utils';

export interface BrandLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  glow?: boolean;
}

/**
 * Modern High-Tech Logistics TMS Brand Logo Icon.
 * Features an isometric tech nexus cube with dynamic transit vectors and glowing route nodes.
 */
export function BrandLogoIcon({ className, size = 24, glow = false, ...props }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 32 32'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={cn(
        'shrink-0 transition-transform duration-300',
        glow && 'drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]',
        className
      )}
      {...props}
    >
      <defs>
        <linearGradient
          id='tms-brand-grad-primary'
          x1='4'
          y1='4'
          x2='28'
          y2='28'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#38BDF8' />
          <stop offset='50%' stopColor='#2563EB' />
          <stop offset='100%' stopColor='#1E40AF' />
        </linearGradient>
        <linearGradient
          id='tms-brand-grad-accent'
          x1='8'
          y1='8'
          x2='24'
          y2='24'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#00F2FE' />
          <stop offset='100%' stopColor='#4FACFE' />
        </linearGradient>
        <linearGradient
          id='tms-brand-grad-light'
          x1='16'
          y1='4'
          x2='16'
          y2='16'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#FFFFFF' stopOpacity='0.45' />
          <stop offset='100%' stopColor='#FFFFFF' stopOpacity='0.05' />
        </linearGradient>
      </defs>

      {/* Hexagonal Tech Nexus Base */}
      <path
        d='M16 3.5L27 9.85V22.15L16 28.5L5 22.15V9.85L16 3.5Z'
        fill='url(#tms-brand-grad-primary)'
      />

      {/* Top Facet Highlight */}
      <path d='M16 3.5L27 9.85L16 16L5 9.85L16 3.5Z' fill='url(#tms-brand-grad-light)' />

      {/* Right Facet Shading */}
      <path d='M16 16L27 9.85V22.15L16 28.5V16Z' fill='#000000' fillOpacity='0.18' />

      {/* Inner Dynamic Route / Logistics Vector */}
      <path d='M10.5 13L16 9.5L21.5 13L16 16.5L10.5 13Z' fill='url(#tms-brand-grad-accent)' />

      {/* Central Transit Spine & Pulses */}
      <path
        d='M16 16.5V24'
        stroke='#FFFFFF'
        strokeWidth='2'
        strokeLinecap='round'
        strokeDasharray='1 1'
      />

      {/* Waypoint Glowing Nodes */}
      <circle cx='16' cy='9.5' r='1.75' fill='#FFFFFF' />
      <circle cx='21.5' cy='13' r='1.5' fill='#38BDF8' />
      <circle cx='10.5' cy='13' r='1.5' fill='#38BDF8' />
      <circle cx='16' cy='24' r='2' fill='#67E8F9' />
      <circle cx='16' cy='16.5' r='1.25' fill='#FFFFFF' />
    </svg>
  );
}

export function BrandLogo({
  className,
  showBadge = true,
  subtitle = 'Transport Management',
  iconSize = 32
}: {
  className?: string;
  showBadge?: boolean;
  subtitle?: string;
  iconSize?: number;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className='relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-indigo-600/20 p-2 ring-1 ring-white/10 shadow-lg shadow-blue-500/10 backdrop-blur-md'>
        <BrandLogoIcon size={iconSize} glow />
      </div>
      <div className='flex flex-col text-left'>
        <div className='flex items-center gap-2'>
          <span className='font-bold tracking-tight text-foreground text-lg leading-none'>
            Logistics TMS
          </span>
          {showBadge && (
            <span className='rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500 ring-1 ring-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/30'>
              v2.4 Core
            </span>
          )}
        </div>
        {subtitle && (
          <span className='text-xs text-muted-foreground font-medium mt-1'>{subtitle}</span>
        )}
      </div>
    </div>
  );
}
