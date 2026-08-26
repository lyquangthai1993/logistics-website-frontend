'use client';

import { ColumnDef, Column } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import { IconMapPin } from '@tabler/icons-react';
import type { Vehicle } from '../../api/types';
import { CellAction } from './cell-action';
import { VEHICLE_STATUS_OPTIONS, VEHICLE_TYPE_OPTIONS } from './options';

export const columns: ColumnDef<Vehicle>[] = [
  {
    id: 'licensePlate',
    accessorKey: 'licensePlate',
    header: ({ column }: { column: Column<Vehicle, unknown> }) => (
      <DataTableColumnHeader column={column} title='Biển Số Xe' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <span className='bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20 font-mono text-xs font-semibold'>
          {row.original.licensePlate}
        </span>
        {row.original.isExternal && (
          <span className='bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-300 whitespace-nowrap'>
            🚛 Xe thuê ngoài
          </span>
        )}
      </div>
    ),
    meta: {
      columnTitle: 'Biển Số Xe',
      label: 'Biển số',
      placeholder: 'Tìm biển số, mẫu xe...',
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    id: 'model',
    accessorKey: 'model',
    header: ({ column }: { column: Column<Vehicle, unknown> }) => (
      <DataTableColumnHeader column={column} title='Mẫu Xe & Loại' />
    ),
    cell: ({ row }) => (
      <div>
        <div className='font-medium text-foreground'>{row.original.model || 'Chưa cập nhật'}</div>
        <div className='text-xs text-muted-foreground font-mono'>
          {row.original.type}
          {row.original.isExternal && row.original.externalProvider && (
            <span className='ml-1.5 text-amber-700 dark:text-amber-400 font-medium'>
              ({row.original.externalProvider})
            </span>
          )}
        </div>
      </div>
    ),
    meta: {
      columnTitle: 'Mẫu Xe & Loại',
      label: 'Loại xe',
      variant: 'select' as const,
      options: VEHICLE_TYPE_OPTIONS
    },
    enableColumnFilter: true
  },
  {
    id: 'maxWeight',
    accessorKey: 'maxWeight',
    header: ({ column }: { column: Column<Vehicle, unknown> }) => (
      <DataTableColumnHeader column={column} title='Tải Trọng Tối Đa' />
    ),
    meta: {
      columnTitle: 'Tải Trọng Tối Đa'
    },
    cell: ({ row }) => (
      <span className='font-mono font-medium'>
        {row.original.maxWeight.toLocaleString('vi-VN')} kg
      </span>
    )
  },
  {
    id: 'maxVolume',
    accessorKey: 'maxVolume',
    header: ({ column }: { column: Column<Vehicle, unknown> }) => (
      <DataTableColumnHeader column={column} title='Thể Tích Tối Đa' />
    ),
    meta: {
      columnTitle: 'Thể Tích Tối Đa'
    },
    cell: ({ row }) => <span className='font-mono font-medium'>{row.original.maxVolume} m³</span>
  },
  {
    id: 'currentHub',
    accessorKey: 'currentHub',
    header: ({ column }: { column: Column<Vehicle, unknown> }) => (
      <DataTableColumnHeader column={column} title='Kho / Hub Trực Thuộc' />
    ),
    meta: {
      columnTitle: 'Kho / Hub Trực Thuộc'
    },
    cell: ({ row }) => (
      <div className='flex items-center gap-1 font-medium text-foreground'>
        <IconMapPin className='h-3.5 w-3.5 text-primary/70 shrink-0' />
        <span>
          {row.original.hub
            ? `${row.original.hub.name} (${row.original.hub.city})`
            : row.original.currentHub || 'Kho Trung Chuyển'}
        </span>
      </div>
    )
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }: { column: Column<Vehicle, unknown> }) => (
      <DataTableColumnHeader column={column} title='Trạng Thái' />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      switch (status) {
        case 'AVAILABLE':
          return (
            <Badge className='bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20 cursor-pointer'>
              Sẵn Sàng
            </Badge>
          );
        case 'IN_USE':
          return (
            <Badge className='bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-blue-500/20 cursor-pointer'>
              Đang Chạy Chuyến
            </Badge>
          );
        case 'MAINTENANCE':
          return (
            <Badge className='bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-500/20 cursor-pointer'>
              Bảo Trì
            </Badge>
          );
        default:
          return <Badge variant='outline'>{status}</Badge>;
      }
    },
    meta: {
      columnTitle: 'Trạng Thái',
      label: 'Trạng thái',
      variant: 'select' as const,
      options: VEHICLE_STATUS_OPTIONS
    },
    enableColumnFilter: true
  },
  {
    id: 'actions',
    enableHiding: false,
    header: '',
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
