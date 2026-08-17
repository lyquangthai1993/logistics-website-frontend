'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { tripsApi, Trip, CreateSplitTripsPayload } from '@/features/trips/api';
import { ordersApi, Order } from '@/features/orders/api';
import { fleetApi, Vehicle, Driver } from '@/features/fleet/api';
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
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  IconTruck,
  IconCheck,
  IconAlertTriangle,
  IconPlus,
  IconTrash,
  IconArrowsSplit,
  IconSearch,
  IconClock,
  IconCircleCheck,
  IconAlertCircle,
  IconTruckOff
} from '@tabler/icons-react';
import { toast } from 'sonner';

interface SplitRow {
  vehicleId: number | '';
  driverId: number | '';
  weightAllocated: number | '';
  volumeAllocated: number | '';
  pickupDate: string;
  pickupTime: string;
  estimatedDeliveryDate: string;
  notes: string;
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending-orders' | 'all-trips'>('pending-orders');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal assign vehicle state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal No Vehicle state
  const [isNoVehicleModalOpen, setIsNoVehicleModalOpen] = useState(false);
  const [noVehicleOrder, setNoVehicleOrder] = useState<Order | null>(null);
  const [noVehicleReasonCategory, setNoVehicleReasonCategory] = useState('BUSY');
  const [noVehicleCustomReason, setNoVehicleCustomReason] = useState('');
  const [submittingNoVehicle, setSubmittingNoVehicle] = useState(false);

  // Single Trip form states
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
  const [selectedDriverId, setSelectedDriverId] = useState<number | ''>('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('08:00');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [weightAllocated, setWeightAllocated] = useState<number | ''>('');
  const [volumeAllocated, setVolumeAllocated] = useState<number | ''>('');
  const [tripNotes, setTripNotes] = useState('');

  // Split Trip form rows
  const [splitRows, setSplitRows] = useState<SplitRow[]>([
    {
      vehicleId: '',
      driverId: '',
      weightAllocated: '',
      volumeAllocated: '',
      pickupDate: '',
      pickupTime: '08:00',
      estimatedDeliveryDate: '',
      notes: ''
    },
    {
      vehicleId: '',
      driverId: '',
      weightAllocated: '',
      volumeAllocated: '',
      pickupDate: '',
      pickupTime: '08:00',
      estimatedDeliveryDate: '',
      notes: ''
    }
  ]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [tripsData, ordersData, vehiclesData, driversData] = await Promise.all([
        tripsApi.getTrips(),
        ordersApi.getOrders(),
        fleetApi.getVehicles(),
        fleetApi.getDrivers()
      ]);
      setTrips(tripsData);
      setOrders(ordersData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
    } catch (err: unknown) {
      toast.error('Không thể tải dữ liệu điều phối', {
        description: (err as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Pending orders for Fleet to assign
  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'PENDING_FLEET' || o.status === 'NO_VEHICLE');
  }, [orders]);

  // Open Assignment Modal
  const handleOpenAssignModal = (order: Order) => {
    setSelectedOrder(order);
    setIsSplitMode(false);

    // Auto set defaults
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + 2);
    const formattedDelivery = deliveryDate.toISOString().split('T')[0];

    setPickupDate(formattedToday);
    setPickupTime('08:00');
    setEstimatedDeliveryDate(formattedDelivery);
    setWeightAllocated(order.totalWeight);
    setVolumeAllocated(order.totalVolume);
    setSelectedVehicleId(vehicles[0]?.id || '');
    setSelectedDriverId(drivers[0]?.id || '');
    setTripNotes('');

    // Setup split rows
    const halfWeight = Math.round(order.totalWeight / 2);
    const halfVolume = Number((order.totalVolume / 2).toFixed(1));
    setSplitRows([
      {
        vehicleId: vehicles[0]?.id || '',
        driverId: drivers[0]?.id || '',
        weightAllocated: halfWeight,
        volumeAllocated: halfVolume,
        pickupDate: formattedToday,
        pickupTime: '08:00',
        estimatedDeliveryDate: formattedDelivery,
        notes: 'Chuyến xe 1'
      },
      {
        vehicleId: vehicles[1]?.id || '',
        driverId: drivers[1]?.id || '',
        weightAllocated: order.totalWeight - halfWeight,
        volumeAllocated: Number((order.totalVolume - halfVolume).toFixed(1)),
        pickupDate: formattedToday,
        pickupTime: '08:00',
        estimatedDeliveryDate: formattedDelivery,
        notes: 'Chuyến xe 2'
      }
    ]);

    setIsAssignModalOpen(true);
  };

  // Mark No Vehicle Modal Handlers
  const handleOpenNoVehicleModal = (order: Order) => {
    setNoVehicleOrder(order);
    setNoVehicleReasonCategory('BUSY');
    setNoVehicleCustomReason('');
    setIsNoVehicleModalOpen(true);
  };

  const handleConfirmNoVehicle = async () => {
    if (!noVehicleOrder) return;
    try {
      setSubmittingNoVehicle(true);
      const reasonLabels: Record<string, string> = {
        BUSY: 'Toàn bộ xe nội bộ phù hợp đang trong lộ trình vận chuyển',
        MAINTENANCE: 'Xe đang trong kế hoạch bảo dưỡng, kiểm định kỹ thuật',
        OVER_CAPACITY: 'Khối lượng / thể tích vượt quá tải trọng của xe khả dụng',
        HUB_UNAVAILABLE: 'Không có xe khả dụng tại Hub xuất phát này',
        CUSTOM: 'Khác'
      };
      const baseReason = reasonLabels[noVehicleReasonCategory] || 'Hết xe';
      const finalReason = noVehicleCustomReason.trim()
        ? `${baseReason}. Chi tiết: ${noVehicleCustomReason.trim()}`
        : baseReason;

      await ordersApi.markNoVehicle(noVehicleOrder.id, finalReason);
      toast.warning(`Đã báo hết xe cho đơn ${noVehicleOrder.orderCode}`, {
        description: 'Bộ phận Điều phối (Dispatcher) đã được cập nhật để chủ động thuê xe ngoài.'
      });
      setIsNoVehicleModalOpen(false);
      setNoVehicleOrder(null);
      loadAllData();
    } catch (err: unknown) {
      toast.error('Lỗi cập nhật trạng thái hết xe', {
        description: (err as Error).message
      });
    } finally {
      setSubmittingNoVehicle(false);
    }
  };

  // Submit Trip Assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      setSubmitting(true);

      if (!isSplitMode) {
        if (!selectedVehicleId) {
          toast.error('Vui lòng chọn phương tiện vận chuyển');
          return;
        }
        await tripsApi.createTrip({
          orderId: selectedOrder.id,
          vehicleId: Number(selectedVehicleId),
          driverId: selectedDriverId ? Number(selectedDriverId) : undefined,
          pickupDate: pickupDate || undefined,
          pickupTime: pickupTime || undefined,
          estimatedDeliveryDate: estimatedDeliveryDate || undefined,
          weightAllocated: Number(weightAllocated) || selectedOrder.totalWeight,
          volumeAllocated: Number(volumeAllocated) || selectedOrder.totalVolume,
          sequenceNumber: 1,
          notes: tripNotes || undefined
        });
        toast.success(`Đã phân công xe cho đơn hàng ${selectedOrder.orderCode}`);
      } else {
        // Split shipment validation
        for (let i = 0; i < splitRows.length; i++) {
          if (!splitRows[i].vehicleId) {
            toast.error(`Vui lòng chọn xe cho chuyến thứ ${i + 1}`);
            return;
          }
          if (!splitRows[i].weightAllocated || Number(splitRows[i].weightAllocated) <= 0) {
            toast.error(`Khối lượng chuyến ${i + 1} phải lớn hơn 0`);
            return;
          }
        }

        const payload: CreateSplitTripsPayload = {
          orderId: selectedOrder.id,
          trips: splitRows.map((r) => ({
            vehicleId: Number(r.vehicleId),
            driverId: r.driverId ? Number(r.driverId) : undefined,
            pickupDate: r.pickupDate || undefined,
            pickupTime: r.pickupTime || undefined,
            estimatedDeliveryDate: r.estimatedDeliveryDate || undefined,
            weightAllocated: Number(r.weightAllocated),
            volumeAllocated: Number(r.volumeAllocated),
            notes: r.notes || undefined
          }))
        };

        await tripsApi.createSplitTrips(payload);
        toast.success(`Đã chia đơn ${selectedOrder.orderCode} sang ${splitRows.length} chuyến xe!`);
      }

      setIsAssignModalOpen(false);
      loadAllData();
    } catch (err: unknown) {
      toast.error('Lỗi khi phân công chuyến xe', {
        description: (err as Error).message
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Trip action (Fleet confirms trip)
  const handleConfirmTrip = async (tripId: number) => {
    try {
      await tripsApi.confirmTrip(tripId);
      toast.success('Xác nhận chuyến xe thành công!', {
        description: 'Đã cập nhật trạng thái và tự động gửi thông báo đến Inbound Kho.'
      });
      loadAllData();
    } catch (err: unknown) {
      toast.error('Không thể xác nhận chuyến xe', {
        description: (err as Error).message
      });
    }
  };

  // Split calculation metrics
  const splitTotalWeight = useMemo(() => {
    return splitRows.reduce((acc, row) => acc + (Number(row.weightAllocated) || 0), 0);
  }, [splitRows]);

  const splitTotalVolume = useMemo(() => {
    return Number(
      splitRows.reduce((acc, row) => acc + (Number(row.volumeAllocated) || 0), 0).toFixed(1)
    );
  }, [splitRows]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === Number(selectedVehicleId));
  }, [vehicles, selectedVehicleId]);

  return (
    <div className='flex-1 space-y-6 p-4 md:p-8 pt-6'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
        <div>
          <h2 className='text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100'>
            Phân Công Xe & Quản Lý Chuyến
          </h2>
          <p className='text-sm text-slate-500 dark:text-slate-400 mt-1'>
            Tiếp nhận yêu cầu điều vận từ Dispatcher, phân bổ xe nội bộ/thuê ngoài và chia chuyến
            vận tải.
          </p>
        </div>

        <Link href='/dashboard/fleet'>
          <Button variant='outline' className='self-start md:self-auto'>
            <IconTruck className='mr-2 h-4 w-4' /> Quản lý đội xe
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-blue-600 dark:text-blue-400'>
              Đơn hàng cần phân xe
            </CardTitle>
            <IconClock className='h-4 w-4 text-blue-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
              {pendingOrders.length}
            </div>
            <p className='text-xs text-slate-500 mt-1'>Đang chờ Fleet xử lý</p>
          </CardContent>
        </Card>

        <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-emerald-600 dark:text-emerald-400'>
              Chuyến xe đã xác nhận
            </CardTitle>
            <IconCircleCheck className='h-4 w-4 text-emerald-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
              {trips.filter((t) => t.status === 'CONFIRMED' || t.status === 'IN_TRANSIT').length}
            </div>
            <p className='text-xs text-slate-500 mt-1'>Đã thông báo đến Kho</p>
          </CardContent>
        </Card>

        <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-amber-600 dark:text-amber-400'>
              Xe thuê ngoài (External)
            </CardTitle>
            <IconTruck className='h-4 w-4 text-amber-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-amber-600 dark:text-amber-400'>
              {vehicles.filter((v) => v.isExternal).length}
            </div>
            <p className='text-xs text-slate-500 mt-1'>Xe đối tác khả dụng</p>
          </CardContent>
        </Card>

        <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-rose-600 dark:text-rose-400'>
              Đơn báo không có xe
            </CardTitle>
            <IconAlertTriangle className='h-4 w-4 text-rose-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-rose-600 dark:text-rose-400'>
              {orders.filter((o) => o.status === 'NO_VEHICLE').length}
            </div>
            <p className='text-xs text-slate-500 mt-1'>Cần Dispatcher thuê xe ngoài</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'pending-orders' | 'all-trips')}
        className='space-y-4'
      >
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <TabsList className='bg-slate-100 dark:bg-slate-800'>
            <TabsTrigger value='pending-orders' className='relative'>
              Đơn Cần Phân Xe
              {pendingOrders.length > 0 && (
                <span className='ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white'>
                  {pendingOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value='all-trips'>Danh Sách Chuyến Xe ({trips.length})</TabsTrigger>
          </TabsList>

          <div className='relative max-w-xs w-full'>
            <IconSearch className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
            <Input
              placeholder='Tìm kiếm mã đơn / biển số...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-9 bg-slate-50/50 dark:bg-slate-900 text-sm'
            />
          </div>
        </div>

        {/* Tab 1: Pending Orders for Assignment */}
        <TabsContent value='pending-orders' className='space-y-4'>
          <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
            <CardHeader className='pb-3 border-b border-slate-100 dark:border-slate-800'>
              <CardTitle className='text-base font-semibold text-slate-900 dark:text-slate-100'>
                Danh Sách Đơn Hàng Chờ Phân Bổ Phương Tiện
              </CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {loading ? (
                <div className='p-8 text-center text-slate-400'>Đang tải danh sách đơn hàng...</div>
              ) : pendingOrders.length === 0 ? (
                <div className='p-12 text-center text-slate-400 space-y-2'>
                  <IconCircleCheck className='h-10 w-10 text-emerald-500 mx-auto' />
                  <p className='font-medium text-slate-700 dark:text-slate-300'>
                    Tuyệt vời! Hiện không có đơn hàng nào chờ phân xe.
                  </p>
                  <p className='text-xs text-slate-500'>
                    Tất cả đơn hàng đã được bố trí phương tiện vận tải đầy đủ.
                  </p>
                </div>
              ) : (
                <div className='divide-y divide-slate-200 dark:divide-slate-800'>
                  {pendingOrders.map((order) => (
                    <div
                      key={order.id}
                      className='p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors'
                    >
                      <div className='space-y-1.5 flex-1'>
                        <div className='flex items-center gap-2'>
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
                            onClick={() => handleOpenNoVehicleModal(order)}
                            className='text-xs text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900 cursor-pointer'
                          >
                            <IconAlertTriangle className='h-3.5 w-3.5 mr-1' />
                            Báo hết xe
                          </Button>
                        )}

                        <Button
                          size='sm'
                          data-testid={`btn-assign-order-${order.orderCode}`}
                          onClick={() => handleOpenAssignModal(order)}
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
          </Card>
        </TabsContent>

        {/* Tab 2: All Trips */}
        <TabsContent value='all-trips' className='space-y-4'>
          <Card className='shadow-sm border-slate-200/80 dark:border-slate-800 overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium'>
                  <tr>
                    <th className='py-3 px-4'>Chuyến xe / Mã đơn</th>
                    <th className='py-3 px-4'>Phương tiện</th>
                    <th className='py-3 px-4'>Tài xế</th>
                    <th className='py-3 px-4'>Khối lượng / m³</th>
                    <th className='py-3 px-4'>Lịch trình</th>
                    <th className='py-3 px-4'>Trạng thái</th>
                    <th className='py-3 px-4 text-right'>Thao tác</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-200 dark:divide-slate-800'>
                  {trips.length === 0 ? (
                    <tr>
                      <td colSpan={7} className='text-center py-12 text-slate-400'>
                        Chưa có chuyến xe nào được tạo.
                      </td>
                    </tr>
                  ) : (
                    trips.map((trip) => {
                      const isExternal = trip.vehicle?.isExternal;
                      return (
                        <tr
                          key={trip.id}
                          className='hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors'
                        >
                          <td className='py-3.5 px-4'>
                            <div className='font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5'>
                              <span>Chuyến #{trip.sequenceNumber || trip.id}</span>
                              {isExternal && (
                                <Badge className='bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold'>
                                  Xe ngoài
                                </Badge>
                              )}
                            </div>
                            <span className='text-xs font-mono text-blue-600 dark:text-blue-400 block mt-0.5'>
                              {trip.order?.orderCode || `Đơn #${trip.orderId}`}
                            </span>
                          </td>

                          <td className='py-3.5 px-4 text-slate-800 dark:text-slate-200'>
                            <div className='font-mono font-semibold'>
                              {trip.vehicle?.licensePlate || '—'}
                            </div>
                            <span className='text-xs text-slate-400 block'>
                              {isExternal ? (
                                <span className='text-amber-600 font-medium'>
                                  {trip.vehicle?.externalProvider || 'Xe thuê ngoài'}
                                </span>
                              ) : (
                                trip.vehicle?.type || 'Xe nội bộ'
                              )}
                            </span>
                          </td>

                          <td className='py-3.5 px-4 text-slate-800 dark:text-slate-200'>
                            <div className='font-medium'>{trip.driver?.fullName || 'Chưa gán'}</div>
                            <span className='text-xs text-slate-400'>
                              {trip.driver?.phone || '—'}
                            </span>
                          </td>

                          <td className='py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300'>
                            <div>{trip.weightAllocated.toLocaleString()} kg</div>
                            <span className='text-xs text-slate-400'>
                              {trip.volumeAllocated} m³
                            </span>
                          </td>

                          <td className='py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400'>
                            <div>
                              Lấy: {trip.pickupDate || 'N/A'} {trip.pickupTime || ''}
                            </div>
                            <div>Đích: {trip.estimatedDeliveryDate || 'N/A'}</div>
                          </td>

                          <td className='py-3.5 px-4'>
                            {trip.status === 'CONFIRMED' ? (
                              <Badge
                                variant='secondary'
                                className='bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                              >
                                Đã xác nhận
                              </Badge>
                            ) : trip.status === 'IN_TRANSIT' ? (
                              <Badge
                                variant='secondary'
                                className='bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                              >
                                Đang chạy
                              </Badge>
                            ) : (
                              <Badge
                                variant='secondary'
                                className='bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                              >
                                Chờ xác nhận
                              </Badge>
                            )}
                          </td>

                          <td className='py-3.5 px-4 text-right'>
                            {trip.status === 'PENDING' && (
                              <Button
                                size='sm'
                                onClick={() => handleConfirmTrip(trip.id)}
                                className='bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2.5'
                              >
                                <IconCheck className='h-3.5 w-3.5 mr-1' />
                                Xác nhận Trip
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal / Sheet Phân Công Xe & Split Shipment */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className='sm:max-w-3xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <IconTruck className='h-5 w-5 text-blue-600' />
                <span>
                  Phân Công Xe Cho Đơn:{' '}
                  <strong className='font-mono text-blue-600'>{selectedOrder?.orderCode}</strong>
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className='space-y-4 pt-1'>
              {/* Order quick info */}
              <div className='p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 border border-slate-200/60 dark:border-slate-800'>
                <div>
                  <span className='text-slate-400 block'>Tuyến đường</span>
                  <span className='font-semibold text-slate-800 dark:text-slate-200'>
                    {selectedOrder.originHub?.split(' ')[0]} &rarr;{' '}
                    {selectedOrder.destinationHub?.split(' ')[0]}
                  </span>
                </div>
                <div>
                  <span className='text-slate-400 block'>Tổng khối lượng</span>
                  <span className='font-mono font-bold text-slate-800 dark:text-slate-200'>
                    {selectedOrder.totalWeight.toLocaleString()} kg
                  </span>
                </div>
                <div>
                  <span className='text-slate-400 block'>Tổng thể tích</span>
                  <span className='font-mono font-bold text-slate-800 dark:text-slate-200'>
                    {selectedOrder.totalVolume} m³
                  </span>
                </div>
                <div>
                  <span className='text-slate-400 block'>Kho nhận</span>
                  <span className='font-semibold text-slate-800 dark:text-slate-200 truncate block'>
                    {selectedOrder.destinationHub}
                  </span>
                </div>
              </div>

              {/* Mode Toggle: Single vs Split Shipment */}
              <div className='flex items-center justify-between p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 rounded-lg'>
                <div className='space-y-0.5'>
                  <div className='text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5'>
                    <IconArrowsSplit className='h-4 w-4' />
                    Chia nhiều xe (Split Shipment)
                  </div>
                  <p className='text-xs text-blue-700/80 dark:text-blue-300'>
                    Bật chế độ này nếu đơn hàng cần chia tải trọng chở bằng 2 - 5 xe.
                  </p>
                </div>
                <Button
                  type='button'
                  variant={isSplitMode ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setIsSplitMode(!isSplitMode)}
                  className={isSplitMode ? 'bg-blue-600 text-white' : ''}
                >
                  {isSplitMode ? 'Đang chia nhiều xe' : 'Chuyển sang Split'}
                </Button>
              </div>

              <form onSubmit={handleSaveAssignment} className='space-y-4'>
                {!isSplitMode ? (
                  /* Single Assignment Form */
                  <div className='space-y-4'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      {/* Select Vehicle */}
                      <div className='space-y-1.5'>
                        <label
                          htmlFor='select-trip-vehicle'
                          className='text-sm font-semibold text-slate-700 dark:text-slate-300'
                        >
                          Chọn Phương Tiện (Xe) <span className='text-rose-500'>*</span>
                        </label>
                        <select
                          id='select-trip-vehicle'
                          value={selectedVehicleId}
                          onChange={(e) => {
                            const vId = Number(e.target.value);
                            setSelectedVehicleId(vId);
                            const v = vehicles.find((item) => item.id === vId);
                            if (v?.assignedDriverId) {
                              setSelectedDriverId(v.assignedDriverId);
                            }
                          }}
                          className='w-full px-3 py-2 text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400'
                          required
                        >
                          <option value=''>-- Chọn xe --</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.licensePlate} ({v.type}) - Max {v.maxWeight.toLocaleString()}kg
                              {v.isExternal
                                ? ` [🚛 XE NGOÀI: ${v.externalProvider || 'Đối tác'}]`
                                : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Select Driver */}
                      <div className='space-y-1.5'>
                        <label
                          htmlFor='select-trip-driver'
                          className='text-sm font-semibold text-slate-700 dark:text-slate-300'
                        >
                          Chọn Tài Xế
                        </label>
                        <select
                          id='select-trip-driver'
                          value={selectedDriverId}
                          onChange={(e) =>
                            setSelectedDriverId(e.target.value ? Number(e.target.value) : '')
                          }
                          className='w-full px-3 py-2 text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400'
                        >
                          <option value=''>-- Chọn tài xế --</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.fullName} ({d.phone}) - Hạng {d.licenseClass}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Highlight if selected vehicle is external */}
                    {selectedVehicle?.isExternal && (
                      <div className='p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 rounded-lg flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 font-medium'>
                        <IconAlertCircle className='h-4 w-4 text-amber-600 shrink-0' />
                        <span>
                          <strong>🚛 XE THUÊ NGOÀI:</strong> Xe này thuộc nhà xe đối tác{' '}
                          <span className='underline font-bold'>
                            {selectedVehicle.externalProvider || 'Đối tác ngoài'}
                          </span>
                          . Khi xác nhận, hệ thống sẽ gửi thông báo đến các bên liên quan.
                        </span>
                      </div>
                    )}

                    {/* Real-time Capacity Gauge */}
                    {selectedVehicle && (
                      <div className='p-3 bg-slate-50 dark:bg-slate-900/80 rounded-lg border border-slate-200/70 dark:border-slate-800 space-y-2'>
                        <div className='flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300'>
                          <span>Mức độ tải trọng xe (Capacity Utilization)</span>
                          <span className='font-mono'>
                            {selectedOrder.totalWeight.toLocaleString()} /{' '}
                            {selectedVehicle.maxWeight.toLocaleString()} kg (
                            {Math.round(
                              (selectedOrder.totalWeight / selectedVehicle.maxWeight) * 100
                            )}
                            %)
                          </span>
                        </div>
                        <div className='w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden'>
                          <div
                            className={`h-full transition-all ${
                              selectedOrder.totalWeight > selectedVehicle.maxWeight
                                ? 'bg-rose-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (selectedOrder.totalWeight / selectedVehicle.maxWeight) * 100
                                )
                              )}%`
                            }}
                          />
                        </div>
                        {selectedOrder.totalWeight > selectedVehicle.maxWeight && (
                          <p className='text-[11px] text-rose-500 font-medium flex items-center gap-1'>
                            <IconAlertTriangle className='h-3.5 w-3.5' />
                            Cảnh báo: Khối lượng đơn vượt quá tải trọng xe. Khuyến nghị bật Split
                            Shipment để chia tải.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Schedule: Pickup date/time & ETA */}
                    <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                      <div className='space-y-1.5'>
                        <label
                          htmlFor='trip-pickup-date'
                          className='text-xs font-semibold text-slate-700 dark:text-slate-300'
                        >
                          Ngày lấy hàng
                        </label>
                        <Input
                          id='trip-pickup-date'
                          type='date'
                          value={pickupDate}
                          onChange={(e) => setPickupDate(e.target.value)}
                        />
                      </div>

                      <div className='space-y-1.5'>
                        <label
                          htmlFor='trip-pickup-time'
                          className='text-xs font-semibold text-slate-700 dark:text-slate-300'
                        >
                          Giờ lấy hàng
                        </label>
                        <Input
                          id='trip-pickup-time'
                          type='time'
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                        />
                      </div>

                      <div className='space-y-1.5'>
                        <label
                          htmlFor='trip-eta-date'
                          className='text-xs font-semibold text-slate-700 dark:text-slate-300'
                        >
                          Dự kiến đến kho
                        </label>
                        <Input
                          id='trip-eta-date'
                          type='date'
                          value={estimatedDeliveryDate}
                          onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Ghi chú */}
                    <div className='space-y-1.5'>
                      <label
                        htmlFor='trip-notes-input'
                        className='text-xs font-semibold text-slate-700 dark:text-slate-300'
                      >
                        Ghi chú chuyến xe
                      </label>
                      <Textarea
                        id='trip-notes-input'
                        rows={2}
                        placeholder='Ghi chú thêm cho tài xế hoặc thủ kho (yêu cầu niêm phong chì, kiểm đếm kỹ, giờ giao nhận...)'
                        value={tripNotes}
                        onChange={(e) => setTripNotes(e.target.value)}
                        className='resize-y'
                      />
                    </div>
                  </div>
                ) : (
                  /* Split Shipment Rows Table */
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between text-xs p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium'>
                      <span>
                        Tổng phân bổ:{' '}
                        <strong className='font-mono text-blue-600'>
                          {splitTotalWeight.toLocaleString()} /{' '}
                          {selectedOrder.totalWeight.toLocaleString()} kg
                        </strong>
                      </span>
                      <span>
                        Thể tích:{' '}
                        <strong className='font-mono text-blue-600'>
                          {splitTotalVolume} / {selectedOrder.totalVolume} m³
                        </strong>
                      </span>
                    </div>

                    <div className='space-y-3'>
                      {splitRows.map((row, idx) => (
                        <div
                          key={idx}
                          className='p-3 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 bg-slate-50/50 dark:bg-slate-900/40'
                        >
                          <div className='flex items-center justify-between'>
                            <span className='text-xs font-bold text-slate-800 dark:text-slate-200'>
                              Xe #{idx + 1}
                            </span>
                            {splitRows.length > 2 && (
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => setSplitRows(splitRows.filter((_, i) => i !== idx))}
                                className='h-6 px-2 text-rose-500 hover:text-rose-700'
                              >
                                <IconTrash className='h-3 w-3 mr-1' /> Xóa xe này
                              </Button>
                            )}
                          </div>

                          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                            <div>
                              <label
                                htmlFor={`split-vehicle-${idx}`}
                                className='text-[11px] text-slate-500 font-medium'
                              >
                                Chọn xe
                              </label>
                              <select
                                id={`split-vehicle-${idx}`}
                                value={row.vehicleId}
                                onChange={(e) => {
                                  const updated = [...splitRows];
                                  updated[idx].vehicleId = Number(e.target.value);
                                  setSplitRows(updated);
                                }}
                                className='w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none'
                                required
                              >
                                <option value=''>-- Chọn xe --</option>
                                {vehicles.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.licensePlate} ({v.type}) {v.isExternal ? '[XE NGOÀI]' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor={`split-driver-${idx}`}
                                className='text-[11px] text-slate-500 font-medium'
                              >
                                Chọn tài xế
                              </label>
                              <select
                                id={`split-driver-${idx}`}
                                value={row.driverId}
                                onChange={(e) => {
                                  const updated = [...splitRows];
                                  updated[idx].driverId = e.target.value
                                    ? Number(e.target.value)
                                    : '';
                                  setSplitRows(updated);
                                }}
                                className='w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none'
                              >
                                <option value=''>-- Chọn tài xế --</option>
                                {drivers.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.fullName} ({d.phone})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                            <div>
                              <label
                                htmlFor={`split-weight-${idx}`}
                                className='text-[11px] text-slate-500 font-medium'
                              >
                                KL chở (kg)
                              </label>
                              <Input
                                id={`split-weight-${idx}`}
                                type='number'
                                min='1'
                                className='h-8 text-xs'
                                value={row.weightAllocated}
                                onChange={(e) => {
                                  const updated = [...splitRows];
                                  updated[idx].weightAllocated = e.target.value
                                    ? Number(e.target.value)
                                    : '';
                                  setSplitRows(updated);
                                }}
                                required
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`split-volume-${idx}`}
                                className='text-[11px] text-slate-500 font-medium'
                              >
                                Thể tích (m³)
                              </label>
                              <Input
                                id={`split-volume-${idx}`}
                                type='number'
                                step='0.1'
                                min='0.1'
                                className='h-8 text-xs'
                                value={row.volumeAllocated}
                                onChange={(e) => {
                                  const updated = [...splitRows];
                                  updated[idx].volumeAllocated = e.target.value
                                    ? Number(e.target.value)
                                    : '';
                                  setSplitRows(updated);
                                }}
                                required
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`split-pickup-${idx}`}
                                className='text-[11px] text-slate-500 font-medium'
                              >
                                Ngày lấy hàng
                              </label>
                              <Input
                                id={`split-pickup-${idx}`}
                                type='date'
                                className='h-8 text-xs'
                                value={row.pickupDate}
                                onChange={(e) => {
                                  const updated = [...splitRows];
                                  updated[idx].pickupDate = e.target.value;
                                  setSplitRows(updated);
                                }}
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`split-delivery-${idx}`}
                                className='text-[11px] text-slate-500 font-medium'
                              >
                                Dự kiến giao
                              </label>
                              <Input
                                id={`split-delivery-${idx}`}
                                type='date'
                                className='h-8 text-xs'
                                value={row.estimatedDeliveryDate}
                                onChange={(e) => {
                                  const updated = [...splitRows];
                                  updated[idx].estimatedDeliveryDate = e.target.value;
                                  setSplitRows(updated);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {splitRows.length < 5 && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setSplitRows([
                            ...splitRows,
                            {
                              vehicleId: '',
                              driverId: '',
                              weightAllocated: '',
                              volumeAllocated: '',
                              pickupDate: '',
                              pickupTime: '08:00',
                              estimatedDeliveryDate: '',
                              notes: `Chuyến xe ${splitRows.length + 1}`
                            }
                          ])
                        }
                        className='w-full text-xs border-dashed'
                      >
                        <IconPlus className='h-3.5 w-3.5 mr-1' /> Thêm xe chở hàng (
                        {splitRows.length}/5)
                      </Button>
                    )}
                  </div>
                )}

                <DialogFooter className='pt-3'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setIsAssignModalOpen(false)}
                    disabled={submitting}
                  >
                    Hủy
                  </Button>
                  <Button
                    type='submit'
                    disabled={submitting}
                    className='bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900'
                  >
                    {submitting ? 'Đang lưu...' : 'Xác nhận phân công'}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 🔴 DIALOG BÁO HẾT XE (NO VEHICLE AVAILABLE MODAL) */}
      <Dialog open={isNoVehicleModalOpen} onOpenChange={setIsNoVehicleModalOpen}>
        <DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <div className='flex items-center gap-3'>
              <div className='p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'>
                <IconTruckOff className='h-6 w-6' />
              </div>
              <div>
                <DialogTitle className='text-lg font-bold text-slate-900 dark:text-slate-100'>
                  Xác Nhận Báo Hết Xe Nội Bộ
                </DialogTitle>
                <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5'>
                  Thông báo cho người điều phối (Dispatcher) rằng Đội xe không thể bố trí phương
                  tiện nội bộ.
                </p>
              </div>
            </div>
          </DialogHeader>

          {noVehicleOrder && (
            <div className='space-y-4 pt-2'>
              {/* Order summary card */}
              <div className='p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='font-mono font-bold text-sm text-slate-900 dark:text-slate-100'>
                    {noVehicleOrder.orderCode}
                  </span>
                  <Badge
                    variant='outline'
                    className='bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-semibold'
                  >
                    Chờ phân xe
                  </Badge>
                </div>
                <div className='text-xs text-slate-600 dark:text-slate-300 font-medium'>
                  📍 Tuyến:{' '}
                  <span className='font-semibold'>
                    {noVehicleOrder.originHub} ➔ {noVehicleOrder.destinationHub}
                  </span>
                </div>
                <div className='flex items-center gap-4 text-xs text-slate-500 font-mono'>
                  <span>
                    ⚖️ Khối lượng:{' '}
                    <strong className='text-slate-700 dark:text-slate-300'>
                      {noVehicleOrder.totalWeight.toLocaleString()} kg
                    </strong>
                  </span>
                  <span>
                    📦 Thể tích:{' '}
                    <strong className='text-slate-700 dark:text-slate-300'>
                      {noVehicleOrder.totalVolume} m³
                    </strong>
                  </span>
                </div>
                {noVehicleOrder.goodsDescription && (
                  <div className='text-xs text-slate-500 italic truncate'>
                    Loại hàng: {noVehicleOrder.goodsDescription}
                  </div>
                )}
              </div>

              {/* Reason options */}
              <div className='space-y-2'>
                <div className='text-xs font-bold text-slate-700 dark:text-slate-300 block'>
                  Lý do không thể bố trí xe <span className='text-rose-500'>*</span>
                </div>
                <div className='space-y-1.5'>
                  {[
                    {
                      id: 'BUSY',
                      label: 'Toàn bộ xe nội bộ phù hợp đang trong lộ trình vận chuyển'
                    },
                    {
                      id: 'MAINTENANCE',
                      label: 'Xe đang trong kế hoạch bảo dưỡng, kiểm định kỹ thuật'
                    },
                    {
                      id: 'OVER_CAPACITY',
                      label: 'Khối lượng / thể tích vượt quá tải trọng của xe khả dụng'
                    },
                    { id: 'HUB_UNAVAILABLE', label: 'Không có xe khả dụng tại Hub xuất phát này' },
                    { id: 'CUSTOM', label: 'Lý do khác / Khuyến nghị điều xe ngoài cụ thể' }
                  ].map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        noVehicleReasonCategory === item.id
                          ? 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type='radio'
                        name='noVehicleReason'
                        value={item.id}
                        checked={noVehicleReasonCategory === item.id}
                        onChange={() => setNoVehicleReasonCategory(item.id)}
                        className='text-rose-600 focus:ring-rose-500 h-3.5 w-3.5'
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom reason / detail note */}
              <div className='space-y-1.5'>
                <label
                  htmlFor='no-vehicle-custom-reason'
                  className='text-xs font-semibold text-slate-700 dark:text-slate-300'
                >
                  Ghi chú chi tiết / Khuyến nghị gửi đến Người điều phối (Dispatcher):
                </label>
                <Textarea
                  id='no-vehicle-custom-reason'
                  rows={3}
                  value={noVehicleCustomReason}
                  onChange={(e) => setNoVehicleCustomReason(e.target.value)}
                  placeholder='VD: Toàn bộ xe tải 15T đang chạy tuyến Huế - SG đến 20/08. Đề nghị Dispatcher chủ động thuê xe ngoài để kịp tiến độ khách hàng...'
                  className='text-xs resize-none'
                />
              </div>

              {/* Informative advice banner */}
              <div className='p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1'>
                <div className='font-bold flex items-center gap-1.5'>
                  <span>💡 Hướng dẫn nghiệp vụ:</span>
                </div>
                <p className='text-[11px] leading-relaxed text-amber-700 dark:text-amber-400'>
                  Sau khi xác nhận, đơn hàng sẽ chuyển sang trạng thái{' '}
                  <strong>"Không có xe" (NO_VEHICLE)</strong>. Người điều phối sẽ nhận được phản hồi
                  để kịp thời liên hệ đối tác vận tải ngoài (External Fleet) hoặc đổi lịch trình.
                </p>
              </div>

              <DialogFooter className='pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsNoVehicleModalOpen(false)}
                  disabled={submittingNoVehicle}
                  className='cursor-pointer'
                >
                  Hủy bỏ
                </Button>
                <Button
                  type='button'
                  onClick={handleConfirmNoVehicle}
                  disabled={submittingNoVehicle}
                  className='bg-rose-600 hover:bg-rose-700 text-white cursor-pointer font-semibold'
                >
                  <IconAlertTriangle className='h-4 w-4 mr-1.5' />
                  {submittingNoVehicle ? 'Đang gửi...' : 'Xác nhận báo hết xe'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
