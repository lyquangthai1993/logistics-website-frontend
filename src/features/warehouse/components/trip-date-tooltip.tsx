'use client';

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TripDateTooltipProps {
  dateText: string;
  creatorName?: string | null;
  operatorName?: string | null;
  className?: string;
}

export function TripDateTooltip({
  dateText,
  creatorName,
  operatorName,
  className
}: TripDateTooltipProps) {
  const cleanCreator = creatorName?.trim() || null;
  const cleanOperator = operatorName?.trim() || null;

  let titleText = '';
  if (cleanCreator && cleanOperator && cleanCreator !== cleanOperator) {
    titleText = `Người tạo: ${cleanCreator} • Người thao tác: ${cleanOperator}`;
  } else if (cleanOperator || cleanCreator) {
    titleText = `Người thao tác (người tạo): ${cleanOperator || cleanCreator}`;
  } else {
    titleText = 'Chưa có thông tin người thao tác';
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type='button'
            data-testid='trip-date-tooltip-trigger'
            title={titleText}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className={`cursor-pointer text-left inline-flex items-center underline decoration-dotted decoration-slate-300 dark:decoration-slate-600 underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none ${className || ''}`}
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
        className='p-2 w-auto max-w-xs bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 shadow-xl text-[10px] leading-tight select-none z-50 rounded-md'
      >
        {cleanCreator && cleanOperator && cleanCreator !== cleanOperator ? (
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-1.5'>
              <span className='text-slate-400'>Người tạo:</span>
              <span className='font-semibold text-slate-100'>{cleanCreator}</span>
            </div>
            <div className='flex items-center gap-1.5 border-t border-slate-700/60 pt-1'>
              <span className='text-slate-400'>Người thao tác:</span>
              <span className='font-semibold text-emerald-400'>{cleanOperator}</span>
            </div>
          </div>
        ) : cleanOperator || cleanCreator ? (
          <div className='flex items-center gap-1.5'>
            <span className='text-slate-400'>Người thao tác:</span>
            <span className='font-semibold text-emerald-400'>{cleanOperator || cleanCreator}</span>
          </div>
        ) : (
          <div className='text-slate-400 italic'>Chưa có thông tin người thao tác</div>
        )}
      </PopoverContent>
    </Popover>
  );
}
