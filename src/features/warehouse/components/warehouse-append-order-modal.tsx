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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconTruck,
  IconPackage,
  IconX,
  IconLoader2,
  IconArrowRight,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { showApiErrorToast } from '@/lib/api-error';
import { getActiveHubs } from '@/features/hubs/api/service';
import type { Hub } from '@/features/hubs/api/types';
import { useAuthStore } from '@/stores/use-auth-store';

interface WarehouseAppendOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripCode: string;
  licensePlate: string;
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

  const [hubs, setHubs] = useState<Hub[]>([]);
  const [isLoadingHubs, setIsLoadingHubs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [orderCode, setOrderCode] = useState('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [totalQuantity, setTotalQuantity] = useState<number>(1);
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [destinationHubId, setDestinationHubId] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [province, setProvince] = useState('');
  const [accompanyingDocs, setAccompanyingDocs] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsLoadingHubs(true);
      getActiveHubs()
        .then((data) => {
          setHubs(data || []);
          // Auto select first hub that is not current hub
          const other = (data || []).find((h) => h.id !== currentHubId);
          if (other) setDestinationHubId(other.id.toString());
        })
        .catch((err) => {
          console.error('Lỗi khi tải danh sách Hub:', err);
        })
        .finally(() => setIsLoadingHubs(false));
    } else {
      // Reset form
      setOrderCode('');
      setGoodsDescription('');
      setTotalQuantity(1);
      setTotalWeight(0);
      setTotalVolume(0);
      setDeliveryAddress('');
      setProvince('');
      setAccompanyingDocs('');
      setNotes('');
    }
  }, [isOpen, currentHubId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        orderCode: orderCode.trim() || undefined,
        goodsDescription: goodsDescription.trim(),
        totalQuantity: Number(totalQuantity) || 1,
        totalWeight: Number(totalWeight) || 0,
        totalVolume: Number(totalVolume) || 0,
        destinationHubId: destinationHubId ? Number(destinationHubId) : undefined,
        pickupAddress: currentHubName,
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
        `Đã bốc thêm đơn ${createdCode} vào chuyến xe ${tripCode} (Xe ${licensePlate}) thành công!`
      );

      onSuccess?.();
      onClose();
    } catch (err: any) {
      showApiErrorToast(err, 'Không thể bốc thêm đơn vào chuyến xe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-xl max-w-[95vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3'>
        <DialogHeader className='pb-2 border-b border-slate-100 dark:border-slate-800'>
          <DialogTitle className='flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white'>
            <IconTruck className='w-4 h-4 text-blue-600' />
            <span>Bốc thêm đơn dọc đường lên chuyến xe {tripCode}</span>
          </DialogTitle>
          <div className='flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5'>
            <span>Xe: <strong className='font-mono text-slate-800 dark:text-slate-200 uppercase'>{licensePlate}</strong></span>
            <span>•</span>
            <span>Kho bốc: <strong className='text-emerald-700 dark:text-emerald-400 font-semibold'>{currentHubName}</strong></span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-2.5 text-xs py-1'>
          {/* Lộ trình bốc hàng & đích dỡ */}
          <div className='p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2'>
            <div className='flex-1'>
              <div className='text-[10px] text-slate-400 font-semibold uppercase'>1. Nơi bốc hàng (Kho hiện tại)</div>
              <div className='font-bold text-slate-800 dark:text-slate-200 text-xs truncate'>{currentHubName}</div>
            </div>
            <IconArrowRight className='w-4 h-4 text-blue-600 shrink-0' />
            <div className='flex-1'>
              <div className='text-[10px] text-slate-400 font-semibold uppercase'>2. Đích dỡ hàng (Kho nhận) <span className='text-red-500'>*</span></div>
              <Select
                value={destinationHubId}
                onValueChange={(val) => setDestinationHubId(val || '')}
                disabled={isLoadingHubs || isSubmitting}
              >
                <SelectTrigger className='h-7.5 text-xs font-semibold mt-0.5'>
                  <SelectValue placeholder='Chọn kho nhận' />
                </SelectTrigger>
                <SelectContent>
                  {hubs
                    .filter((h) => h.id !== currentHubId)
                    .map((h) => (
                      <SelectItem key={h.id} value={h.id.toString()} className='text-xs'>
                        {h.name} {h.code ? `(${h.code})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
                className='h-8 text-xs font-mono'
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Tên mặt hàng <span className='text-red-500'>*</span>
              </Label>
              <Input
                placeholder='VD: Vải cuộn, Hạt nhựa, May mặc...'
                value={goodsDescription}
                onChange={(e) => setGoodsDescription(e.target.value)}
                className='h-8 text-xs font-semibold'
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
                onChange={(e) => setTotalQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className='h-8 text-xs font-bold'
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
                className='h-8 text-xs font-mono'
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
                className='h-8 text-xs font-mono'
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Địa chỉ giao & Tỉnh/TP */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Địa chỉ giao hàng (Tùy chọn)
              </Label>
              <Input
                placeholder='Số nhà, tên đường, KCN...'
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className='h-8 text-xs'
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Tỉnh / Thành phố đích
              </Label>
              <Input
                placeholder='VD: Hưng Yên, Hà Nội, Hải Phòng...'
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className='h-8 text-xs'
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
                className='h-8 text-xs'
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
                Ghi chú vận hành
              </Label>
              <Input
                placeholder='VD: Bốc thêm tại kho Đà Nẵng'
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className='h-8 text-xs'
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
                  <IconLoader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' /> Đang bốc lên xe...
                </>
              ) : (
                <>
                  <IconPackage className='mr-1.5 h-3.5 w-3.5' /> Xác nhận bốc lên xe
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
