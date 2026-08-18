'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { CellAction } from './cell-action';
import { TRIP_STATUS_OPTIONS } from './options';
import type { Trip, TripStatus } from '../../api/types';

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
    case 'PENDING':
      return (
        <Badge
          variant='secondary'
          className='bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
        >
          Chờ xác nhận
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
      columnTitle: 'Chuyến Xe / Mã Đơn',
      label: 'Chuyến xe / Mã đơn'
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
                Xe ngoài
              </Badge>
            )}
          </div>
          {trip.orderId ? (
            <Link
              href={`/dashboard/orders/${trip.orderId}`}
              className='bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 rounded-md border border-primary/20 font-mono text-xs font-semibold transition-colors duration-150 cursor-pointer inline-block mt-0.5'
            >
              {orderCode}
            </Link>
          ) : (
            <span className='text-xs font-mono text-muted-foreground block'>{orderCode}</span>
          )}
        </div>
      );
    }
  },
  {
    id: 'vehicle',
    accessorFn: (row) => row.vehicle?.licensePlate || '',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Phương Tiện' />,
    meta: {
      columnTitle: 'Phương Tiện'
    },
    cell: ({ row }) => {
      const trip = row.original;
      const isExternal = trip.vehicle?.isExternal;

      return (
        <div>
          {trip.vehicle?.licensePlate ? (
            <span className='bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20 font-mono text-xs font-semibold inline-block'>
              {trip.vehicle.licensePlate}
            </span>
          ) : (
            <span className='text-muted-foreground text-xs font-mono'>Chưa gán xe</span>
          )}
          <span className='text-xs text-muted-foreground block mt-1'>
            {isExternal ? (
              <span className='text-amber-700 dark:text-amber-400 font-medium'>
                {trip.vehicle?.externalProvider || 'Xe thuê ngoài'}
              </span>
            ) : (
              trip.vehicle?.type || 'Xe nội bộ'
            )}
          </span>
        </div>
      );
    }
  },
  {
    id: 'driver',
    accessorFn: (row) => row.driver?.fullName || '',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Tài Xế' />,
    meta: {
      columnTitle: 'Tài Xế'
    },
    cell: ({ row }) => {
      const trip = row.original;
      return (
        <div className='text-slate-800 dark:text-slate-200'>
          <div className='font-medium text-sm'>{trip.driver?.fullName || 'Chưa gán'}</div>
          <span className='text-xs text-slate-400'>{trip.driver?.phone || '—'}</span>
        </div>
      );
    }
  },
  {
    id: 'capacity',
    accessorKey: 'weightAllocated',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Khối Lượng / m³' />,
    meta: {
      columnTitle: 'Khối Lượng / m³'
    },
    cell: ({ row }) => {
      const trip = row.original;
      return (
        <div className='font-mono text-slate-700 dark:text-slate-300 text-sm'>
          <div className='font-semibold'>{trip.weightAllocated.toLocaleString()} kg</div>
          <span className='text-xs text-slate-400'>{trip.volumeAllocated} m³</span>
        </div>
      );
    }
  },
  {
    id: 'schedule',
    header: 'Lịch Trình',
    meta: {
      columnTitle: 'Lịch Trình'
    },
    cell: ({ row }) => {
      const trip = row.original;
      return (
        <div className='text-xs text-slate-600 dark:text-slate-400 space-y-0.5'>
          <div>
            Lấy: <span className='font-medium text-slate-800 dark:text-slate-200'>{trip.pickupDate || 'N/A'} {trip.pickupTime || ''}</span>
          </div>
          <div>
            Đích: <span className='font-medium text-slate-800 dark:text-slate-200'>{trip.estimatedDeliveryDate || 'N/A'}</span>
          </div>
        </div>
      );
    }
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Trạng Thái' />,
    meta: {
      columnTitle: 'Trạng Thái',
      label: 'Trạng thái',
      options: TRIP_STATUS_OPTIONS
    },
    cell: ({ row }) => renderTripStatusBadge(row.original.status),
    filterFn: (row, id, value) => {
      if (!value || value.length === 0) return true;
      return value.includes(row.getValue(id));
    }
  },
  {
    id: 'actions',
    enableHiding: false,
    header: () => <div className='text-right'>Thao tác</div>,
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
