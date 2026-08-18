'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { renderTripStatusBadge } from './warehouse-tables/columns';
import { CellAction } from './warehouse-tables/cell-action';
import type { Trip } from '@/features/trips/api/types';

interface WarehouseInboundBoardProps {
  trips: Trip[];
  loading?: boolean;
}

export function WarehouseInboundBoard({ trips, loading = false }: WarehouseInboundBoardProps) {
  if (loading) {
    return (
      <div className='p-12 text-center text-muted-foreground'>
        Đang tải lịch trình tiếp nhận hàng...
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <Card className='p-12 text-center border-dashed'>
        <Icons.circleCheck className='h-10 w-10 text-emerald-500 mx-auto mb-2' />
        <p className='font-semibold text-foreground'>
          Không có chuyến xe nào đang đến Hub đã chọn.
        </p>
        <p className='text-xs text-muted-foreground mt-1'>
          Các chuyến xe được Fleet Manager xác nhận sẽ xuất hiện tại đây.
        </p>
      </Card>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {trips.map((trip) => {
        const isExternal = trip.vehicle?.isExternal;
        const orderCode = trip.order?.orderCode || `Đơn #${trip.orderId}`;

        return (
          <Card
            key={trip.id}
            className={`shadow-xs transition-all hover:shadow-md border ${
              isExternal
                ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                : 'border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <CardHeader className='pb-3 border-b border-border/60 flex flex-row items-center justify-between'>
              <div>
                {trip.orderId ? (
                  <Link
                    href={`/dashboard/orders/${trip.orderId}`}
                    className='font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline block cursor-pointer'
                  >
                    {orderCode}
                  </Link>
                ) : (
                  <span className='font-mono text-xs font-bold text-blue-600 dark:text-blue-400 block'>
                    {orderCode}
                  </span>
                )}
                <CardTitle className='text-base font-bold text-foreground flex items-center gap-1.5 mt-0.5'>
                  <span>Chuyến #{trip.sequenceNumber || trip.id}</span>
                  {isExternal && (
                    <Badge className='bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 font-bold text-[10px]'>
                      🚛 Xe ngoài
                    </Badge>
                  )}
                </CardTitle>
              </div>
              <div className='flex items-center gap-2'>
                {renderTripStatusBadge(trip.status)}
                <CellAction data={trip} />
              </div>
            </CardHeader>

            <CardContent className='p-4 space-y-3'>
              {/* Route & Hub */}
              <div className='space-y-1 text-xs'>
                <div className='flex items-center gap-1.5 text-muted-foreground font-medium'>
                  <Icons.mapPin className='h-3.5 w-3.5 text-blue-500 shrink-0' />
                  <span>{trip.order?.originHub?.split(' ')[0] || 'Kho gửi'}</span>
                  <span>&rarr;</span>
                  <strong className='text-foreground'>{trip.order?.destinationHub || 'Kho nhận'}</strong>
                </div>
              </div>

              {/* Vehicle & Driver Details */}
              <div className='p-2.5 bg-muted/50 rounded-lg text-xs space-y-1.5 border border-border/60'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Phương tiện:</span>
                  <span className='font-mono font-bold text-foreground'>
                    {trip.vehicle?.licensePlate || '—'}
                  </span>
                </div>

                {isExternal && (
                  <div className='flex items-center justify-between text-amber-700 dark:text-amber-300 font-medium'>
                    <span>Nhà xe đối tác:</span>
                    <span className='font-bold'>
                      {trip.vehicle?.externalProvider || 'Thuê ngoài'}
                    </span>
                  </div>
                )}

                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Tài xế & SĐT:</span>
                  <span className='font-medium text-foreground'>
                    {trip.driver?.fullName || 'Chưa gán'} ({trip.driver?.phone || 'N/A'})
                  </span>
                </div>
              </div>

              {/* Cargo Payload */}
              <div className='grid grid-cols-2 gap-2 text-xs pt-1'>
                <div>
                  <span className='text-muted-foreground block'>Khối lượng nhận</span>
                  <span className='font-mono font-bold text-foreground'>
                    {trip.weightAllocated?.toLocaleString() ?? 0} kg
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground block'>Thể tích</span>
                  <span className='font-mono font-bold text-foreground'>
                    {trip.volumeAllocated ?? 0} m³
                  </span>
                </div>
              </div>

              {/* Schedule */}
              <div className='pt-2 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between'>
                <div className='flex items-center gap-1'>
                  <Icons.calendar className='h-3.5 w-3.5 text-muted-foreground' />
                  <span>
                    Dự kiến đến:{' '}
                    <strong className='text-foreground'>
                      {trip.estimatedDeliveryDate || 'Hôm nay'}
                    </strong>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
