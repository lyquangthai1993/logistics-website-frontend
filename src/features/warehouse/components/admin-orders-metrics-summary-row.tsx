import React from 'react';
import { formatNumber } from '@/lib/utils';

export interface AdminOrdersMetricsSummaryProps {
  quantity: number;
  weightKg: number;
  volumeCbm: number;
  isLoading?: boolean;
}

export function AdminOrdersMetricsSummaryRow({
  quantity,
  weightKg,
  volumeCbm,
  isLoading
}: AdminOrdersMetricsSummaryProps) {
  return (
    <tr
      className='bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-200/60 dark:border-blue-900/50'
      data-testid='admin-orders-metrics-boxes'
    >
      <td className='hidden md:table-cell py-1 px-1 text-center md:sticky md:left-0 z-20 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200/60 dark:border-blue-900/50'></td>
      <td className='py-1 px-1.5 text-center md:sticky md:left-[36px] z-20 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200/60 dark:border-blue-900/50'></td>
      <td className='py-1 px-1.5 md:sticky md:left-[132px] z-20 bg-blue-50/80 dark:bg-blue-950/40 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] md:border-r border-b border-blue-200/60 dark:border-blue-900/50'>
        <span className='text-[10px] font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300'>
          TỔNG CỘNG
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
