'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  IconTruck,
  IconPackage,
  IconX,
  IconLoader2,
  IconArrowRight,
  IconBuildingWarehouse,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { showApiErrorToast } from '@/lib/api-error';
import { useAuthStore } from '@/stores/use-auth-store';
import { useAvailableOutboundOrdersQuery } from '../api/trip-manifest';

export type AppendOrderModalMode = 'ROADSIDE_INBOUND' | 'HUB_OUTBOUND';

interface WarehouseAppendOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripCode: string;
  licensePlate: string;
  mode?: AppendOrderModalMode;
  downstreamHubs?: Array<{ id: number; name: string }>;
  onSuccess?: () => void;
}

export function WarehouseAppendOrderModal({
  isOpen,
  onClose,
  tripCode,
  licensePlate,
  mode = 'ROADSIDE_INBOUND',
  downstreamHubs: initialDownstreamHubs,
  onSuccess,
}: WarehouseAppendOrderModalProps) {
  const user = useAuthStore((state) => state.user);
  const currentHubName = user?.hub?.name || 'Kho hiện tại';
  const currentHubId = user?.hub?.id;

  const isHubOutbound = mode === 'HUB_OUTBOUND';

  // Fetch available outbound orders & route stops when in HUB_OUTBOUND mode
  const { data: availableData, isLoading: isLoadingAvailable } =
    useAvailableOutboundOrdersQuery(tripCode, isOpen && isHubOutbound);

  const [allHubs, setAllHubs] = useState<Array<{ id: number; name: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sub-mode for HUB_OUTBOUND: 'SELECT_EXISTING' | 'CREATE_NEW'
  const [outboundSource, setOutboundSource] = useState<'SELECT_EXISTING' | 'CREATE_NEW'>('CREATE_NEW');
  const [selectedExistingOrderId, setSelectedExistingOrderId] = useState<string>('');

  // Form fields
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationHubId, setDestinationHubId] = useState<number | ''>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [province, setProvince] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [totalQuantity, setTotalQuantity] = useState<number>(1);
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [accompanyingDocs, setAccompanyingDocs] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch all hubs once for fallback
  useEffect(() => {
    if (isOpen && isHubOutbound && allHubs.length === 0) {
      apiClient
        .get('/api/v1/hubs')
        .then((res: any) => {
          const list = Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data)
              ? res.data
              : [];
          setAllHubs(list);
        })
        .catch(() => {});
    }
  }, [isOpen, isHubOutbound, allHubs.length]);

  // Combined candidate downstream hubs
  const candidateHubs = useMemo(() => {
    if (initialDownstreamHubs && initialDownstreamHubs.length > 0) {
      return initialDownstreamHubs.filter((h) => h.id !== currentHubId);
    }
    if (availableData?.downstreamHubs && availableData.downstreamHubs.length > 0) {
      return availableData.downstreamHubs.filter((h) => h.id !== currentHubId);
    }
    return allHubs.filter((h) => h.id !== currentHubId);
  }, [initialDownstreamHubs, availableData?.downstreamHubs, allHubs, currentHubId]);

  // Default destination hub when candidates load
  useEffect(() => {
    if (isHubOutbound && candidateHubs.length > 0 && !destinationHubId) {
      setDestinationHubId(candidateHubs[0].id);
    }
  }, [isHubOutbound, candidateHubs, destinationHubId]);

  // Handle selecting an existing warehouse order
  const handleSelectExistingOrder = (orderIdStr: string) => {
    setSelectedExistingOrderId(orderIdStr);
    if (!orderIdStr || !availableData?.orders) return;

    const matched = availableData.orders.find((o: any) => String(o.id) === orderIdStr);
    if (!matched) return;

    setOrderCode(matched.orderCode || '');
    setGoodsDescription(matched.goodsDescription || '');
    setTotalQuantity(Number(matched.remainingQuantity || matched.totalQuantity || 1));
    setTotalWeight(Number(matched.totalWeight || 0));
    setTotalVolume(Number(matched.totalVolume || 0));
    setDeliveryAddress(matched.deliveryAddress || matched.route?.split('→')[1]?.trim() || '');
    setProvince(matched.province || '');
    setAccompanyingDocs(matched.accompanyingDocs || '');
    setNotes(matched.notes || '');

    if (matched.destinationHubId && matched.destinationHubId !== currentHubId) {
      setDestinationHubId(matched.destinationHubId);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset form
      setPickupAddress('');
      setDestinationHubId('');
      setDeliveryAddress('');
      setProvince('');
      setOrderCode('');
      setGoodsDescription('');
      setTotalQuantity(1);
      setTotalWeight(0);
      setTotalVolume(0);
      setAccompanyingDocs('');
      setNotes('');
      setSelectedExistingOrderId('');
      setOutboundSource('CREATE_NEW');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isHubOutbound && !pickupAddress.trim()) {
      toast.error('Vui lòng nhập điểm bốc hàng dọc đường');
      return;
    }
    if (isHubOutbound && !destinationHubId) {
      toast.error('Vui lòng chọn trạm đích dỡ hàng tiếp theo của xe');
      return;
    }
    if (!goodsDescription.trim()) {
      toast.error('Vui lòng nhập tên mặt hàng');
      return;
    }
    if (!totalQuantity || totalQuantity <= 0) {
      toast.error('Số lượng kiện phải lớn hơn 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        appendMode: isHubOutbound ? 'HUB_OUTBOUND' : 'ROADSIDE_INBOUND',
        orderCode: orderCode.trim() || undefined,
        goodsDescription: goodsDescription.trim(),
        totalQuantity: Number(totalQuantity) || 1,
        totalWeight: Number(totalWeight) || 0,
        totalVolume: Number(totalVolume) || 0,
        destinationHubId: isHubOutbound
          ? Number(destinationHubId)
          : currentHubId
            ? Number(currentHubId)
            : undefined,
        pickupAddress: isHubOutbound ? currentHubName : pickupAddress.trim(),
        deliveryAddress: deliveryAddress.trim() || undefined,
        province: province.trim() || undefined,
        accompanyingDocs: accompanyingDocs.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await apiClient.post(
        `/api/v1/warehouse/trips/${encodeURIComponent(tripCode)}/append-order`,
        payload
      );

      const createdCode = res.data?.data?.order?.orderCode || orderCode || 'mới';
      toast.success(
        isHubOutbound
          ? `Đã xuất thêm đơn ${createdCode} từ ${currentHubName} lên chuyến xe ${tripCode} (Xe ${licensePlate})!`
          : `Đã bốc thêm đơn ${createdCode} vào chuyến xe ${tripCode} (Xe ${licensePlate}) về nhập Hub ${currentHubName}!`
      );

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      showApiErrorToast(
        err,
        isHubOutbound
          ? 'Không thể xuất thêm đơn lên chuyến xe'
          : 'Không thể bốc thêm đơn vào chuyến xe'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-xl max-w-[95vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 max-h-[90vh] overflow-y-auto'>
        <DialogHeader className='pb-2 border-b border-slate-100 dark:border-slate-800'>
          <DialogTitle className='flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white'>
            <IconTruck className='w-4 h-4 text-blue-600' />
            <span>
              {isHubOutbound
                ? `Bốc thêm đơn từ Hub ${currentHubName} lên xe ${tripCode}`
                : `Bốc thêm đơn dọc đường về nhập Hub ${currentHubName}`}
            </span>
          </DialogTitle>
          <div className='flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5'>
            <span>
              Xe:{' '}
              <strong className='font-mono text-slate-800 dark:text-slate-200 uppercase'>
                {licensePlate}
              </strong>
            </span>
            <span>•</span>
            <span>
              Chuyến: <strong className='font-mono text-blue-600 font-bold'>{tripCode}</strong>
            </span>
            <span>•</span>
            <span>
              Kho thao tác:{' '}
              <strong className='text-emerald-700 dark:text-emerald-400 font-semibold'>
                {currentHubName}
              </strong>
            </span>
          </div>
        </DialogHeader>

        {/* Chuyển đổi nguồn đơn cho HUB_OUTBOUND (Chọn từ tồn kho vs Nhập đơn xuất mới) */}
        {isHubOutbound && availableData?.orders && availableData.orders.length > 0 && (
          <div className='flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[11px]'>
            <button
              type='button'
              onClick={() => setOutboundSource('CREATE_NEW')}
              className={`flex-1 py-1 rounded font-semibold text-center transition-colors ${
                outboundSource === 'CREATE_NEW'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tạo đơn xuất mới
            </button>
            <button
              type='button'
              onClick={() => setOutboundSource('SELECT_EXISTING')}
              className={`flex-1 py-1 rounded font-semibold text-center transition-colors flex items-center justify-center gap-1 ${
                outboundSource === 'SELECT_EXISTING'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>Chọn từ đơn lưu kho</span>
              <Badge variant='secondary' className='h-4 px-1 text-[9px] font-bold'>
                {availableData.orders.length}
              </Badge>
            </button>
          </div>
        )}

        {/* Dropdown chọn đơn lưu kho nếu bật SELECT_EXISTING */}
        {isHubOutbound && outboundSource === 'SELECT_EXISTING' && (
          <div className='p-2 rounded bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900'>
            <Label className='text-[11px] font-bold text-blue-900 dark:text-blue-200 block mb-1'>
              Chọn đơn hàng đang lưu tại kho {currentHubName}:
            </Label>
            {isLoadingAvailable ? (
              <div className='flex items-center gap-1.5 text-xs text-slate-500 py-1'>
                <IconLoader2 className='w-3.5 h-3.5 animate-spin' /> Đang tải danh sách đơn lưu kho...
              </div>
            ) : (
              <select
                value={selectedExistingOrderId}
                onChange={(e) => handleSelectExistingOrder(e.target.value)}
                className='w-full h-8 text-xs font-medium rounded-md border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 px-2'
              >
                <option value=''>-- Bấm để chọn đơn hàng lưu kho --</option>
                {availableData?.orders.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.orderCode} - {o.goodsDescription} ({o.totalQuantity} kiện, {o.totalWeight}kg) → {o.destinationHub || 'Chưa gán đích'}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-2 text-xs py-0.5'>
          {/* Lộ trình bốc / xuất hàng */}
          <div className='p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2'>
            {isHubOutbound ? (
              <>
                {/* 1. Kho xuất hàng: Cố định là Hub hiện tại */}
                <div className='flex-1'>
                  <div className='text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase flex items-center gap-1.5'>
                    <span>1. Kho xuất hàng</span>
                    <span className='text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold'>
                      Kho hiện tại
                    </span>
                  </div>
                  <div className='h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 flex items-center text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate'>
                    {currentHubName}
                  </div>
                </div>

                <IconArrowRight className='w-4 h-4 text-blue-600 shrink-0 mt-4' />

                {/* 2. Kho nhận hàng: Dropdown chọn trạm đích */}
                <div className='flex-1'>
                  <div className='text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase'>
                    2. Kho nhận hàng (Đích dỡ) <span className='text-red-500'>*</span>
                  </div>
                  <select
                    value={destinationHubId}
                    onChange={(e) => setDestinationHubId(Number(e.target.value) || '')}
                    className='w-full h-8 text-xs font-bold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 mt-1 focus:ring-1 focus:ring-blue-500'
                    disabled={isSubmitting}
                    required
                  >
                    {candidateHubs.length === 0 ? (
                      <option value=''>Đang tải danh sách trạm...</option>
                    ) : (
                      candidateHubs.map((hub) => (
                        <option key={hub.id} value={hub.id}>
                          {hub.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </>
            ) : (
              <>
                {/* 1. Điểm bốc dọc đường: Freetext nhập tay */}
                <div className='flex-1'>
                  <div className='text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase'>
                    1. Điểm bốc dọc đường <span className='text-red-500'>*</span>
                  </div>
                  <Input
                    placeholder='VD: Cây xăng Hòa Cầm, Ngã 3 Trị An, Dọc QL1A...'
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className='h-8 text-xs font-semibold mt-1 bg-white dark:bg-slate-900'
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <IconArrowRight className='w-4 h-4 text-blue-600 shrink-0 mt-4' />

                {/* 2. Kho nhập hàng: Cố định là Hub hiện tại */}
                <div className='flex-1'>
                  <div className='text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase flex items-center gap-1.5'>
                    <span>2. Kho nhập hàng</span>
                    <span className='text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold'>
                      Kho hiện tại
                    </span>
                  </div>
                  <div className='h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 flex items-center text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate'>
                    {currentHubName}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Điểm giao của khách & Tỉnh/TP nhận hàng */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Điểm giao của khách (Địa chỉ giao hàng)
              </Label>
              <Input
                placeholder='Số nhà, tên đường, KCN, Phường/Xã...'
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className='h-8 text-xs mt-0.5'
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Tỉnh / Thành phố đích
              </Label>
              <Input
                placeholder='VD: Đà Nẵng, Quảng Nam, Huế...'
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className='h-8 text-xs mt-0.5'
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Thông tin mặt hàng */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Mã vận đơn (Tùy chọn)
              </Label>
              <Input
                placeholder='Để trống hệ thống tự cấp mã'
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                className='h-8 text-xs font-mono mt-0.5'
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Tên mặt hàng <span className='text-red-500'>*</span>
              </Label>
              <Input
                placeholder='VD: Bạt cuộn, Hạt nhựa, May mặc...'
                value={goodsDescription}
                onChange={(e) => setGoodsDescription(e.target.value)}
                className='h-8 text-xs font-semibold mt-0.5'
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Quy chuẩn kiện & Trọng lượng / Thể tích */}
          <div className='grid grid-cols-3 gap-2'>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Số kiện <span className='text-red-500'>*</span>
              </Label>
              <Input
                type='number'
                min={1}
                value={totalQuantity || ''}
                onChange={(e) =>
                  setTotalQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className='h-8 text-xs font-bold mt-0.5'
                disabled={isSubmitting}
                required
              />
            </div>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Khối lượng (Kg)
              </Label>
              <Input
                type='number'
                min={0}
                step='any'
                value={totalWeight || ''}
                onChange={(e) => setTotalWeight(parseFloat(e.target.value) || 0)}
                className='h-8 text-xs font-mono mt-0.5'
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Thể tích (m³)
              </Label>
              <Input
                type='number'
                min={0}
                step='any'
                value={totalVolume || ''}
                onChange={(e) => setTotalVolume(parseFloat(e.target.value) || 0)}
                className='h-8 text-xs font-mono mt-0.5'
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Chứng từ & Ghi chú */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Chứng từ đi kèm
              </Label>
              <Input
                placeholder='VD: 1 Bộ chứng từ, Hóa đơn VAT...'
                value={accompanyingDocs}
                onChange={(e) => setAccompanyingDocs(e.target.value)}
                className='h-8 text-xs mt-0.5'
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Ghi chú vận hành
              </Label>
              <Input
                placeholder={
                  isHubOutbound
                    ? `VD: Bốc thêm tại ${currentHubName} đi trạm kế tiếp`
                    : 'VD: Bốc thêm tại cây xăng Hòa Cầm'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className='h-8 text-xs mt-0.5'
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter className='gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onClose}
              disabled={isSubmitting}
              className='h-8 text-xs'
            >
              <IconX className='mr-1 h-3.5 w-3.5' /> Đóng
            </Button>
            <Button
              type='submit'
              size='sm'
              disabled={isSubmitting}
              className='h-8 text-xs bg-[#0F3D62] text-white hover:bg-[#0c314f] font-bold shadow-xs'
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' /> Đang xử lý...
                </>
              ) : (
                <>
                  <IconPackage className='mr-1.5 h-3.5 w-3.5' />{' '}
                  {isHubOutbound ? 'Xác nhận xuất lên xe' : 'Xác nhận bốc lên xe'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
