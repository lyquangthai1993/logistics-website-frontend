'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import { CellAction } from './cell-action';
import { HUB_STATUS_OPTIONS } from './options';
import type { Hub } from '../../api/types';

export const columns: ColumnDef<Hub>[] = [
  {
    id: 'code',
    accessorKey: 'code',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Mã Hub' />,
    cell: ({ cell }) => (
      <span className='bg-primary/10 text-primary border-primary/20 rounded-md border px-2.5 py-1 font-mono text-xs font-semibold'>
        {cell.getValue<string>()}
      </span>
    ),
    enableSorting: true
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Tên Chi Nhánh & Tỉnh/Thành' />,
    cell: ({ row }) => (
      <div>
        <div className='text-foreground flex items-center gap-1.5 font-semibold'>
          <Icons.warehouse className='text-primary/70 h-4 w-4 shrink-0' />
          {row.original.name}
        </div>
        <div className='text-muted-foreground mt-0.5 flex items-center gap-1 text-xs'>
          <Icons.mapPin className='h-3 w-3 shrink-0' />
          {row.original.city}
        </div>
      </div>
    ),
    meta: {
      id: 'hub-search-input',
      label: 'Tìm kiếm',
      placeholder: 'Tìm mã kho, tên kho, thành phố, quản lý...',
      variant: 'text',
      icon: Icons.search
    },
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    accessorKey: 'address',
    header: 'Địa Chỉ Chi Tiết',
    cell: ({ cell }) => {
      const address = cell.getValue<string | null | undefined>();
      return (
        <div className='text-muted-foreground max-w-xs truncate' title={address || undefined}>
          {address || 'Chưa cập nhật'}
        </div>
      );
    }
  },
  {
    id: 'manager',
    accessorKey: 'managerName',
    header: 'Người Quản Lý & SĐT',
    cell: ({ row }) => (
      <div>
        <div className='text-foreground flex items-center gap-1 font-medium'>
          <Icons.user className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
          {row.original.managerName || 'Chưa phân công'}
        </div>
        {row.original.contactPhone && (
          <div className='text-muted-foreground mt-0.5 flex items-center gap-1 font-mono text-xs'>
            <Icons.phone className='h-3 w-3 shrink-0' />
            {row.original.contactPhone}
          </div>
        )}
      </div>
    )
  },
  {
    id: 'vehicles',
    accessorKey: 'vehicles',
    header: 'Xe Trực Thuộc',
    cell: ({ row }) => (
      <Badge variant='outline' className='bg-blue-500/10 text-blue-600 border-blue-500/20 font-mono'>
        <Icons.truck className='mr-1 h-3 w-3' />
        {row.original.vehicles?.length || 0} xe
      </Badge>
    )
  },
  {
    id: 'status',
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Trạng Thái' />,
    cell: ({ cell }) => {
      const isActive = cell.getValue<boolean>();
      return isActive ? (
        <Badge className='bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20'>
          Hoạt Động
        </Badge>
      ) : (
        <Badge className='bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-500/20'>
          Tạm Ngưng
        </Badge>
      );
    },
    meta: {
      label: 'Trạng thái',
      variant: 'select',
      options: HUB_STATUS_OPTIONS
    },
    enableColumnFilter: true
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
