'use client';

import { Card, CardContent } from '@/components/ui/card';
import { IconCalendar, IconRefresh } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { DatePreset } from '../date-range';
import { formatDateVi } from '../date-range';

interface TripsDatePresetBarProps {
  preset: DatePreset;
  dateRange: { from: string; to: string };
  onPresetChange: (preset: DatePreset) => void;
  onCustomDateChange: (field: 'from' | 'to', value: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
  fromDateVi?: string;
  toDateVi?: string;
}

const PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: 'today', label: 'Hôm nay' },
  { key: '7days', label: '7 ngày qua' },
  { key: 'thisMonth', label: 'Tháng này' },
  { key: 'lastMonth', label: 'Tháng trước' }
];

export function TripsDatePresetBar({
  preset,
  dateRange,
  onPresetChange,
  onCustomDateChange,
  onRefresh,
  loading = false,
  fromDateVi,
  toDateVi
}: TripsDatePresetBarProps) {
  const displayFrom = fromDateVi ? formatDateVi(fromDateVi) : formatDateVi(dateRange.from);
  const displayTo = toDateVi ? formatDateVi(toDateVi) : formatDateVi(dateRange.to);

  return (
    <Card className='shadow-xs border-slate-200/80 dark:border-slate-800'>
      <CardContent className='pt-4 pb-3'>
        <div className='flex flex-wrap items-center gap-3'>
          {/* Label */}
          <div className='flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0'>
            <IconCalendar className='h-4 w-4' />
            Thống kê theo:
          </div>

          {/* Preset buttons */}
          <div className='flex items-center gap-1.5 flex-wrap'>
            {PRESETS.map(({ key, label }) => (
              <button
                key={key}
                type='button'
                onClick={() => onPresetChange(key)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md border transition-all duration-150 cursor-pointer',
                  preset === key
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-50 dark:text-slate-900 dark:border-slate-50'
                    : 'bg-transparent text-slate-600 border-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          <div className='flex items-center gap-2 ml-auto'>
            <span className='text-xs text-slate-400 hidden sm:inline'>Tùy chọn:</span>
            <input
              type='date'
              value={dateRange.from}
              max={dateRange.to}
              onChange={(e) => onCustomDateChange('from', e.target.value)}
              className='px-2 py-1 text-xs bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer'
            />
            <span className='text-xs text-slate-400'>&rarr;</span>
            <input
              type='date'
              value={dateRange.to}
              min={dateRange.from}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => onCustomDateChange('to', e.target.value)}
              className='px-2 py-1 text-xs bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer'
            />
            {onRefresh && (
              <button
                type='button'
                onClick={onRefresh}
                disabled={loading}
                title='Làm mới dữ liệu'
                className='p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <IconRefresh
                  className={cn('h-3.5 w-3.5 text-slate-500', loading && 'animate-spin')}
                />
              </button>
            )}
          </div>
        </div>

        {/* Period label */}
        <p className='text-[11px] text-slate-400 dark:text-slate-500 mt-2 ml-0.5'>
          Kỳ thống kê: {displayFrom} – {displayTo}
        </p>
      </CardContent>
    </Card>
  );
}
