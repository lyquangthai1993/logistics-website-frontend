'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import { CellAction } from './cell-action';
import { WAREHOUSE_STATUS_OPTIONS } from './options';
import type { Trip, TripStatus } from '@/features/trips/api/types';

export function renderTripStatusBadge(status: TripStatus) {
  switch (status) {
    case 'CONFIRMED':
      return (
        <Badge
          variant='secondary'
          className='bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold'
        >
          Đã xác nhận
        </Badge>
      );
    case 'IN_TRANSIT':
      return (
        <Badge
          variant='secondary'
          className='bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 font-semibold'
        >
          Đang chạy
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge
          variant='secondary'
          className='bg-green-100 text-green-800 border-green-200 dark:bg-green-950/60 dark:text-green-300 font-semibold'
        >
          Hoàn thành
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge
          variant='secondary'
          className='bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
        >
          Chờ xác nhận
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant='outline' className='text-slate-400'>
          Đã hủy
        </Badge>
      );
    default:
      return <Badge variant='outline'>{status}</Badge>;
  }
}

export const columns: ColumnDef<Trip>[] = [
  {
    id: 'tripSequence',
    accessorKey: 'sequenceNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Chuyến Xe / Mã Đơn' />,
    meta: {
      id: 'warehouse-search-input',
      label: 'Tìm kiếm',
      placeholder: 'Tìm theo mã đơn, biển số, tài xế, nhà xe...',
      variant: 'text',
      icon: Icons.search
    },
    cell: ({ row }) => {
      const trip = row.original;
      const isExternal = trip.vehicle?.isExternal;
      const orderCode = trip.order?.orderCode || `Đơn #${trip.orderId}`;

      return (
        <div className='space-y-0.5'>
          <div className='font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5'>
            <span>Chuyến #{trip.sequenceNumber || trip.id}</span>
            {isExternal && (
              <Badge className='bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold'>
                🚛 Xe ngoài
              </Badge>
            )}
          </div>
          {trip.orderId ? (
            <Link
              href={`/dashboard/orders/${trip.orderId}`}
              className='text-xs font-mono text-blue-600 hover:underline dark:text-blue-400 block cursor-pointer'
            >
              {orderCode}
            </Link>
          ) : (
            <span className='text-xs font-mono text-slate-400 block'>{orderCode}</span>
          )}
        </div>
      );
    },
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'route',
    header: 'Tuyến Đường (Gửi → Nhận)',
    cell: ({ row }) => {
      const order = row.original.order;
      const origin = order?.originHub?.split(' ')[0] || 'Kho gửi';
      const dest = order?.destinationHub || 'Kho nhận';

      return (
        <div className='space-y-1 text-xs'>
          <div className='flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium'>
            <Icons.mapPin className='h-3.5 w-3.5 text-blue-500 shrink-0' />
            <span>{origin}</span>
            <span>→</span>
            <strong className='text-slate-900 dark:text-slate-100'>{dest}</strong>
          </div>
        </div>
      );
    }
  },
  {
    id: 'vehicle',
    accessorFn: (row) => row.vehicle?.licensePlate || '',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Phương Tiện' />,
    cell: ({ row }) => {
      const trip = row.original;
      const isExternal = trip.vehicle?.isExternal;

      return (
        <div className='text-slate-800 dark:text-slate-200 text-xs'>
          <div className='font-mono font-bold text-sm'>
            {trip.vehicle?.licensePlate || '—'}
          </div>
          <span className='text-muted-foreground block mt-0.5'>
            {isExternal ? (
              <span className='text-amber-700 dark:text-amber-300 font-medium'>
                Đối tác: {trip.vehicle?.externalProvider || 'Thuê ngoài'}
              </span>
            ) : (
              trip.vehicle?.type || 'Xe nội bộ'
            )}
          </span>
        </div>
      );
    },
    enableSorting: true
  },
  {
    id: 'driver',
    accessorFn: (row) => row.driver?.fullName || '',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Tài Xế & SĐT' />,
    cell: ({ row }) => {
      const trip = row.original;
      return (
        <div className='text-slate-800 dark:text-slate-200 text-xs'>
          <div className='font-medium text-sm flex items-center gap-1'>
            <Icons.user className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
            {trip.driver?.fullName || 'Chưa gán'}
          </div>
          {trip.driver?.phone && (
            <div className='text-muted-foreground mt-0.5 flex items-center gap-1 font-mono text-[11px]'>
              <Icons.phone className='h-3 w-3 shrink-0' />
              {trip.driver.phone}
            </div>
          )}
        </div>
      );
    }
  },
  {
    id: 'cargo',
    accessorKey: 'weightAllocated',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Tải Trọng / Thể Tích' />,
    cell: ({ row }) => {
      const trip = row.original;
      return (
        <div className='font-mono text-slate-800 dark:text-slate-200 text-xs'>
          <div className='font-bold text-sm'>
            {trip.weightAllocated?.toLocaleString() ?? 0} kg
          </div>
          <span className='text-muted-foreground text-[11px] block'>
            {trip.volumeAllocated ?? 0} m³
          </span>
        </div>
      );
    },
    enableSorting: true
  },
  {
    id: 'schedule',
    header: 'Dự Kiến Đến (ETA)',
    cell: ({ row }) => {
      const trip = row.original;
      return (
        <div className='text-xs text-slate-600 dark:text-slate-400 space-y-0.5'>
          <div className='flex items-center gap-1'>
            <Icons.calendar className='h-3.5 w-3.5 text-slate-400 shrink-0' />
            <span>
              Đến:{' '}
              <strong className='text-slate-900 dark:text-slate-100'>
                {trip.estimatedDeliveryDate || 'Hôm nay'}
              </strong>
            </span>
          </div>
          {trip.pickupDate && (
            <div className='text-[11px] text-muted-foreground pl-4.5'>
              Đi: {trip.pickupDate} {trip.pickupTime || ''}
            </div>
          )}
        </div>
      );
    }
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Trạng Thái' />,
    meta: {
      label: 'Trạng thái',
      variant: 'select',
      options: WAREHOUSE_STATUS_OPTIONS
    },
    cell: ({ row }) => renderTripStatusBadge(row.original.status),
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Thao tác</div>,
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
