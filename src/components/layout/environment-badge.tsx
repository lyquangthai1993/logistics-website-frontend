import React from 'react';
import { cn } from '@/lib/utils';

interface EnvironmentBadgeProps {
  label?: string;
}

export function EnvironmentBadge({ label }: EnvironmentBadgeProps) {
  const rawLabel = (
    label ??
    process.env.NEXT_PUBLIC_LABEL_APP ??
    (process.env.NODE_ENV === 'development' ? 'DEV' : '')
  ).trim();

  if (!rawLabel) {
    return null;
  }

  const upperLabel = rawLabel.toUpperCase();
  const isDev = upperLabel === 'DEV' || upperLabel === 'DEVELOPMENT';
  const isPro =
    upperLabel === 'PRO' || upperLabel === 'PROD' || upperLabel === 'PRODUCTION';

  const badgeToneClass = isDev
    ? 'border-amber-500/35 bg-amber-50/85 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/80 dark:text-amber-300'
    : isPro
      ? 'border-emerald-500/35 bg-emerald-50/85 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/80 dark:text-emerald-300'
      : 'border-slate-400/35 bg-slate-100/85 text-slate-700 dark:border-slate-600/40 dark:bg-slate-900/80 dark:text-slate-300';

  const dotToneClass = isDev
    ? 'bg-amber-500 dark:bg-amber-400'
    : isPro
      ? 'bg-emerald-500 dark:bg-emerald-400'
      : 'bg-slate-500 dark:bg-slate-400';

  return (
    <div
      data-testid='app-environment-badge'
      data-env-label={upperLabel}
      aria-label={`Môi trường hệ thống: ${upperLabel}`}
      className={cn(
        'pointer-events-none fixed right-2 bottom-2 z-50 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] leading-tight font-semibold tracking-wider uppercase opacity-85 shadow-xs backdrop-blur-xs select-none print:hidden',
        badgeToneClass
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', dotToneClass)} />
      <span>{upperLabel}</span>
    </div>
  );
}
