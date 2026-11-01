'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IconCalendar, IconChevronDown } from '@tabler/icons-react';

export function computeSevenDaysAgoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function computeTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function computeFirstOfMonthDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function getInitialWarehouseFromDate(): string {
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search);
    const qFrom = sp.get('fromDate');
    if (qFrom && /^\d{4}-\d{2}-\d{2}$/.test(qFrom)) return qFrom;
  }
  return computeSevenDaysAgoDate();
}

export function getInitialWarehouseToDate(): string {
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search);
    const qTo = sp.get('toDate');
    if (qTo && /^\d{4}-\d{2}-\d{2}$/.test(qTo)) return qTo;
  }
  return computeTodayDate();
}

function formatFullDateVi(raw?: string): string {
  if (!raw) return '—';
  const clean = String(raw).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return clean || '—';
}

function formatShortDateVi(raw?: string): string {
  if (!raw) return '—';
  const clean = String(raw).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return clean || '—';
}

export interface WarehouseDateRangeDropdownProps {
  fromDate: string;
  toDate: string;
  appliedFromDate: string;
  appliedToDate: string;
  onFromDateChange: (val: string) => void;
  onToDateChange: (val: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export function WarehouseDateRangeDropdown({
  fromDate,
  toDate,
  appliedFromDate,
  appliedToDate,
  onFromDateChange,
  onToDateChange,
  onApply,
  onReset
}: WarehouseDateRangeDropdownProps) {
  const [open, setOpen] = useState(false);

  const defaultFrom = computeSevenDaysAgoDate();
  const defaultTo = computeTodayDate();
  const isDefaultSevenDaysApplied = appliedFromDate === defaultFrom && appliedToDate === defaultTo;
  const isDraftModified = fromDate !== defaultFrom || toDate !== defaultTo;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      onFromDateChange(appliedFromDate);
      onToDateChange(appliedToDate);
    }
  };

  const handleApplyClick = () => {
    onApply();
    setOpen(false);
  };

  const handleResetClick = () => {
    onReset();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type='button'
            variant='outline'
            size='sm'
            data-testid='date-filter-dropdown-trigger'
            aria-label='Bộ lọc ngày'
            className='h-8 px-2.5 text-xs font-semibold border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto shrink-0 cursor-pointer'
          />
        }
      >
        <div className='flex items-center gap-1.5 truncate'>
          <IconCalendar className='h-3.5 w-3.5 text-[#0F3D62] dark:text-blue-400 shrink-0' />
          {isDefaultSevenDaysApplied ? (
            <span className='truncate'>
              7 ngày gần nhất{' '}
              <span className='text-[10px] font-normal text-slate-500 dark:text-slate-400'>
                ({formatShortDateVi(appliedFromDate)} – {formatShortDateVi(appliedToDate)})
              </span>
            </span>
          ) : (
            <span className='text-[#0F3D62] dark:text-blue-300 font-bold truncate'>
              {formatFullDateVi(appliedFromDate)} – {formatFullDateVi(appliedToDate)}
            </span>
          )}
        </div>
        <IconChevronDown className='h-3.5 w-3.5 text-slate-400 shrink-0' />
      </PopoverTrigger>
      <PopoverContent
        align='start'
        sideOffset={4}
        className='w-80 p-2 space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg z-50'
      >
        <div className='flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5'>
          <span className='text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1'>
            <IconCalendar className='h-3.5 w-3.5 text-[#0F3D62] dark:text-blue-400' />
            Lọc theo khoảng ngày
          </span>
          {(!isDefaultSevenDaysApplied || isDraftModified) && (
            <button
              type='button'
              onClick={handleResetClick}
              className='text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer shrink-0'
              title='Đặt lại về 7 ngày gần nhất'
            >
              Đặt lại
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div className='flex flex-wrap items-center gap-1'>
          {[
            {
              label: '7 ngày gần nhất',
              from: defaultFrom,
              to: defaultTo
            },
            {
              label: 'Hôm nay',
              from: defaultTo,
              to: defaultTo
            },
            {
              label: 'Tháng này',
              from: computeFirstOfMonthDate(),
              to: defaultTo
            }
          ].map((preset) => {
            const isSelected = fromDate === preset.from && toDate === preset.to;
            return (
              <button
                key={preset.label}
                type='button'
                onClick={() => {
                  onFromDateChange(preset.from);
                  onToDateChange(preset.to);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#0F3D62] text-white border-[#0F3D62] dark:bg-blue-600 dark:border-blue-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Pickers */}
        <div className='grid grid-cols-2 gap-1.5'>
          <div>
            <label className='block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1'>
              Từ ngày
            </label>
            <input
              type='date'
              aria-label='Từ ngày'
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => onFromDateChange(e.target.value)}
              className='w-full px-1.5 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0F3D62] cursor-pointer h-7'
            />
          </div>
          <div>
            <label className='block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1'>
              Đến ngày
            </label>
            <input
              type='date'
              aria-label='Đến ngày'
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => onToDateChange(e.target.value)}
              className='w-full px-1.5 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0F3D62] cursor-pointer h-7'
            />
          </div>
        </div>

        <div className='flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setOpen(false)}
            className='h-7 px-2 text-[11px] font-semibold cursor-pointer'
          >
            Đóng
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={handleApplyClick}
            className='h-7 px-2.5 text-xs font-semibold bg-[#0F3D62] hover:bg-[#0c2f4d] text-white shadow-xs cursor-pointer'
            title='Áp dụng bộ lọc theo khoảng thời gian'
          >
            Áp dụng
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
