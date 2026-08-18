'use client';

import { ColumnDef, Column } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import type { Driver } from '../../api/types';
import { CellAction } from './cell-action';
import { DRIVER_STATUS_OPTIONS, DRIVER_LICENSE_CLASS_OPTIONS } from './options';

export const columns: ColumnDef<Driver>[] = [
  {
    id: 'fullName',
    accessorKey: 'fullName',
    header: ({ column }: { column: Column<Driver, unknown> }) => (
      <DataTableColumnHeader column={column} title='Họ Và Tên' />
    ),
    cell: ({ row }) => (
      <span className='font-semibold text-foreground'>
        {row.original.fullName}
      </span>
    ),
    meta: {
      columnTitle: 'Họ Và Tên',
      label: 'Tên tài xế',
      placeholder: 'Tìm họ tên, SĐT, số GPLX...',
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    id: 'phone',
    accessorKey: 'phone',
    header: ({ column }: { column: Column<Driver, unknown> }) => (
      <DataTableColumnHeader column={column} title='Số Điện Thoại' />
    ),
    meta: {
      columnTitle: 'Số Điện Thoại'
    },
    cell: ({ row }) => (
      <span className='font-mono text-muted-foreground'>{row.original.phone}</span>
    )
  },
  {
    id: 'licenseNumber',
    accessorKey: 'licenseNumber',
    header: ({ column }: { column: Column<Driver, unknown> }) => (
      <DataTableColumnHeader column={column} title='Số GPLX & Hạng' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <span className='font-mono text-xs bg-muted px-2 py-0.5 rounded border border-border'>
          {row.original.licenseNumber || 'Chưa cập nhật'}
        </span>
        <Badge
          variant='outline'
          className='bg-primary/5 text-primary border-primary/20 font-medium'
        >
          Hạng {row.original.licenseClass}
        </Badge>
      </div>
    ),
    meta: {
      columnTitle: 'Số GPLX & Hạng',
      label: 'Hạng GPLX',
      variant: 'select' as const,
      options: DRIVER_LICENSE_CLASS_OPTIONS
    },
    enableColumnFilter: true
  },
  {
    id: 'experienceYears',
    accessorKey: 'experienceYears',
    header: ({ column }: { column: Column<Driver, unknown> }) => (
      <DataTableColumnHeader column={column} title='Kinh Nghiệm' />
    ),
    meta: {
      columnTitle: 'Kinh Nghiệm'
    },
    cell: ({ row }) => (
      <span className='font-medium text-muted-foreground'>
        {row.original.experienceYears} Năm
      </span>
    )
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }: { column: Column<Driver, unknown> }) => (
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
        case 'ON_TRIP':
          return (
            <Badge className='bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-blue-500/20 cursor-pointer'>
              Đang Đi Chuyến
            </Badge>
          );
        case 'OFF_DUTY':
          return (
            <Badge className='bg-gray-500/15 text-gray-600 hover:bg-gray-500/25 border-gray-500/20 cursor-pointer'>
              Nghỉ Phép
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
      options: DRIVER_STATUS_OPTIONS
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
