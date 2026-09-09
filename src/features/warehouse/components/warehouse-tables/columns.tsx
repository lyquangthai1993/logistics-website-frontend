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

export function renderWarehouseOrderStatusBadge(status: string) {
  switch (status) {
    case 'INBOUND':
    case 'STORED':
    case 'LUU_KHO':
      return (
        <Badge
          variant='outline'
          className='bg-emerald-50 text-emerald-700 border-emerald-300 font-bold dark:bg-emerald-950/50 dark:text-emerald-300'
        >
          LƯU KHO
        </Badge>
      );
    case 'DRAFT':
      return (
        <Badge
          variant='outline'
          className='bg-slate-100 text-slate-700 border-slate-300 font-bold dark:bg-slate-800 dark:text-slate-300'
        >
          Đơn nháp
        </Badge>
      );
    case 'PENDING':
    case 'PENDING_INBOUND':
    case 'WAITING':
      return (
        <Badge
          variant='outline'
          className='bg-amber-50 text-amber-700 border-amber-300 font-bold dark:bg-amber-950/50 dark:text-amber-300'
        >
          Chờ nhập kho
        </Badge>
      );
    case 'PENDING_FLEET':
      return (
        <Badge
          variant='outline'
          className='bg-blue-50 text-blue-700 border-blue-300 font-bold dark:bg-blue-950/50 dark:text-blue-300'
        >
          Chờ điều xe
        </Badge>
      );
    case 'ASSIGNED':
      return (
        <Badge
          variant='outline'
          className='bg-indigo-50 text-indigo-700 border-indigo-300 font-bold dark:bg-indigo-950/50 dark:text-indigo-300'
        >
          Đã phân xe
        </Badge>
      );
    case 'IN_TRANSIT':
      return (
        <Badge
          variant='outline'
          className='bg-sky-50 text-sky-700 border-sky-300 font-bold dark:bg-sky-950/50 dark:text-sky-300'
        >
          Đang vận chuyển
        </Badge>
      );
    case 'COMPLETED_INBOUND':
    case 'OUT_FOR_DELIVERY':
      return (
        <Badge
          variant='outline'
          className='bg-purple-50 text-purple-700 border-purple-300 font-bold dark:bg-purple-950/50 dark:text-purple-300'
        >
          Đã xuất kho
        </Badge>
      );
    case 'DELIVERED':
    case 'COMPLETED':
    case 'COMPLETED_OUTBOUND':
      return (
        <Badge
          variant='outline'
          className='bg-green-100 text-green-800 border-green-300 font-bold dark:bg-green-950/50 dark:text-green-300'
        >
          Đã hoàn thành
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge
          variant='outline'
          className='bg-rose-50 text-rose-700 border-rose-300 font-bold dark:bg-rose-950/50 dark:text-rose-300'
        >
          Đã hủy
        </Badge>
      );
    default:
      return (
        <Badge variant='outline' className='font-semibold'>
          {status}
        </Badge>
      );
  }
}

export const columns: ColumnDef<Trip>[] = [
  {
    id: 'tripSequence',
    accessorKey: 'sequenceNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Chuyến Xe / Mã Đơn' />,
    meta: {
      id: 'warehouse-search-input',
      columnTitle: 'Chuyến Xe / Mã Đơn',
      label: 'Tìm kiếm',
      placeholder: 'Tìm theo mã đơn, biển số, tài xế, nhà xe...',
      variant: 'text',
      icon: Icons.search
    },
    cell: ({ row }) => {
      const trip = row.original;
      const isExternal = trip.order?.isExternalVehicleNeeded;
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
    meta: {
      columnTitle: 'Tuyến Đường (Gửi → Nhận)'
    },
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
    accessorFn: (row) => row.licensePlate || '',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Phương Tiện' />,
    meta: {
      columnTitle: 'Phương Tiện'
    },
    cell: ({ row }) => {
      const trip = row.original;
      const isExternal = trip.order?.isExternalVehicleNeeded;
      const licensePlate = trip.licensePlate;

      return (
        <div className='text-slate-800 dark:text-slate-200 text-xs'>
          <div className='font-mono font-bold text-sm'>{licensePlate || '—'}</div>
          {isExternal && trip.order?.externalNote && (
            <span className='text-muted-foreground block mt-0.5 text-amber-700 dark:text-amber-300 font-medium'>
              Đối tác: {trip.order.externalNote}
            </span>
          )}
        </div>
      );
    },
    enableSorting: true
  },
  {
    id: 'driver',
    accessorFn: (row) => row.driverName || '',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Tài Xế' />,
    meta: {
      columnTitle: 'Tài Xế'
    },
    cell: ({ row }) => {
      const trip = row.original;
      return (
        <div className='text-slate-800 dark:text-slate-200 text-xs'>
          <div className='font-medium text-sm flex items-center gap-1'>
            <Icons.user className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
            {trip.driverName || 'Chưa gán'}
          </div>
        </div>
      );
    }
  },
  {
    id: 'cargo',
    accessorKey: 'weightAllocated',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Tải Trọng / Thể Tích' />,
    meta: {
      columnTitle: 'Tải Trọng / Thể Tích'
    },
    cell: ({ row }) => {
      const trip = row.original;
      return (
        <div className='font-mono text-slate-800 dark:text-slate-200 text-xs'>
          <div className='font-bold text-sm'>{trip.weightAllocated?.toLocaleString() ?? 0} kg</div>
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
    meta: {
      columnTitle: 'Dự Kiến Đến (ETA)'
    },
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
      columnTitle: 'Trạng Thái',
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
    enableHiding: false,
    header: () => <div className='text-right'>Thao tác</div>,
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
