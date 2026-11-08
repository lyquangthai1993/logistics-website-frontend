'use client';

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TripDateTooltipProps {
  dateText: string;
  mode?: 'INBOUND' | 'OUTBOUND';
  tripCode?: string | null;
  status?: string | null;
  invoiceCode?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  confirmedAt?: string | null;
  deletedAt?: string | null;
  creatorName?: string | null;
  creatorEmail?: string | null;
  operatorName?: string | null;
  operatorEmail?: string | null;
  className?: string;
}

function formatDateTimeVN(value?: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [y, m, d] = value.trim().split('-');
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(parsed);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('hour')}:${get('minute')} · ${get('day')}/${get('month')}/${get('year')}`;
}

export function TripDateTooltip({
  dateText,
  mode = 'OUTBOUND',
  tripCode,
  status,
  invoiceCode,
  createdAt,
  updatedAt,
  confirmedAt,
  deletedAt,
  creatorName,
  creatorEmail,
  operatorName,
  operatorEmail,
  className
}: TripDateTooltipProps) {
  const [open, setOpen] = useState(false);

  const statusUpper = (status || 'COMPLETED').toUpperCase();
  const isCompleted = statusUpper === 'COMPLETED';
  const isDeleted = statusUpper === 'DELETED';
  const isInbound = mode === 'INBOUND';

  const cleanCreator = creatorName?.trim() || null;
  const cleanOperator = operatorName?.trim() || null;
  const effectiveCreator = cleanCreator || cleanOperator;
  const effectiveOperator = cleanOperator || cleanCreator;

  const formattedCreated = formatDateTimeVN(createdAt);
  const formattedUpdated = formatDateTimeVN(updatedAt);
  const formattedConfirmed = formatDateTimeVN(confirmedAt || (isCompleted ? updatedAt : null));
  const formattedDeleted = formatDateTimeVN(deletedAt || (isDeleted ? updatedAt : null));

  const showUpdatedDraftRow =
    formattedUpdated &&
    formattedUpdated !== formattedCreated &&
    formattedUpdated !== formattedConfirmed &&
    formattedUpdated !== formattedDeleted;

  const headerTitle = isDeleted
    ? isInbound
      ? 'Chi tiết chuyến nhập đã xóa'
      : 'Chi tiết chuyến xuất đã xóa'
    : isCompleted
      ? isInbound
        ? 'Chi tiết xác nhận nhập kho'
        : 'Chi tiết xác nhận xuất kho'
      : isInbound
        ? 'Chi tiết chuyến nhập chờ xử lý'
        : 'Chi tiết chuyến xuất nháp';

  const confirmActionLabel = isInbound ? 'Xác nhận nhập kho:' : 'Xác nhận xuất kho:';
  const operatorRoleLabel = isDeleted
    ? 'Người xóa / thao tác:'
    : isCompleted
      ? isInbound
        ? 'Người xác nhận nhập:'
        : 'Người xác nhận xuất:'
      : 'Người thao tác gần nhất:';

  const titleParts: string[] = [headerTitle];
  if (tripCode && tripCode !== '—') titleParts.push(`Chuyến: ${tripCode}`);
  if (isCompleted && (formattedConfirmed || dateText)) {
    titleParts.push(`${confirmActionLabel} ${formattedConfirmed || dateText}`);
  } else if (isDeleted && formattedDeleted) {
    titleParts.push(`Thời gian xóa: ${formattedDeleted}`);
  } else if (formattedUpdated || formattedCreated) {
    titleParts.push(`Cập nhật: ${formattedUpdated || formattedCreated}`);
  }
  if (effectiveCreator) titleParts.push(`Người khởi tạo: ${effectiveCreator}`);
  if (effectiveOperator) titleParts.push(`${operatorRoleLabel} ${effectiveOperator}`);
  const titleText = titleParts.join(' • ');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        openOnHover={false}
        render={
          <button
            type='button'
            data-testid='trip-date-tooltip-trigger'
            title={titleText}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className={`cursor-pointer text-left inline-flex items-center underline decoration-dotted decoration-slate-300 dark:decoration-slate-600 underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-400 active:text-indigo-700 transition-colors focus:outline-none touch-manipulation ${className || ''}`}
          />
        }
      >
        {dateText}
      </PopoverTrigger>
      <PopoverContent
        side='top'
        align='start'
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
        data-testid='trip-date-tooltip-content'
        className='p-2 w-auto min-w-[235px] max-w-[calc(100vw-24px)] bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 shadow-xl text-[10px] leading-tight select-none z-50 rounded-md'
      >
        <div className='flex flex-col gap-1'>
          {/* Header */}
          <div className='flex items-center justify-between gap-2 border-b border-slate-700/80 pb-1'>
            <span className='font-bold text-slate-200'>{headerTitle}</span>
            {tripCode && tripCode !== '—' && (
              <span className='font-mono font-bold text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700'>
                {tripCode}
              </span>
            )}
          </div>

          {/* Timestamps */}
          <div className='flex flex-col gap-1 pt-0.5'>
            {formattedCreated && (
              <div className='flex items-center justify-between gap-2'>
                <span className='text-slate-400'>Khởi tạo chuyến:</span>
                <span className='font-mono text-slate-200'>{formattedCreated}</span>
              </div>
            )}

            {showUpdatedDraftRow && (
              <div className='flex items-center justify-between gap-2'>
                <span className='text-slate-400'>Cập nhật nháp:</span>
                <span className='font-mono text-slate-200'>{formattedUpdated}</span>
              </div>
            )}

            {isCompleted ? (
              <div className='flex items-center justify-between gap-2'>
                <span className='text-slate-300 font-medium'>{confirmActionLabel}</span>
                <span className='font-mono font-bold text-emerald-400'>
                  {formattedConfirmed || dateText}
                </span>
              </div>
            ) : isDeleted ? (
              <div className='flex items-center justify-between gap-2'>
                <span className='text-slate-300 font-medium'>Thời gian xóa:</span>
                <span className='font-mono font-bold text-rose-400'>
                  {formattedDeleted || dateText}
                </span>
              </div>
            ) : (
              <div className='flex items-center justify-between gap-2'>
                <span className='text-slate-400'>{confirmActionLabel}</span>
                <span className='font-semibold text-amber-400'>
                  Chưa xác nhận (Chờ xử lý)
                </span>
              </div>
            )}

            {invoiceCode && (
              <div className='flex items-center justify-between gap-2'>
                <span className='text-slate-400'>Mã phiếu:</span>
                <span className='font-mono font-semibold text-sky-300'>{invoiceCode}</span>
              </div>
            )}
          </div>

          {/* Actors */}
          <div className='flex flex-col gap-1 border-t border-slate-700/80 pt-1 mt-0.5'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-slate-400'>Người khởi tạo:</span>
              <span className='font-semibold text-slate-100'>
                {effectiveCreator || 'Chưa ghi nhận'}
                {creatorEmail && effectiveCreator !== creatorEmail ? '' : ''}
              </span>
            </div>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-slate-400'>{operatorRoleLabel}</span>
              <span
                className={`font-semibold ${
                  isDeleted
                    ? 'text-rose-400'
                    : isCompleted
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                }`}
              >
                {effectiveOperator || 'Chưa ghi nhận'}
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
