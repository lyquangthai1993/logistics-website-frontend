'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { IconSearch, IconArrowRight, IconTruck } from '@tabler/icons-react';
import { CellAction } from './cell-action';
import { ORDER_STATUS_OPTIONS } from './options';
import type { Order, OrderStatus } from '../../api/types';

export function renderStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'DRAFT':
      return (
        <Badge
          variant='secondary'
          className='bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        >
          Nháp
        </Badge>
      );
    case 'PENDING_FLEET':
      return (
        <Badge
          variant='secondary'
          className='bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200'
        >
          Chờ điều xe
        </Badge>
      );
    case 'ASSIGNED':
      return (
        <Badge
          variant='secondary'
          className='bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
        >
          Đã phân xe
        </Badge>
      );
    case 'IN_TRANSIT':
      return (
        <Badge
          variant='secondary'
          className='bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
        >
          Đang vận chuyển
        </Badge>
      );
    case 'DELIVERED':
      return (
        <Badge
          variant='secondary'
          className='bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-200'
        >
          Đã giao hàng
        </Badge>
      );
    case 'NO_VEHICLE':
      return (
        <Badge
          variant='destructive'
          className='bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
        >
          Không có xe
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

export const columns: ColumnDef<Order>[] = [
  {
    id: 'orderCode',
    accessorKey: 'orderCode',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Mã Đơn Hàng' />,
    cell: ({ row }) => {
      const order = row.original;
      const tripsCount = order.trips?.length || 0;
      const isSplit = tripsCount > 1;
      const hasExternalTrip =
        order.trips?.some((t) => t.vehicle?.isExternal) || order.isExternalVehicleNeeded;

      return (
        <div>
          <div className='flex items-center gap-2'>
            <Link
              href={`/dashboard/orders/${order.id}`}
              className='bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded-md border border-primary/20 font-mono text-xs font-semibold transition-colors duration-150 cursor-pointer inline-block'
            >
              {order.orderCode}
            </Link>
            {isSplit && (
              <Badge
                variant='outline'
                className='bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 text-[10px] px-1.5 py-0'
              >
                Split {tripsCount}x
              </Badge>
            )}
            {hasExternalTrip && (
              <span className='bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-300 whitespace-nowrap'>
                🚛 Xe thuê ngoài
              </span>
            )}
          </div>
          <span className='text-[11px] font-normal text-muted-foreground block mt-1'>
            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : ''}
          </span>
        </div>
      );
    },
    meta: {
      id: 'order-search-input',
      label: 'Tìm kiếm',
      placeholder: 'Tìm theo mã đơn, tuyến đường, hàng hóa...',
      variant: 'text',
      icon: IconSearch
    },
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'route',
    header: 'Tuyến Đường & Hub',
    cell: ({ row }) => {
      const order = row.original;
      const originShort = order.originHub?.split(' ')[0] || 'N/A';
      const destShort = order.destinationHub?.split(' ')[0] || 'N/A';

      return (
        <div className='text-slate-700 dark:text-slate-300'>
          <div className='font-medium flex items-center gap-1.5'>
            <span>{originShort}</span>
            <IconArrowRight className='h-3.5 w-3.5 text-slate-400' />
            <span>{destShort}</span>
          </div>
          <span
            className='text-xs text-slate-400 block mt-0.5 truncate max-w-[200px]'
            title={`${order.originHub || ''} → ${order.destinationHub || ''}`}
          >
            {order.destinationHub || '—'}
          </span>
        </div>
      );
    }
  },
  {
    id: 'weights',
    header: 'Khối Lượng / Thể Tích',
    cell: ({ row }) => {
      const order = row.original;
      const weight = order.totalWeight != null ? Number(order.totalWeight).toLocaleString() : '0';
      const volume = order.totalVolume != null ? order.totalVolume : '0';
      return (
        <div className='text-slate-700 dark:text-slate-300 font-mono'>
          <div className='font-medium'>{weight} kg</div>
          <div className='text-xs text-slate-400 flex items-center gap-1.5'>
            <span>{volume} m³</span>
            {order.totalQuantity != null && (
              <>
                <span>•</span>
                <span className='font-sans font-medium text-slate-600 dark:text-slate-400'>
                  {Number(order.totalQuantity).toLocaleString()} kiện
                </span>
              </>
            )}
          </div>
        </div>
      );
    }
  },
  {
    id: 'goods',
    header: 'Loại Hàng',
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className='text-slate-600 dark:text-slate-400'>
          <span
            className='truncate block max-w-[180px]'
            title={order.goodsDescription || 'Chưa có mô tả'}
          >
            {order.goodsDescription || '—'}
          </span>
          {order.externalNote && (
            <span
              className='text-[11px] text-amber-700 dark:text-amber-300 block truncate max-w-[180px] font-medium mt-0.5'
              title={`Lý do xe ngoài: ${order.externalNote}`}
            >
              🚚 {order.externalNote}
            </span>
          )}
        </div>
      );
    }
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Trạng Thái' />,
    cell: ({ cell }) => renderStatusBadge(cell.getValue<OrderStatus>()),
    meta: {
      label: 'Trạng thái',
      variant: 'select',
      options: ORDER_STATUS_OPTIONS
    },
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'trips',
    header: 'Xe Phân Công',
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className='text-slate-700 dark:text-slate-300'>
          {order.trips && order.trips.length > 0 ? (
            <div className='space-y-1'>
              {order.trips.map((t, idx) => (
                <div key={t.id} className='text-xs flex items-center gap-1.5'>
                  <IconTruck className='h-3.5 w-3.5 text-slate-400' />
                  <span className='font-mono font-medium'>
                    {t.vehicle?.licensePlate || `Chuyến #${idx + 1}`}
                  </span>
                  {t.vehicle?.isExternal && (
                    <span className='text-[10px] text-amber-600 font-bold'>
                      ({t.vehicle.externalProvider || 'Xe ngoài'})
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className='text-xs text-slate-400 italic'>Chưa gán xe</span>
          )}
        </div>
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Thao tác</div>,
    cell: ({ row }) => <CellAction order={row.original} />
  }
];
