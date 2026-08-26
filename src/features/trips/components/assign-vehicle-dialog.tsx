'use client';

import { useState, useEffect, useMemo, useId } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  IconTruck,
  IconArrowsSplit,
  IconPlus,
  IconTrash,
  IconFileDescription,
  IconAlertCircle
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { CapacityGauge } from './capacity-gauge';
import { useCreateTripMutation, useCreateSplitTripsMutation } from '../api/mutations';
import type { Order } from '@/features/orders/api/types';
import type { Vehicle, Driver } from '@/features/fleet/api/types';
import type { SplitRow, CreateSplitTripsPayload } from '../api/types';

interface AssignVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  vehicles: Vehicle[];
  drivers: Driver[];
  onSuccess?: () => void;
}

export function AssignVehicleDialog({
  open,
  onOpenChange,
  order,
  vehicles,
  drivers,
  onSuccess
}: AssignVehicleDialogProps) {
  const [isSplitMode, setIsSplitMode] = useState(false);

  // Single trip state
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
  const [selectedDriverId, setSelectedDriverId] = useState<number | ''>('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('08:00');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [weightAllocated, setWeightAllocated] = useState<number | ''>('');
  const [volumeAllocated, setVolumeAllocated] = useState<number | ''>('');
  const [tripNotes, setTripNotes] = useState('');

  // Split trip state
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);

  const createTripMutation = useCreateTripMutation();
  const createSplitTripsMutation = useCreateSplitTripsMutation();

  const isSubmitting = createTripMutation.isPending || createSplitTripsMutation.isPending;

  // Initialize form whenever dialog opens with an order
  useEffect(() => {
    if (!open || !order) return;

    setIsSplitMode(false);

    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + 2);
    const formattedDelivery = deliveryDate.toISOString().split('T')[0];

    const initialVehicleId = vehicles[0]?.id || '';
    const initialDriverId = vehicles[0]?.assignedDriverId || drivers[0]?.id || '';

    setSelectedVehicleId(initialVehicleId);
    setSelectedDriverId(initialDriverId);
    setPickupDate(formattedToday);
    setPickupTime('08:00');
    setEstimatedDeliveryDate(formattedDelivery);
    setWeightAllocated(order.totalWeight);
    setVolumeAllocated(order.totalVolume);
    setTripNotes('');

    // Setup initial 2 split rows with 50/50 split
    const halfWeight = Math.round(order.totalWeight / 2);
    const halfVolume = Number((order.totalVolume / 2).toFixed(1));

    setSplitRows([
      {
        vehicleId: vehicles[0]?.id || '',
        driverId: vehicles[0]?.assignedDriverId || drivers[0]?.id || '',
        weightAllocated: halfWeight,
        volumeAllocated: halfVolume,
        pickupDate: formattedToday,
        pickupTime: '08:00',
        estimatedDeliveryDate: formattedDelivery,
        notes: 'Chuyến xe 1'
      },
      {
        vehicleId: vehicles[1]?.id || vehicles[0]?.id || '',
        driverId: vehicles[1]?.assignedDriverId || drivers[1]?.id || drivers[0]?.id || '',
        weightAllocated: order.totalWeight - halfWeight,
        volumeAllocated: Number((order.totalVolume - halfVolume).toFixed(1)),
        pickupDate: formattedToday,
        pickupTime: '08:00',
        estimatedDeliveryDate: formattedDelivery,
        notes: 'Chuyến xe 2'
      }
    ]);
  }, [open, order, vehicles, drivers]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === Number(selectedVehicleId));
  }, [vehicles, selectedVehicleId]);

  const splitTotalWeight = useMemo(() => {
    return splitRows.reduce((acc, row) => acc + (Number(row.weightAllocated) || 0), 0);
  }, [splitRows]);

  const splitTotalVolume = useMemo(() => {
    return Number(
      splitRows.reduce((acc, row) => acc + (Number(row.volumeAllocated) || 0), 0).toFixed(1)
    );
  }, [splitRows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    try {
      if (!isSplitMode) {
        if (!selectedVehicleId) {
          toast.error('Vui lòng chọn phương tiện vận chuyển');
          return;
        }

        await createTripMutation.mutateAsync({
          orderId: order.id,
          vehicleId: Number(selectedVehicleId),
          driverId: selectedDriverId ? Number(selectedDriverId) : undefined,
          pickupDate: pickupDate || undefined,
          pickupTime: pickupTime || undefined,
          estimatedDeliveryDate: estimatedDeliveryDate || undefined,
          weightAllocated: Number(weightAllocated) || order.totalWeight,
          volumeAllocated: Number(volumeAllocated) || order.totalVolume,
          sequenceNumber: 1,
          notes: tripNotes || undefined
        });

        toast.success(`Đã phân công xe cho đơn hàng ${order.orderCode}`);
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
          orderId: order.id,
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

        await createSplitTripsMutation.mutateAsync(payload);
        toast.success(`Đã chia đơn ${order.orderCode} sang ${splitRows.length} chuyến xe!`);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(apiMessage || 'Lỗi khi phân công chuyến xe. Vui lòng thử lại.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <IconTruck className='h-5 w-5 text-blue-600' />
              <span>
                Phân Công Xe Cho Đơn:{' '}
                <strong className='font-mono text-blue-600'>{order?.orderCode}</strong>
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {order && (
          <div className='space-y-4 pt-1'>
            {/* Order quick info */}
            <div className='p-3.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-2.5 border border-slate-200/80 dark:border-slate-800'>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
                <div>
                  <span className='text-slate-400 block font-medium'>Tuyến đường</span>
                  <span className='font-semibold text-slate-800 dark:text-slate-200'>
                    {order.originHub?.split(' ')[0]} &rarr; {order.destinationHub?.split(' ')[0]}
                  </span>
                </div>
                <div>
                  <span className='text-slate-400 block font-medium'>Tổng khối lượng</span>
                  <span className='font-mono font-bold text-slate-800 dark:text-slate-200'>
                    {order.totalWeight.toLocaleString()} kg
                  </span>
                </div>
                <div>
                  <span className='text-slate-400 block font-medium'>Tổng thể tích</span>
                  <span className='font-mono font-bold text-slate-800 dark:text-slate-200'>
                    {order.totalVolume} m³
                  </span>
                </div>
                <div>
                  <span className='text-slate-400 block font-medium'>Kho nhận</span>
                  <span className='font-semibold text-slate-800 dark:text-slate-200 truncate block'>
                    {order.destinationHub}
                  </span>
                </div>
              </div>

              {order.goodsDescription && (
                <div className='pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs flex items-start gap-1.5'>
                  <span className='text-slate-400 font-medium shrink-0'>Loại hàng / Mô tả:</span>
                  <span className='text-slate-700 dark:text-slate-300 font-medium'>
                    {order.goodsDescription}
                  </span>
                </div>
              )}
            </div>

            {/* Highlighted Dispatch Note Banner */}
            {order.notes ? (
              <div className='p-3.5 bg-gradient-to-r from-amber-50 via-amber-50 to-amber-100/60 dark:from-amber-950/60 dark:via-amber-950/40 dark:to-amber-900/40 border-2 border-amber-400 dark:border-amber-500 rounded-xl shadow-xs space-y-2 animate-in fade-in duration-200'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs uppercase tracking-wide'>
                    <IconFileDescription className='h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0' />
                    <span>Ghi Chú Điều Vận (Từ Lệnh Điều Hành)</span>
                  </div>
                  <Badge
                    variant='outline'
                    className='bg-amber-100 dark:bg-amber-900/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider'
                  >
                    Lưu ý quan trọng
                  </Badge>
                </div>
                <div className='text-sm font-semibold text-amber-950 dark:text-amber-100 whitespace-pre-wrap bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-amber-200 dark:border-amber-800/80 shadow-2xs leading-relaxed'>
                  {order.notes}
                </div>
              </div>
            ) : (
              <div className='p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400'>
                <IconFileDescription className='h-4 w-4 text-slate-400 shrink-0' />
                <span>
                  <strong className='font-semibold text-slate-600 dark:text-slate-300'>
                    Ghi chú điều vận:
                  </strong>{' '}
                  <span className='italic text-slate-400'>
                    Không có ghi chú đặc biệt từ Điều hành
                  </span>
                </span>
              </div>
            )}

            {/* External vehicle notice */}
            {order.isExternalVehicleNeeded && (
              <div className='p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2'>
                <IconAlertCircle className='h-4 w-4 text-amber-600 shrink-0' />
                <div>
                  <strong>Yêu cầu xe thuê ngoài:</strong>{' '}
                  {order.externalNote ||
                    'Đơn hàng này được yêu cầu điều động xe đối tác bên ngoài.'}
                </div>
              </div>
            )}

            {/* Mode Switcher */}
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
                className={`cursor-pointer ${isSplitMode ? 'bg-blue-600 text-white' : ''}`}
              >
                {isSplitMode ? 'Đang chia nhiều xe' : 'Chuyển sang Split'}
              </Button>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4'>
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
                        className='w-full px-3 py-2 text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer'
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
                        className='w-full px-3 py-2 text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer'
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

                  {/* Real-time Capacity Gauge */}
                  <CapacityGauge
                    allocatedWeight={Number(weightAllocated) || order.totalWeight}
                    allocatedVolume={Number(volumeAllocated) || order.totalVolume}
                    vehicle={selectedVehicle}
                  />

                  {/* Schedule */}
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
                        className='cursor-pointer'
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
                        className='cursor-pointer'
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
                        className='cursor-pointer'
                      />
                    </div>
                  </div>

                  {/* Trip Notes */}
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
                /* Split Shipment Rows */
                <div className='space-y-3'>
                  <div className='flex items-center justify-between text-xs p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium'>
                    <span>
                      Tổng phân bổ:{' '}
                      <strong className='font-mono text-blue-600'>
                        {splitTotalWeight.toLocaleString()} / {order.totalWeight.toLocaleString()}{' '}
                        kg
                      </strong>
                    </span>
                    <span>
                      Thể tích:{' '}
                      <strong className='font-mono text-blue-600'>
                        {splitTotalVolume} / {order.totalVolume} m³
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
                              className='h-6 px-2 text-rose-500 hover:text-rose-700 cursor-pointer'
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
                                const v = vehicles.find(
                                  (item) => item.id === Number(e.target.value)
                                );
                                if (v?.assignedDriverId) {
                                  updated[idx].driverId = v.assignedDriverId;
                                }
                                setSplitRows(updated);
                              }}
                              className='w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none cursor-pointer'
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
                              className='w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none cursor-pointer'
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
                              className='h-8 text-xs cursor-pointer'
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
                              className='h-8 text-xs cursor-pointer'
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
                            pickupDate: pickupDate || '',
                            pickupTime: '08:00',
                            estimatedDeliveryDate: estimatedDeliveryDate || '',
                            notes: `Chuyến xe ${splitRows.length + 1}`
                          }
                        ])
                      }
                      className='w-full text-xs border-dashed cursor-pointer'
                    >
                      <IconPlus className='h-3.5 w-3.5 mr-1' /> Thêm xe chở hàng ({splitRows.length}
                      /5)
                    </Button>
                  )}
                </div>
              )}

              <DialogFooter className='pt-3'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className='cursor-pointer'
                >
                  Hủy
                </Button>
                <Button
                  type='submit'
                  disabled={isSubmitting}
                  className='bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 cursor-pointer'
                >
                  {isSubmitting ? 'Đang lưu...' : 'Xác nhận phân công'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
