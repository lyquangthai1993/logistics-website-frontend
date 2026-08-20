'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, Order, OrderStatus } from '@/features/orders/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  IconArrowLeft,
  IconTruck,
  IconUser,
  IconCalendar,
  IconSend,
  IconClock,
  IconMapPin,
  IconFileText,
  IconTrash,
  IconAlertTriangle,
  IconEdit,
  IconCheck,
  IconTruckOff,
  IconInfoCircle,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';

function renderStatusBadge(status: OrderStatus) {
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

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = Number(params?.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal External Vehicle state
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorDetails, setVendorDetails] = useState('');
  const [submittingExternal, setSubmittingExternal] = useState(false);

  // Modal Edit Order state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTotalQuantity, setEditTotalQuantity] = useState<number | ''>('');
  const [editTotalWeight, setEditTotalWeight] = useState<number | ''>('');
  const [editTotalVolume, setEditTotalVolume] = useState<number | ''>('');
  const [editGoodsDesc, setEditGoodsDesc] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await ordersApi.getOrder(orderId);
      setOrder(data);
    } catch (err: unknown) {
      showApiErrorToast(err, 'Không thể tải thông tin đơn hàng. Vui lòng thử lại.');
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
      showApiSuccessToast('Đã gửi lệnh điều vận lên Đội xe (Fleet)!');
      loadOrder();
    } catch (err: unknown) {
      showApiErrorToast(err, 'Lỗi khi gửi lệnh điều vận. Vui lòng thử lại.');
    }
  };

  const handleDeleteOrder = async () => {
    if (!confirm('Bạn có chắc chắn muốn hủy / xóa lệnh điều vận này?')) return;
    try {
      await ordersApi.deleteOrder(orderId);
      showApiSuccessToast('Đã hủy lệnh điều vận thành công');
      router.push('/dashboard/orders');
    } catch (err: unknown) {
      showApiErrorToast(err, 'Lỗi khi hủy lệnh điều vận. Vui lòng thử lại.');
    }
  };

  // Open External Vehicle modal with prefilled data
  const handleOpenExternalModal = () => {
    if (!order) return;
    setVendorName('');
    setVendorPhone('');
    setVendorDetails(order.externalNote || '');
    setIsExternalModalOpen(true);
  };

  // Save external vehicle information & optionally submit to Fleet
  const handleSaveExternalVehicle = async (autoSubmit: boolean) => {
    if (!order) return;

    const parts: string[] = [];
    if (vendorName.trim()) parts.push(`Nhà xe: ${vendorName.trim()}`);
    if (vendorPhone.trim()) parts.push(`Liên hệ: ${vendorPhone.trim()}`);
    if (vendorDetails.trim()) parts.push(vendorDetails.trim());

    const finalExternalNote = parts.join(' | ');

    if (!finalExternalNote.trim()) {
      toast.error('Vui lòng nhập thông tin nhà xe / đối tác hoặc ghi chú thuê xe ngoài');
      return;
    }

    try {
      setSubmittingExternal(true);
      await ordersApi.updateOrder(order.id, {
        isExternalVehicleNeeded: true,
        externalNote: finalExternalNote,
      });

      if (autoSubmit) {
        await ordersApi.submitOrder(order.id);
        showApiSuccessToast('Đã cấu hình xe thuê ngoài và gửi lại cho Đội xe tiếp nhận!');
      } else {
        showApiSuccessToast('Đã cập nhật thông tin xe ngoài cho đơn hàng.');
      }

      setIsExternalModalOpen(false);
      loadOrder();
    } catch (err: unknown) {
      showApiErrorToast(err, 'Lỗi khi cập nhật thông tin xe thuê ngoài. Vui lòng thử lại.');
    } finally {
      setSubmittingExternal(false);
    }
  };

  // Open Edit Order modal
  const handleOpenEditModal = () => {
    if (!order) return;
    setEditTotalQuantity(order.totalQuantity ?? '');
    setEditTotalWeight(order.totalWeight);
    setEditTotalVolume(order.totalVolume);
    setEditGoodsDesc(order.goodsDescription || '');
    setEditNotes(order.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    try {
      setSubmittingEdit(true);
      await ordersApi.updateOrder(order.id, {
        totalQuantity: editTotalQuantity !== '' ? Number(editTotalQuantity) : null,
        totalWeight: Number(editTotalWeight) || order.totalWeight,
        totalVolume: Number(editTotalVolume) || order.totalVolume,
        goodsDescription: editGoodsDesc || undefined,
        notes: editNotes || undefined,
      });
      showApiSuccessToast('Đã cập nhật thông tin đơn hàng');
      setIsEditModalOpen(false);
      loadOrder();
    } catch (err: unknown) {
      showApiErrorToast(err, 'Lỗi khi cập nhật đơn hàng. Vui lòng thử lại.');
    } finally {
      setSubmittingEdit(false);
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

        <div className='flex items-center flex-wrap gap-2'>
          {(order.status === 'DRAFT' || order.status === 'NO_VEHICLE') && (
            <Button
              onClick={handleOpenEditModal}
              variant='outline'
              size='sm'
              className='text-slate-700 dark:text-slate-200'
            >
              <IconEdit className='mr-1.5 h-4 w-4' />
              Chỉnh sửa đơn
            </Button>
          )}

          {order.status === 'NO_VEHICLE' && (
            <Button
              onClick={handleOpenExternalModal}
              className='bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-semibold'
            >
              <IconTruck className='mr-2 h-4 w-4' />
              Thuê xe bên ngoài & Gửi lại Fleet
            </Button>
          )}

          {order.status === 'DRAFT' && (
            <>
              <Button
                onClick={handleDeleteOrder}
                variant='outline'
                className='text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              >
                <IconTrash className='mr-2 h-4 w-4' />
                Hủy lệnh điều vận
              </Button>
              <Button
                onClick={handleSubmitToFleet}
                className='bg-blue-600 hover:bg-blue-700 text-white'
              >
                <IconSend className='mr-2 h-4 w-4' />
                Gửi lên Fleet phân xe
              </Button>
            </>
          )}

          <Link href='/dashboard/trips'>
            <Button variant='outline'>
              <IconTruck className='mr-2 h-4 w-4' />
              Xem bảng Phân công xe
            </Button>
          </Link>
        </div>
      </div>

      {/* NO_VEHICLE Alert Banner for Dispatcher */}
      {order.status === 'NO_VEHICLE' && (
        <div className='p-5 rounded-xl bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50/50 dark:from-rose-950/40 dark:via-amber-950/30 dark:to-rose-950/20 border-2 border-rose-200 dark:border-rose-900 shadow-sm'>
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
            <div className='space-y-1.5'>
              <div className='flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-base'>
                <IconAlertTriangle className='h-5 w-5 text-rose-600 flex-shrink-0' />
                <span>Đội xe báo không có xe nội bộ khả dụng</span>
                <Badge variant='destructive' className='text-xs'>
                  Cần điều xe ngoài
                </Badge>
              </div>
              <p className='text-sm text-slate-700 dark:text-slate-300'>
                Lệnh điều vận này đã được chuyển hoàn về cho <strong>Điều phối (Dispatcher)</strong> để liên hệ sắp xếp phương án thuê xe bên ngoài (External Vehicle).
              </p>
              {order.notes && (
                <div className='mt-2 p-3 bg-white/80 dark:bg-slate-900/80 rounded-md border border-rose-200 dark:border-rose-900/50 text-xs font-mono text-rose-900 dark:text-rose-200'>
                  <strong>Ghi chú từ Đội xe:</strong>
                  <pre className='whitespace-pre-wrap font-sans mt-1 text-slate-700 dark:text-slate-300'>
                    {order.notes}
                  </pre>
                </div>
              )}
            </div>
            <div className='flex-shrink-0'>
              <Button
                onClick={handleOpenExternalModal}
                className='bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md'
              >
                <IconTruck className='mr-2 h-4 w-4' />
                Cấu hình đối tác xe ngoài & Gửi lại Fleet
              </Button>
            </div>
          </div>
        </div>
      )}

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

              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2'>
                <div className='space-y-1'>
                  <span className='text-xs text-slate-400'>Số lượng kiện / cái</span>
                  <div className='text-lg font-bold text-slate-900 dark:text-slate-100 font-mono'>
                    {order.totalQuantity != null ? (
                      `${order.totalQuantity.toLocaleString()} kiện`
                    ) : (
                      <span className='text-sm text-slate-400 font-sans font-normal italic'>
                        Hàng theo lô / xá
                      </span>
                    )}
                  </div>
                </div>

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
                    <p className='text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-md border border-slate-200 dark:border-slate-800 whitespace-pre-wrap'>
                      {order.notes}
                    </p>
                  </div>
                )}

                {order.externalNote && (
                  <div>
                    <span className='text-xs text-amber-600 dark:text-amber-400 block mb-1 font-bold'>
                      🚛 Ghi chú / Thông tin xe thuê ngoài (external_note):
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
                    {order.status === 'NO_VEHICLE'
                      ? 'Đơn hàng đang chờ Điều phối cấu hình thông tin xe thuê ngoài.'
                      : 'Đơn hàng đang chờ Quản lý Đội xe tiếp nhận và gán xe.'}
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
                      order.status === 'NO_VEHICLE'
                        ? 'bg-rose-500 ring-2 ring-rose-300'
                        : order.status !== 'DRAFT'
                          ? 'bg-emerald-500'
                          : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  <div className='text-xs font-semibold text-slate-900 dark:text-slate-100'>
                    {order.status === 'NO_VEHICLE'
                      ? '2. Đội xe báo hết xe (NO_VEHICLE)'
                      : '2. Gửi yêu cầu Fleet (Pending)'}
                  </div>
                  <p className='text-[11px] text-slate-500'>
                    {order.status === 'NO_VEHICLE'
                      ? 'Đã trả về cho Điều phối để liên hệ đối tác xe ngoài.'
                      : 'Đội xe nhận thông tin và kiểm tra phương tiện sẵn sàng.'}
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
                          ? 'bg-amber-500'
                          : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  <div className='text-xs font-semibold text-slate-900 dark:text-slate-100'>
                    {order.status === 'NO_VEHICLE'
                      ? '3. Thuê xe ngoài & Gửi lại Fleet'
                      : '3. Phân xe & Xác nhận (Assigned)'}
                  </div>
                  <p className='text-[11px] text-slate-500'>
                    {order.status === 'NO_VEHICLE'
                      ? 'Điền thông tin xe ngoài và gửi lại đội xe để gán chuyến.'
                      : 'Gán xe nội bộ hoặc xe thuê ngoài. Thông báo tự động gửi đến Kho.'}
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

      {/* Modal: External Vehicle Configuration */}
      <Dialog open={isExternalModalOpen} onOpenChange={setIsExternalModalOpen}>
        <DialogContent className='sm:max-w-[550px]'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400'>
              <IconTruck className='h-5 w-5' />
              Chuyển Sang Xe Thuê Ngoài (External Vehicle)
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-4 py-2 text-sm'>
            <div className='p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200'>
              <div className='font-semibold mb-1 flex items-center gap-1.5'>
                <IconInfoCircle className='h-4 w-4 text-amber-600' />
                Quy trình thuê xe ngoài:
              </div>
              <p>
                Điều phối viên liên hệ đối tác vận tải ngoài, điền thông tin nhà xe và cước phí thỏa thuận. Sau khi lưu, đơn hàng sẽ được kích hoạt cờ <strong>🚛 Yêu cầu xe ngoài</strong> để Đội xe gán xe ngoài và xác nhận chuyến.
              </p>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <label htmlFor='vendorName' className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                  Tên nhà xe / Đối tác ngoài <span className='text-rose-500'>*</span>
                </label>
                <Input
                  id='vendorName'
                  placeholder='VD: Nhà xe Trọng Tấn, CP Á Châu...'
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                />
              </div>

              <div className='space-y-1.5'>
                <label htmlFor='vendorPhone' className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                  Hotline / Người liên hệ
                </label>
                <Input
                  id='vendorPhone'
                  placeholder='VD: 0912 345 678 (A. Hùng)'
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <label htmlFor='vendorDetails' className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                Ghi chú chi tiết điều xe ngoài / Thỏa thuận cước phí <span className='text-rose-500'>*</span>
              </label>
              <Textarea
                id='vendorDetails'
                rows={3}
                placeholder='Nhập chi tiết yêu cầu xe (tải trọng, thùng kín/bạt, giá cước thỏa thuận, thời gian xe ngoài có mặt...)'
                value={vendorDetails}
                onChange={(e) => setVendorDetails(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0 flex-col sm:flex-row'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsExternalModalOpen(false)}
              disabled={submittingExternal}
            >
              Hủy
            </Button>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='secondary'
                onClick={() => handleSaveExternalVehicle(false)}
                disabled={submittingExternal}
              >
                Chỉ lưu thông tin
              </Button>
              <Button
                type='button'
                onClick={() => handleSaveExternalVehicle(true)}
                disabled={submittingExternal}
                className='bg-blue-600 hover:bg-blue-700 text-white'
              >
                <IconSend className='mr-1.5 h-4 w-4' />
                Lưu & Gửi lại cho Fleet
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Order Information */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold flex items-center gap-2'>
              <IconEdit className='h-5 w-5 text-blue-500' />
              Chỉnh Sửa Thông Tin Đơn Hàng
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEditOrder} className='space-y-4 py-2 text-sm'>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <label htmlFor='editTotalQuantity' className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                    Số lượng
                  </label>
                  <span className='text-[10px] text-slate-400'>Tùy chọn</span>
                </div>
                <Input
                  id='editTotalQuantity'
                  type='number'
                  min='1'
                  step='1'
                  placeholder='VD: 3000'
                  value={editTotalQuantity}
                  onChange={(e) =>
                    setEditTotalQuantity(e.target.value ? Number(e.target.value) : '')
                  }
                />
              </div>

              <div className='space-y-1.5'>
                <label htmlFor='editTotalWeight' className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                  Tổng khối lượng (kg) <span className='text-rose-500'>*</span>
                </label>
                <Input
                  id='editTotalWeight'
                  type='number'
                  min='1'
                  value={editTotalWeight}
                  onChange={(e) =>
                    setEditTotalWeight(e.target.value ? Number(e.target.value) : '')
                  }
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <label htmlFor='editTotalVolume' className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                  Tổng thể tích (m³) <span className='text-rose-500'>*</span>
                </label>
                <Input
                  id='editTotalVolume'
                  type='number'
                  step='0.01'
                  min='0.01'
                  value={editTotalVolume}
                  onChange={(e) =>
                    setEditTotalVolume(e.target.value ? Number(e.target.value) : '')
                  }
                  required
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <label htmlFor='editGoodsDesc' className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                Mô tả hàng hóa
              </label>
              <Input
                id='editGoodsDesc'
                placeholder='Mô tả quy cách, tính chất hàng...'
                value={editGoodsDesc}
                onChange={(e) => setEditGoodsDesc(e.target.value)}
              />
            </div>

            <div className='space-y-1.5'>
              <label htmlFor='editNotes' className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                Ghi chú điều vận
              </label>
              <Textarea
                id='editNotes'
                rows={3}
                placeholder='Ghi chú thêm cho đội xe...'
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsEditModalOpen(false)}
                disabled={submittingEdit}
              >
                Hủy
              </Button>
              <Button
                type='submit'
                disabled={submittingEdit}
                className='bg-blue-600 hover:bg-blue-700 text-white'
              >
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
