import React from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { formatNumber } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface AdminOrdersMetricsSummaryProps {
  quantity: number;
  weightKg: number;
  volumeCbm: number;
  isLoading?: boolean;
  updatedAt?: Date | null;
}

export function AdminOrdersMetricsSummaryRow({
  quantity,
  weightKg,
  volumeCbm,
  isLoading,
  updatedAt
}: AdminOrdersMetricsSummaryProps) {
  const updatedAtLabel = updatedAt
    ? updatedAt.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour12: false
      })
    : null;

  return (
    <tr
      className='bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-200/60 dark:border-blue-900/50'
      data-testid='admin-orders-metrics-boxes'
    >
      <td className='hidden md:table-cell py-1 px-1 text-center md:sticky md:left-0 z-20 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200/60 dark:border-blue-900/50'></td>
      <td className='py-1 px-1.5 text-center md:sticky md:left-[36px] z-20 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200/60 dark:border-blue-900/50'></td>
      <td className='py-1 px-1.5 md:sticky md:left-[132px] z-20 bg-blue-50/80 dark:bg-blue-950/40 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] md:border-r border-b border-blue-200/60 dark:border-blue-900/50'>
        <span className='inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300'>
          TỔNG CỘNG
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type='button'
                  className='inline-flex size-4 items-center justify-center rounded-full text-blue-600 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:text-blue-300 dark:hover:bg-blue-900/50'
                  aria-label='Thông tin thời điểm cập nhật tổng cộng'
                />
              }
            >
              <IconInfoCircle className='size-3.5' aria-hidden='true' />
            </TooltipTrigger>
            <TooltipContent className='max-w-72 text-[11px] leading-4'>
              {updatedAtLabel
                ? `Số liệu snapshot theo từng kho được cron quét lúc ${updatedAtLabel}. Do dữ liệu phát sinh liên tục, tổng cộng có thể chênh lệch nhẹ so với thời điểm hiện tại.`
                : 'Số liệu snapshot theo từng kho được tổng hợp định kỳ và có thể chênh lệch nhẹ so với thời điểm hiện tại.'}
            </TooltipContent>
          </Tooltip>
        </span>
      </td>
      <td className='py-1 px-1.5 border-b border-blue-200/60 dark:border-blue-900/50'></td>

      {/* SỐ LƯỢNG */}
      <td
        className='py-1 px-1.5 text-right whitespace-nowrap border-b border-blue-200/60 dark:border-blue-900/50'
        data-testid='admin-metric-quantity'
      >
        <span className='text-[10.5px] font-medium font-mono text-blue-900 dark:text-blue-100 leading-tight'>
          {isLoading ? (
            <span className='animate-pulse text-blue-400'>...</span>
          ) : (
            formatNumber(quantity, 0)
          )}
        </span>
      </td>

      {/* SỐ KG */}
      <td
        className='py-1 px-1.5 text-right whitespace-nowrap border-b border-blue-200/60 dark:border-blue-900/50'
        data-testid='admin-metric-weight'
      >
        <span className='text-[10.5px] font-medium font-mono text-amber-900 dark:text-amber-100 leading-tight'>
          {isLoading ? (
            <span className='animate-pulse text-amber-400'>...</span>
          ) : (
            formatNumber(weightKg, 2)
          )}
        </span>
      </td>

      {/* CBM */}
      <td
        className='py-1 px-1.5 text-right whitespace-nowrap border-b border-blue-200/60 dark:border-blue-900/50'
        data-testid='admin-metric-volume'
      >
        <span className='text-[10.5px] font-medium font-mono text-emerald-900 dark:text-emerald-100 leading-tight'>
          {isLoading ? (
            <span className='animate-pulse text-emerald-400'>...</span>
          ) : (
            formatNumber(volumeCbm, 2)
          )}
        </span>
      </td>

      <td colSpan={4} className='py-1 px-1.5 border-b border-blue-200/60 dark:border-blue-900/50'></td>
    </tr>
  );
}
