'use client';

import type { Table } from '@tanstack/react-table';
import { Icons } from '@/components/icons';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import * as React from 'react';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

const COLUMN_ID_MAP: Record<string, string> = {
  orderCode: 'Mã đơn hàng',
  route: 'Tuyến đường & Hub',
  weights: 'Khối lượng / Thể tích',
  goods: 'Loại hàng',
  status: 'Trạng thái',
  trips: 'Xe phân công',
  licensePlate: 'Biển số xe',
  vehicleType: 'Loại phương tiện',
  maxPayload: 'Tải trọng tối đa',
  maxVolume: 'Thể tích tối đa',
  hub: 'Hub quản lý',
  driver: 'Tài xế',
  fullName: 'Họ và tên',
  phone: 'Số điện thoại',
  email: 'Email',
  role: 'Vai trò',
  code: 'Mã',
  name: 'Tên',
  city: 'Tỉnh / Thành phố',
  address: 'Địa chỉ',
  contactPerson: 'Người liên hệ',
  contactPhone: 'Số điện thoại',
  isActive: 'Hoạt động',
  createdAt: 'Ngày tạo',
  updatedAt: 'Ngày cập nhật',
  price: 'Giá',
  category: 'Danh mục',
  description: 'Mô tả',
  photo_url: 'Hình ảnh'
};

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (column) => column.getCanHide() && column.id !== 'actions' && column.id !== 'select'
        ),
    [table]
  );

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label='Toggle columns'
            variant='outline'
            size='sm'
            className='ml-auto hidden h-8 lg:flex cursor-pointer'
          />
        }
      >
        <Icons.adjustments />
        View
        <Icons.chevronsUpDown className='ml-auto opacity-50' />
      </PopoverTrigger>
      <PopoverContent align='end' className='w-48 p-0'>
        <Command>
          <CommandInput placeholder='Tìm kiếm cột...' />
          <CommandList>
            <CommandEmpty>Không tìm thấy cột.</CommandEmpty>
            <CommandGroup>
              {columns.map((column) => {
                const title =
                  column.columnDef.meta?.columnTitle ??
                  (typeof column.columnDef.header === 'string'
                    ? column.columnDef.header
                    : undefined) ??
                  COLUMN_ID_MAP[column.id] ??
                  (column.columnDef.meta?.label !== 'Tìm kiếm'
                    ? column.columnDef.meta?.label
                    : undefined) ??
                  column.id;

                return (
                  <CommandItem
                    key={column.id}
                    onSelect={() => column.toggleVisibility(!column.getIsVisible())}
                    className='cursor-pointer'
                  >
                    <span className='truncate'>{title}</span>
                    <Icons.check
                      className={cn(
                        'ml-auto size-4 shrink-0',
                        column.getIsVisible() ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
