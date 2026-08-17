'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, Order, OrderStatus } from '@/features/orders/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  IconArrowLeft,
  IconTruck,
  IconUser,
  IconCalendar,
  IconSend,
  IconClock,
  IconMapPin,
  IconFileText,
  IconTrash
} from '@tabler/icons-react';
import { toast } from 'sonner';

function renderStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'DRAFT':
      return (
        <Badge
          variant='secondary'
          className='bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        >
          Nháp (Draft)
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

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = Number(params?.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await ordersApi.getOrder(orderId);
      setOrder(data);
    } catch (err: any) {
      toast.error('Không thể tải thông tin đơn hàng', {
        description: err.response?.data?.message || err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  const handleSubmitToFleet = async () => {
    try {
      await ordersApi.submitOrder(orderId);
      toast.success('Đã gửi lệnh điều vận lên Đội xe (Fleet)!');
      loadOrder();
    } catch (err: any) {
      toast.error('Lỗi khi gửi lệnh điều vận', {
        description: (err as Error).message
      });
    }
  };

  const handleDeleteOrder = async () => {
    if (!confirm('Bạn có chắc chắn muốn hủy / xóa lệnh điều vận này?')) return;
    try {
      await ordersApi.deleteOrder(orderId);
      toast.success('Đã hủy lệnh điều vận thành công');
      router.push('/dashboard/orders');
    } catch (err: any) {
      toast.error('Lỗi khi hủy lệnh điều vận', {
        description: (err as Error).message
      });
    }
  };

  if (loading) {
    return (
      <div className='p-8 text-center text-slate-400'>Đang tải thông tin chi tiết đơn hàng...</div>
    );
  }

  if (!order) {
    return (
      <div className='p-8 text-center space-y-4'>
        <p className='text-rose-500 font-medium'>Không tìm thấy đơn hàng #{orderId}</p>
        <Link href='/dashboard/orders'>
          <Button variant='outline'>
            <IconArrowLeft className='mr-2 h-4 w-4' /> Quay lại danh sách
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className='flex-1 space-y-6 p-4 md:p-8 pt-6'>
      {/* Back button & Action header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => router.push('/dashboard/orders')}
            className='text-slate-600 hover:text-slate-900 dark:text-slate-300'
          >
            <IconArrowLeft className='h-4 w-4 mr-1' />
            Quay lại
          </Button>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100'>
                {order.orderCode}
              </h2>
              {renderStatusBadge(order.status)}
              {order.isExternalVehicleNeeded && (
                <Badge
                  variant='outline'
                  className='bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 font-bold'
                >
                  🚛 Yêu cầu xe ngoài
                </Badge>
              )}
            </div>
            <p className='text-xs text-slate-400 mt-0.5'>
              Khởi tạo ngày {new Date(order.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {order.status === 'DRAFT' && (
            <Button
              onClick={handleDeleteOrder}
              variant='outline'
              className='text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            >
              <IconTrash className='mr-2 h-4 w-4' />
              Hủy lệnh điều vận
            </Button>
          )}

          {(order.status === 'DRAFT' || order.status === 'NO_VEHICLE') && (
            <Button
              onClick={handleSubmitToFleet}
              className='bg-blue-600 hover:bg-blue-700 text-white'
            >
              <IconSend className='mr-2 h-4 w-4' />
              Gửi lên Fleet phân xe
            </Button>
          )}
          <Link href='/dashboard/trips'>
            <Button variant='outline'>
              <IconTruck className='mr-2 h-4 w-4' />
              Xem bảng Phân công xe
            </Button>
          </Link>
        </div>
      </div>

      {/* 2 Column Details */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left Column: Order Overview */}
        <div className='lg:col-span-2 space-y-6'>
          <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
            <CardHeader className='pb-3 border-b border-slate-100 dark:border-slate-800'>
              <CardTitle className='text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2'>
                <IconFileText className='h-4 w-4 text-blue-500' />
                Thông Tin Vận Chuyển
              </CardTitle>
            </CardHeader>
            <CardContent className='p-4 space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-1'>
                  <span className='text-xs text-slate-400 flex items-center gap-1 font-medium'>
                    <IconMapPin className='h-3.5 w-3.5 text-blue-500' /> Hub xuất phát (Origin)
                  </span>
                  <div className='font-semibold text-slate-900 dark:text-slate-100'>
                    {order.originHub || 'Chưa chọn'}
                  </div>
                </div>

                <div className='p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-1'>
                  <span className='text-xs text-slate-400 flex items-center gap-1 font-medium'>
                    <IconMapPin className='h-3.5 w-3.5 text-emerald-500' /> Hub đích (Destination)
                  </span>
                  <div className='font-semibold text-slate-900 dark:text-slate-100'>
                    {order.destinationHub || 'Chưa chọn'}
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4 pt-2'>
                <div className='space-y-1'>
                  <span className='text-xs text-slate-400'>Tổng khối lượng hàng</span>
                  <div className='text-lg font-bold text-slate-900 dark:text-slate-100 font-mono'>
                    {order.totalWeight.toLocaleString()} kg
                  </div>
                </div>

                <div className='space-y-1'>
                  <span className='text-xs text-slate-400'>Tổng thể tích hàng</span>
                  <div className='text-lg font-bold text-slate-900 dark:text-slate-100 font-mono'>
                    {order.totalVolume} m³
                  </div>
                </div>
              </div>

              <div className='pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2'>
                <div>
                  <span className='text-xs text-slate-400 block mb-1 font-medium'>
                    Mô tả hàng hóa:
                  </span>
                  <p className='text-sm text-slate-700 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-900/60 p-2.5 rounded-md'>
                    {order.goodsDescription || 'Không có mô tả chi tiết'}
                  </p>
                </div>

                {order.notes && (
                  <div>
                    <span className='text-xs text-slate-400 block mb-1 font-medium'>
                      Ghi chú điều vận:
                    </span>
                    <p className='text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-md border border-slate-200 dark:border-slate-800'>
                      {order.notes}
                    </p>
                  </div>
                )}

                {order.externalNote && (
                  <div>
                    <span className='text-xs text-amber-600 dark:text-amber-400 block mb-1 font-bold'>
                      🚛 Ghi chú / Lý do điều xe ngoài (external_note):
                    </span>
                    <p className='text-sm text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/40 p-2.5 rounded-md border border-amber-300 dark:border-amber-900 font-medium'>
                      {order.externalNote}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Trips Section */}
          <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
            <CardHeader className='pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between'>
              <CardTitle className='text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2'>
                <IconTruck className='h-4 w-4 text-emerald-500' />
                Danh Sách Chuyến Xe Điều Phối ({order.trips?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className='p-4'>
              {!order.trips || order.trips.length === 0 ? (
                <div className='text-center py-8 text-slate-400 space-y-2'>
                  <IconClock className='h-8 w-8 mx-auto text-slate-300 dark:text-slate-600' />
                  <p>Chưa có phương tiện nào được phân bổ cho đơn hàng này.</p>
                  <p className='text-xs text-slate-500'>
                    Đơn hàng đang chờ Quản lý Đội xe tiếp nhận và gán xe.
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {order.trips.map((trip, idx) => (
                    <div
                      key={trip.id}
                      className='p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 transition-colors space-y-3 bg-slate-50/40 dark:bg-slate-900/30'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <span className='font-semibold text-sm text-slate-900 dark:text-slate-100'>
                            Chuyến #{trip.sequenceNumber || idx + 1}
                          </span>
                          <Badge variant='outline' className='text-xs'>
                            {trip.status}
                          </Badge>
                          {trip.vehicle?.isExternal && (
                            <Badge className='bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[11px] font-bold'>
                              🚛 Xe thuê ngoài: {trip.vehicle.externalProvider || 'Đối tác ngoài'}
                            </Badge>
                          )}
                        </div>
                        <span className='font-mono text-sm font-semibold text-slate-700 dark:text-slate-300'>
                          {trip.weightAllocated.toLocaleString()} kg &bull; {trip.volumeAllocated}{' '}
                          m³
                        </span>
                      </div>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400'>
                        <div className='flex items-center gap-2'>
                          <IconTruck className='h-4 w-4 text-slate-400' />
                          <span>
                            Xe:{' '}
                            <strong className='text-slate-900 dark:text-slate-100 font-mono'>
                              {trip.vehicle?.licensePlate || 'Chưa gán'}
                            </strong>{' '}
                            ({trip.vehicle?.type || 'N/A'})
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <IconUser className='h-4 w-4 text-slate-400' />
                          <span>
                            Tài xế:{' '}
                            <strong className='text-slate-900 dark:text-slate-100'>
                              {trip.driver?.fullName || 'Chưa gán'}
                            </strong>{' '}
                            ({trip.driver?.phone || 'N/A'})
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <IconCalendar className='h-4 w-4 text-slate-400' />
                          <span>
                            Lấy hàng: {trip.pickupDate || 'N/A'} {trip.pickupTime || ''}
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <IconCalendar className='h-4 w-4 text-slate-400' />
                          <span>Dự kiến đến kho: {trip.estimatedDeliveryDate || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Workflow Timeline / Guidance */}
        <div className='space-y-6'>
          <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
            <CardHeader className='pb-3 border-b border-slate-100 dark:border-slate-800'>
              <CardTitle className='text-base font-semibold text-slate-800 dark:text-slate-200'>
                Tiến Trình Đơn Hàng
              </CardTitle>
            </CardHeader>
            <CardContent className='p-4 space-y-4'>
              <div className='relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700'>
                <div className='relative'>
                  <div className='absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900' />
                  <div className='text-xs font-semibold text-slate-900 dark:text-slate-100'>
                    1. Tạo lệnh điều vận (Draft)
                  </div>
                  <p className='text-[11px] text-slate-500'>
                    Dispatcher khai báo thông tin tuyến, tải trọng & hàng hóa.
                  </p>
                </div>

                <div className='relative'>
                  <div
                    className={`absolute -left-6 top-0.5 h-4 w-4 rounded-full border-2 border-white dark:border-slate-900 ${
                      order.status !== 'DRAFT' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  <div className='text-xs font-semibold text-slate-900 dark:text-slate-100'>
                    2. Gửi yêu cầu Fleet (Pending)
                  </div>
                  <p className='text-[11px] text-slate-500'>
                    Đội xe nhận thông tin và kiểm tra phương tiện sẵn sàng.
                  </p>
                </div>

                <div className='relative'>
                  <div
                    className={`absolute -left-6 top-0.5 h-4 w-4 rounded-full border-2 border-white dark:border-slate-900 ${
                      order.status === 'ASSIGNED' ||
                      order.status === 'IN_TRANSIT' ||
                      order.status === 'DELIVERED'
                        ? 'bg-emerald-500'
                        : order.status === 'NO_VEHICLE'
                          ? 'bg-rose-500'
                          : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  <div className='text-xs font-semibold text-slate-900 dark:text-slate-100'>
                    3. Phân xe & Xác nhận (Assigned)
                  </div>
                  <p className='text-[11px] text-slate-500'>
                    Gán xe nội bộ hoặc xe thuê ngoài. Thông báo tự động gửi đến Kho.
                  </p>
                </div>

                <div className='relative'>
                  <div
                    className={`absolute -left-6 top-0.5 h-4 w-4 rounded-full border-2 border-white dark:border-slate-900 ${
                      order.status === 'DELIVERED'
                        ? 'bg-emerald-500'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  <div className='text-xs font-semibold text-slate-900 dark:text-slate-100'>
                    4. Vận chuyển & Giao hàng
                  </div>
                  <p className='text-[11px] text-slate-500'>
                    Kho tiếp nhận Inbound và hoàn tất đơn hàng.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
