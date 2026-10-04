'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  IconFileText,
  IconArrowDownToArc,
  IconArrowUpFromArc,
  IconTransfer,
  IconAdjustments,
  IconHistory,
  IconAlertTriangle
} from '@tabler/icons-react';
import { formatApiError } from '@/lib/api-error';
import { useOrderLedgerQuery } from '../api/queries';
import type { Order, OrderLedgerEntry } from '../api/types';

type LedgerTone = 'contract' | 'inbound' | 'transfer' | 'outbound' | 'adjustment';

const TONE_STYLES: Record<LedgerTone, { dot: string; badge: string; label: string }> = {
  contract: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    label: 'Khởi tạo hợp đồng'
  },
  transfer: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
    label: 'Phiếu xuất luân chuyển'
  },
  inbound: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
    label: 'Phiếu nhập kho'
  },
  outbound: {
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300',
    label: 'Phiếu giao hàng'
  },
  adjustment: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
    label: 'Điều chỉnh hợp đồng gốc'
  }
};

function toneOf(type: string): LedgerTone {
  switch (type) {
    case 'INBOUND':
      return 'inbound';
    case 'TRANSFER':
      return 'transfer';
    case 'OUTBOUND':
      return 'outbound';
    case 'ADJUSTMENT':
      return 'adjustment';
    default:
      return 'inbound';
  }
}

function ToneIcon({ tone }: { tone: LedgerTone }) {
  const cls = 'h-3 w-3';
  switch (tone) {
    case 'contract':
      return <IconFileText className={cls} />;
    case 'inbound':
      return <IconArrowDownToArc className={cls} />;
    case 'transfer':
      return <IconTransfer className={cls} />;
    case 'outbound':
      return <IconArrowUpFromArc className={cls} />;
    case 'adjustment':
      return <IconAdjustments className={cls} />;
  }
}

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function describeEntry(entry: OrderLedgerEntry): string {
  const hub = entry.hubName ?? 'Kho';
  const trip = entry.tripCode ? ` chuyến ${entry.tripCode}` : '';
  const vehicle = [
    entry.driverName ? `Tài xế ${entry.driverName}` : null,
    entry.licensePlate ? `Xe ${entry.licensePlate}` : null
  ]
    .filter(Boolean)
    .join(', ');
  const vehicleText = vehicle ? ` (${vehicle})` : '';

  switch (entry.type) {
    case 'INBOUND':
      return `${hub} tiếp nhận${trip ? ' từ' + trip : ''}: thực dỡ ${entry.quantity} kiện${vehicleText}.`;
    case 'TRANSFER':
      return `${hub} xuất ${entry.quantity} kiện lên${trip || ' xe luân chuyển'}${vehicleText}.`;
    case 'OUTBOUND':
      return `${hub} xuất ${entry.quantity} kiện giao khách${entry.destination ? ` tại ${entry.destination}` : ''}${vehicleText}.`;
    case 'ADJUSTMENT':
      return entry.notes ?? 'Quản trị viên điều chỉnh hợp đồng gốc.';
    default:
      return entry.notes ?? '';
  }
}

interface OrderTimelineLedgerProps {
  order: Order;
}

/**
 * Order Timeline Ledger — chronological audit of every operational invoice
 * (PNK / PXK / PGH / DCH). The Master Contract creation is always the first entry.
 */
export function OrderTimelineLedger({ order }: OrderTimelineLedgerProps) {
  const { data, isLoading, isError, error } = useOrderLedgerQuery(order.id);
  const entries = useMemo(() => data ?? [], [data]);

  const totalDiscrepancy = useMemo(
    () => entries.reduce((sum, e) => sum + (e.type === 'INBOUND' ? e.discrepancyQuantity : 0), 0),
    [entries]
  );

  const contractTone = TONE_STYLES.contract;

  return (
    <Card className='shadow-sm border-slate-200/80 dark:border-slate-800 py-0 gap-0'>
      <CardHeader className='py-1.5 px-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between'>
        <CardTitle className='text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5'>
          <IconHistory className='h-3.5 w-3.5 text-blue-500' />
          Lịch sử phiếu vận hành
        </CardTitle>
        {totalDiscrepancy !== 0 && (
          <Badge
            variant='outline'
            className='text-[10px] h-5 px-1.5 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 gap-1'
          >
            <IconAlertTriangle className='h-3 w-3' />
            Chênh lệch {totalDiscrepancy > 0 ? `+${totalDiscrepancy}` : totalDiscrepancy} kiện
          </Badge>
        )}
      </CardHeader>
      <CardContent className='p-2'>
        <ol className='relative pl-4 space-y-2 before:absolute before:left-1 before:top-1 before:bottom-1 before:w-px before:bg-slate-200 dark:before:bg-slate-700'>
          {/* Master Contract creation — always first */}
          <li className='relative'>
            <span
              className={`absolute -left-4 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${contractTone.dot}`}
            />
            <div className='flex flex-wrap items-center gap-1'>
              <span className='text-[10px] font-mono text-slate-500'>{formatTime(order.createdAt)}</span>
              <Badge variant='outline' className={`text-[10px] h-4 px-1 gap-0.5 ${contractTone.badge}`}>
                <ToneIcon tone='contract' />
                {contractTone.label}
              </Badge>
            </div>
            <p className='text-[10px] text-slate-700 dark:text-slate-300 leading-snug'>
              Tạo đơn tại {order.originHub ?? 'kho gửi'}: {order.totalQuantity ?? 0} kiện,{' '}
              {Number(order.totalWeight ?? 0).toLocaleString('vi-VN')} kg,{' '}
              {Number(order.totalVolume ?? 0).toLocaleString('vi-VN')} m³
              {order.destinationHub ? ` — nơi nhận ${order.destinationHub}` : ''}.
            </p>
          </li>

          {isLoading && (
            <li className='text-[10px] text-slate-400 italic'>Đang tải lịch sử phiếu...</li>
          )}

          {isError && (
            <li className='text-[10px] text-rose-600'>
              {formatApiError(error, 'Không thể tải lịch sử phiếu vận hành.')}
            </li>
          )}

          {!isLoading && !isError && entries.length === 0 && (
            <li className='text-[10px] text-slate-400 italic'>
              Chưa phát sinh phiếu nhập / xuất nào cho đơn hàng này.
            </li>
          )}

          {entries.map((entry) => {
            const tone = toneOf(entry.type);
            const style = TONE_STYLES[tone];
            const hasDiscrepancy = entry.type === 'INBOUND' && entry.discrepancyQuantity !== 0;
            return (
              <li key={entry.id} className='relative'>
                <span
                  className={`absolute -left-4 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${style.dot}`}
                />
                <div className='flex flex-wrap items-center gap-1'>
                  <span className='text-[10px] font-mono text-slate-500'>{formatTime(entry.createdAt)}</span>
                  <Badge variant='outline' className={`text-[10px] h-4 px-1 gap-0.5 ${style.badge}`}>
                    <ToneIcon tone={tone} />
                    {style.label}
                  </Badge>
                  {entry.invoiceCode && (
                    <span className='text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200'>
                      {entry.invoiceCode}
                    </span>
                  )}
                </div>
                <p className='text-[10px] text-slate-700 dark:text-slate-300 leading-snug'>
                  {describeEntry(entry)}
                </p>
                {hasDiscrepancy && (
                  <p className='text-[10px] text-rose-600 dark:text-rose-400 leading-snug'>
                    Dự kiến {entry.expectedQuantity ?? 0} kiện — chênh lệch{' '}
                    {entry.discrepancyQuantity > 0
                      ? `thừa ${entry.discrepancyQuantity}`
                      : `thiếu ${Math.abs(entry.discrepancyQuantity)}`}{' '}
                    kiện{entry.discrepancyReason ? `: ${entry.discrepancyReason}` : ''}
                  </p>
                )}
                {entry.type === 'ADJUSTMENT' && entry.discrepancyReason && (
                  <p className='text-[10px] text-rose-600 dark:text-rose-400 leading-snug'>
                    Lý do: {entry.discrepancyReason}
                  </p>
                )}
                {entry.performedByName && (
                  <p className='text-[10px] text-slate-400 leading-snug'>
                    Người thực hiện: {entry.performedByName}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
