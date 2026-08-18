'use client';

import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { IconCalendar, IconRefresh } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { orderKeys } from '../api/queries';
import { DATE_PRESET_OPTIONS, type DatePreset } from './orders-tables/options';

interface OrdersDatePresetBarProps {
  preset: DatePreset;
  dateRange: { from: string; to: string };
  onPresetChange: (preset: DatePreset) => void;
  onCustomDateChange: (field: 'from' | 'to', value: string) => void;
  fromDateVi?: string;
  toDateVi?: string;
  onRefresh?: () => void;
}

function formatDateVi(iso?: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function OrdersDatePresetBar({
  preset,
  dateRange,
  onPresetChange,
  onCustomDateChange,
  fromDateVi,
  toDateVi,
  onRefresh
}: OrdersDatePresetBarProps) {
  const queryClient = useQueryClient();
  const isFetchingOrders = useIsFetching({ queryKey: orderKeys.all }) > 0;

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    }
  };

  const displayFrom = fromDateVi || dateRange.from;
  const displayTo = toDateVi || dateRange.to;

  return (
    <Card className='border-slate-200/80 shadow-sm dark:border-slate-800'>
      <CardContent className='py-3'>
        <div className='flex flex-wrap items-center gap-3'>
          {/* Label */}
          <div className='flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0'>
            <IconCalendar className='h-4 w-4' />
            <span>Thống kê theo:</span>
          </div>

          {/* Preset Buttons */}
          <div className='flex items-center gap-1.5 flex-wrap'>
            {DATE_PRESET_OPTIONS.map(({ key, label }) => (
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

          {/* Custom Date Range Inputs */}
          <div className='flex items-center gap-2 ml-auto'>
            <span className='text-xs text-slate-400 hidden sm:inline'>Tùy chọn:</span>
            <input
              type='date'
              aria-label='Từ ngày'
              value={dateRange.from}
              max={dateRange.to}
              onChange={(e) => onCustomDateChange('from', e.target.value)}
              className='px-2 py-1 text-xs bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer'
            />
            <span className='text-xs text-slate-400'>→</span>
            <input
              type='date'
              aria-label='Đến ngày'
              value={dateRange.to}
              min={dateRange.from}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => onCustomDateChange('to', e.target.value)}
              className='px-2 py-1 text-xs bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer'
            />
            <button
              type='button'
              onClick={handleRefresh}
              disabled={isFetchingOrders}
              title='Làm mới thống kê'
              className='p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <IconRefresh
                className={cn('h-3.5 w-3.5 text-slate-500', isFetchingOrders && 'animate-spin')}
              />
            </button>
          </div>
        </div>

        {/* Period Label */}
        {displayFrom && displayTo && (
          <p className='text-[11px] text-slate-400 dark:text-slate-500 mt-2 ml-0.5'>
            Kỳ thống kê: {formatDateVi(displayFrom)} – {formatDateVi(displayTo)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
