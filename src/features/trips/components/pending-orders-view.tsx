'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TablePaginationBar } from '@/components/ui/table/table-pagination-bar';
import {
  IconTruck,
  IconAlertTriangle,
  IconCircleCheck,
  IconRefresh
} from '@tabler/icons-react';
import { ordersQueryOptions } from '@/features/orders/api/queries';
import { AssignVehicleDialog } from './assign-vehicle-dialog';
import { NoVehicleDialog } from './no-vehicle-dialog';
import type { Order } from '@/features/orders/api/types';
import type { Vehicle, Driver } from '@/features/fleet/api/types';

interface PendingOrdersViewProps {
  search?: string;
  fromDate?: string;
  toDate?: string;
  vehicles: Vehicle[];
  drivers: Driver[];
}

export function PendingOrdersView({
  search,
  fromDate,
  toDate,
  vehicles,
  drivers
}: PendingOrdersViewProps) {
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [noVehicleModalOpen, setNoVehicleModalOpen] = useState(false);
  const [noVehicleOrder, setNoVehicleOrder] = useState<Order | null>(null);

  const { data: ordersData, isLoading, refetch } = useQuery(
    ordersQueryOptions({
      status: 'PENDING_ASSIGNMENT',
      search: search?.trim() || undefined,
      fromDate,
      toDate,
      page,
      limit: perPage
    })
  );

  const orders = ordersData?.data ?? [];
  const total = ordersData?.meta?.total ?? 0;
  const totalPages = ordersData?.meta?.totalPages ?? 1;

  const handleOpenAssign = (order: Order) => {
    setSelectedOrder(order);
    setAssignModalOpen(true);
  };

  const handleOpenNoVehicle = (order: Order) => {
    setNoVehicleOrder(order);
    setNoVehicleModalOpen(true);
  };

  return (
    <div className='space-y-4'>
      <Card className='shadow-xs border-slate-200/80 dark:border-slate-800 overflow-hidden'>
        <CardHeader className='pb-3 border-b border-slate-100 dark:border-slate-800'>
          <CardTitle className='text-base font-semibold text-slate-900 dark:text-slate-100'>
            Danh Sách Đơn Hàng Chờ Phân Bổ Phương Tiện
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <div className='p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2'>
              <IconRefresh className='h-6 w-6 animate-spin text-blue-500' />
              <span>Đang tải danh sách đơn hàng...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className='p-12 text-center text-slate-400 space-y-2'>
              <IconCircleCheck className='h-10 w-10 text-emerald-500 mx-auto' />
              <p className='font-medium text-slate-700 dark:text-slate-300'>
                Tuyệt vời! Hiện không có đơn hàng nào chờ phân xe.
              </p>
              <p className='text-xs text-slate-500'>
                Tất cả đơn hàng trong kỳ đã được bố trí phương tiện vận tải đầy đủ.
              </p>
            </div>
          ) : (
            <div className='divide-y divide-slate-200 dark:divide-slate-800'>
              {orders.map((order) => (
                <div
                  key={order.id}
                  className='p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors'
                >
                  <div className='space-y-1.5 flex-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='font-mono font-bold text-base text-slate-900 dark:text-slate-100'>
                        {order.orderCode}
                      </span>
                      {order.status === 'NO_VEHICLE' ? (
                        <Badge
                          variant='destructive'
                          className='bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
                        >
                          Không có xe nội bộ
                        </Badge>
                      ) : (
                        <Badge
                          variant='secondary'
                          className='bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        >
                          Chờ phân xe
                        </Badge>
                      )}
                      {order.isExternalVehicleNeeded && (
                        <Badge
                          variant='outline'
                          className='bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 font-bold'
                        >
                          🚛 Yêu cầu xe thuê ngoài
                        </Badge>
                      )}
                    </div>

                    <div className='text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-y-1 gap-x-4'>
                      <span>
                        Tuyến:{' '}
                        <strong className='text-slate-800 dark:text-slate-200'>
                          {order.originHub} &rarr; {order.destinationHub}
                        </strong>
                      </span>
                      <span>
                        Khối lượng:{' '}
                        <strong className='font-mono text-slate-800 dark:text-slate-200'>
                          {order.totalWeight.toLocaleString()} kg
                        </strong>
                      </span>
                      <span>
                        Thể tích:{' '}
                        <strong className='font-mono text-slate-800 dark:text-slate-200'>
                          {order.totalVolume} m³
                        </strong>
                      </span>
                    </div>

                    {order.goodsDescription && (
                      <p className='text-xs text-slate-500 truncate max-w-xl'>
                        Hàng: {order.goodsDescription} {order.notes ? `(${order.notes})` : ''}
                      </p>
                    )}

                    {order.externalNote && (
                      <div className='text-xs bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 px-2.5 py-1.5 rounded border border-amber-200 dark:border-amber-800 font-medium'>
                        <span className='font-bold'>🚛 Yêu cầu xe ngoài:</span>{' '}
                        {order.externalNote}
                      </div>
                    )}
                  </div>

                  <div className='flex items-center gap-2 self-end md:self-center'>
                    {order.status !== 'NO_VEHICLE' && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleOpenNoVehicle(order)}
                        className='text-xs text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900 cursor-pointer'
                      >
                        <IconAlertTriangle className='h-3.5 w-3.5 mr-1' />
                        Báo hết xe
                      </Button>
                    )}

                    <Button
                      size='sm'
                      data-testid={`btn-assign-order-${order.orderCode}`}
                      onClick={() => handleOpenAssign(order)}
                      className='bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 cursor-pointer'
                    >
                      <IconTruck className='h-4 w-4 mr-1.5' />
                      Phân công xe
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {!isLoading && totalPages > 0 && (
          <TablePaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={perPage}
            onPageChange={setPage}
          />
        )}
      </Card>

      {/* Modals */}
      <AssignVehicleDialog
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        order={selectedOrder}
        vehicles={vehicles}
        drivers={drivers}
        onSuccess={() => refetch()}
      />

      <NoVehicleDialog
        open={noVehicleModalOpen}
        onOpenChange={setNoVehicleModalOpen}
        order={noVehicleOrder}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
