'use client';

import React, { useState, useEffect } from 'react';
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
import {
  IconTruck,
  IconLoader2,
  IconArrowRight,
  IconMapPin,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { showApiErrorToast } from '@/lib/api-error';
import { useAuthStore } from '@/stores/use-auth-store';

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
  onSuccess,
}: WarehouseAppendOrderModalProps) {
  const user = useAuthStore((state) => state.user);
  const currentHubName = user?.hub?.name || 'Kho hiện tại';
  const currentHubId = user?.hub?.id;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields for roadside pickup inbound
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [province, setProvince] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [totalQuantity, setTotalQuantity] = useState<number>(1);
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [accompanyingDocs, setAccompanyingDocs] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setPickupAddress('');
      setDeliveryAddress('');
      setProvince('');
      setOrderCode('');
      setGoodsDescription('');
      setTotalQuantity(1);
      setTotalWeight(0);
      setTotalVolume(0);
      setAccompanyingDocs('');
      setNotes('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pickupAddress.trim()) {
      toast.error('Vui lòng nhập địa chỉ bốc hàng dọc đường');
      return;
    }

    if (!goodsDescription.trim()) {
      toast.error('Vui lòng nhập tên mặt hàng');
      return;
    }

    if (!totalQuantity || totalQuantity < 1) {
      toast.error('Số lượng kiện phải lớn hơn 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        mode: 'ROADSIDE_INBOUND',
        orderCode: orderCode.trim() || undefined,
        goodsDescription: goodsDescription.trim(),
        totalQuantity: Number(totalQuantity),
        totalWeight: Number(totalWeight) || 0,
        totalVolume: Number(totalVolume) || 0,
        pickupAddress: pickupAddress.trim(),
        destinationHubId: currentHubId,
        deliveryAddress: deliveryAddress.trim() || undefined,
        province: province.trim() || undefined,
        accompanyingDocs: accompanyingDocs.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await apiClient.post(
        `/api/v1/warehouse/trips/${encodeURIComponent(tripCode)}/append-order`,
        payload
      );

      const createdCode = res.data?.data?.orderCode || orderCode || 'đơn hàng';
      toast.success(
        `Đã ghi nhận bốc thêm đơn ${createdCode} (${totalQuantity} kiện) ngoài đường chở về nhập kho ${currentHubName}!`
      );

      onSuccess?.();
      onClose();
    } catch (err) {
      showApiErrorToast(err, 'Không thể bốc thêm đơn hàng vào chuyến xe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='w-[95vw] sm:max-w-3xl max-h-[90vh] p-2.5 overflow-y-auto'>
        <DialogHeader className='p-1 border-b border-slate-100 dark:border-slate-800 pb-1.5'>
          <DialogTitle className='text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5'>
            <IconMapPin className='h-4 w-4 text-amber-600' />
            <span>Bốc thêm đơn dọc đường chở về nhập {currentHubName}</span>
          </DialogTitle>
          <div className='flex items-center gap-2 text-[10px] text-slate-500 mt-0.5'>
            <span>
              Xe: <strong className='text-slate-700 dark:text-slate-300 font-bold'>{licensePlate}</strong>
            </span>
            <span>•</span>
            <span>
              Chuyến: <strong className='font-mono text-blue-600 font-bold'>{tripCode}</strong>
            </span>
            <span>•</span>
            <span>
              Kho tiếp nhận:{' '}
              <strong className='text-emerald-700 dark:text-emerald-400 font-semibold'>
                {currentHubName}
              </strong>
            </span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-2 text-xs py-0.5'>
          {/* Lộ trình bốc hàng */}
          <div className='p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2'>
            <div className='flex-1'>
              <div className='text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase'>
                1. Điểm bốc hàng dọc đường <span className='text-red-500'>*</span>
              </div>
              <Input
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder='VD: Ngã 3 Trị An, Đồng Nai...'
                className='h-8 text-xs font-medium mt-1 bg-white dark:bg-slate-900'
                disabled={isSubmitting}
                required
              />
            </div>

            <IconArrowRight className='w-4 h-4 text-blue-600 shrink-0 mt-4' />

            <div className='flex-1'>
              <div className='text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase flex items-center gap-1.5'>
                <span>2. Kho dỡ hàng</span>
                <span className='text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold'>
                  Kho hiện tại
                </span>
              </div>
              <div className='h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 flex items-center text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate'>
                {currentHubName}
              </div>
            </div>
          </div>

          {/* Thông tin hàng hóa */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
            <div>
              <Label className='text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 block'>
                Mã vận đơn (Tùy chọn)
              </Label>
              <Input
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                placeholder='Để trống hệ thống tự cấp mã'
                className='h-8 text-xs font-mono'
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label className='text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 block'>
                Tên mặt hàng <span className='text-red-500'>*</span>
              </Label>
              <Input
                value={goodsDescription}
                onChange={(e) => setGoodsDescription(e.target.value)}
                placeholder='VD: Thùng linh kiện, Bạt cuộn...'
                className='h-8 text-xs'
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className='grid grid-cols-3 gap-2'>
            <div>
              <Label className='text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 block'>
                Số kiện <span className='text-red-500'>*</span>
              </Label>
              <Input
                type='number'
                min={1}
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className='h-8 text-xs font-bold text-center'
                disabled={isSubmitting}
                required
              />
            </div>
            <div>
              <Label className='text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 block'>
                Khối lượng (kg)
              </Label>
              <Input
                type='number'
                step='any'
                min={0}
                value={totalWeight || ''}
                onChange={(e) => setTotalWeight(parseFloat(e.target.value) || 0)}
                placeholder='0.0'
                className='h-8 text-xs text-right font-mono'
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label className='text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 block'>
                Thể tích (m³)
              </Label>
              <Input
                type='number'
                step='any'
                min={0}
                value={totalVolume || ''}
                onChange={(e) => setTotalVolume(parseFloat(e.target.value) || 0)}
                placeholder='0.00'
                className='h-8 text-xs text-right font-mono'
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
            <div>
              <Label className='text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 block'>
                Địa chỉ giao khách (Chặng sau nếu có)
              </Label>
              <Input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder='VD: Số 123 Đường ABC...'
                className='h-8 text-xs'
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label className='text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 block'>
                Tỉnh / Thành phố
              </Label>
              <Input
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder='VD: Đà Nẵng, Khánh Hòa...'
                className='h-8 text-xs'
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
            <div>
              <Label className='text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 block'>
                Chứng từ đi kèm
              </Label>
              <Input
                value={accompanyingDocs}
                onChange={(e) => setAccompanyingDocs(e.target.value)}
                placeholder='VD: Hóa đơn đỏ, Biên bản bàn giao...'
                className='h-8 text-xs'
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label className='text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 block'>
                Ghi chú dỡ hàng
              </Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder='Ghi chú cho thủ kho...'
                className='h-8 text-xs'
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter className='p-1 border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-end gap-1.5'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onClose}
              disabled={isSubmitting}
              className='h-7 text-xs px-2.5'
            >
              Hủy
            </Button>
            <Button
              type='submit'
              size='sm'
              disabled={isSubmitting}
              className='h-7 bg-[#0F3D62] hover:bg-[#0c314f] text-white px-2.5 font-bold shadow-xs text-xs'
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
                  Đang ghi nhận...
                </>
              ) : (
                <>
                  <IconTruck className='mr-1 h-3.5 w-3.5 text-blue-300' />
                  Xác nhận bốc thêm đơn về Hub
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
