'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  IconEdit,
  IconFileText,
  IconMapPin,
  IconPackage,
  IconTruck
} from '@tabler/icons-react';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';
import { activeHubsQueryOptions } from '@/features/hubs/api';
import { useAdminOverrideOrderMutation } from '../api/mutations';
import type { AdminOverrideOrderPayload, Order } from '../api/types';

interface OrderAdminOverrideDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (order: Order) => void;
  warehouseHubId?: number | null;
}

const MIN_REASON_LENGTH = 5;

/**
 * SUPER_ADMIN-only dialog to adjust editable order information.
 * Every change is recorded as an adjustment invoice with the mandatory reason.
 */
export function OrderAdminOverrideDialog({
  order,
  open,
  onOpenChange,
  onSuccess,
  warehouseHubId = null
}: OrderAdminOverrideDialogProps) {
  const [quantity, setQuantity] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [volume, setVolume] = useState<number | ''>('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [province, setProvince] = useState('');
  const [notes, setNotes] = useState('');
  const [accompanyingDocs, setAccompanyingDocs] = useState('');
  const [externalNote, setExternalNote] = useState('');
  const [isExternalVehicleNeeded, setIsExternalVehicleNeeded] = useState(false);
  const [originHubId, setOriginHubId] = useState<number | ''>('');
  const [destinationHubId, setDestinationHubId] = useState<number | ''>('');
  const [auditReason, setAuditReason] = useState('');

  const { data: hubs = [] } = useQuery({ ...activeHubsQueryOptions(), enabled: open });
  const mutation = useAdminOverrideOrderMutation();

  useEffect(() => {
    if (!open) return;
    setQuantity(order.totalQuantity ?? '');
    setWeight(order.totalWeight ?? '');
    setVolume(order.totalVolume ?? '');
    setGoodsDescription(order.goodsDescription ?? '');
    const routeParts = (order.route ?? '').split('→');
    setPickupAddress(order.pickupAddress ?? routeParts[0]?.trim() ?? order.originHub ?? '');
    setDeliveryAddress(order.deliveryAddress ?? routeParts[1]?.trim() ?? order.destinationHub ?? '');
    setProvince(order.province ?? '');
    setNotes(order.notes ?? '');
    setAccompanyingDocs(order.accompanyingDocs ?? '');
    setExternalNote(order.externalNote ?? '');
    setIsExternalVehicleNeeded(Boolean(order.isExternalVehicleNeeded));
    setOriginHubId(order.originHubId ?? '');
    setDestinationHubId(order.destinationHubId ?? '');
    setAuditReason('');
  }, [open, order]);

  const buildPayload = (): AdminOverrideOrderPayload => {
    const payload: AdminOverrideOrderPayload = {
      auditReason: auditReason.trim(),
      warehouseHubId: Number(warehouseHubId),
    };
    if (quantity !== '' && Number(quantity) !== Number(order.totalQuantity ?? NaN)) {
      payload.totalQuantity = Number(quantity);
    }
    if (weight !== '' && Number(weight) !== Number(order.totalWeight)) {
      payload.totalWeight = Number(weight);
    }
    if (volume !== '' && Number(volume) !== Number(order.totalVolume)) {
      payload.totalVolume = Number(volume);
    }
    if (goodsDescription.trim() && goodsDescription.trim() !== (order.goodsDescription ?? '')) {
      payload.goodsDescription = goodsDescription.trim();
    }
    if (pickupAddress.trim() !== (order.pickupAddress ?? order.originHub ?? '')) {
      payload.pickupAddress = pickupAddress.trim();
    }
    if (deliveryAddress.trim() !== (order.deliveryAddress ?? order.destinationHub ?? '')) {
      payload.deliveryAddress = deliveryAddress.trim();
    }
    if (province.trim() !== (order.province ?? '')) payload.province = province.trim();
    if (notes.trim() !== (order.notes ?? '')) payload.notes = notes.trim();
    if (accompanyingDocs.trim() !== (order.accompanyingDocs ?? '')) {
      payload.accompanyingDocs = accompanyingDocs.trim();
    }
    if (externalNote.trim() !== (order.externalNote ?? '')) payload.externalNote = externalNote.trim();
    if (isExternalVehicleNeeded !== Boolean(order.isExternalVehicleNeeded)) {
      payload.isExternalVehicleNeeded = isExternalVehicleNeeded;
    }
    if (originHubId !== '' && originHubId !== order.originHubId) {
      payload.originHubId = Number(originHubId);
    }
    if (destinationHubId !== '' && destinationHubId !== order.destinationHubId) {
      payload.destinationHubId = Number(destinationHubId);
    }
    return payload;
  };

  const payload = buildPayload();
  const changedCount = Object.keys(payload).filter(
    (key) => key !== 'auditReason' && key !== 'warehouseHubId',
  ).length;
  const reasonValid = auditReason.trim().length >= MIN_REASON_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseHubId || !reasonValid || changedCount === 0) return;
    try {
      const updated = await mutation.mutateAsync({ id: order.id, payload });
      showApiSuccessToast('Đã điều chỉnh thông tin đơn hàng và ghi nhận vào lịch sử.');
      onOpenChange(false);
      onSuccess?.(updated);
    } catch (err) {
      showApiErrorToast(err, 'Không thể điều chỉnh thông tin đơn hàng. Vui lòng thử lại.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-4xl max-h-[92vh] flex min-h-0 flex-col overflow-hidden p-6 md:p-8'>
        <DialogHeader className='shrink-0 pb-3 border-b border-slate-100 dark:border-slate-800'>
          <DialogTitle className='text-xl font-bold flex items-center gap-2.5 text-slate-900 dark:text-slate-100'>
            <span className='p-2 bg-primary/10 text-primary rounded-lg'>
              <IconEdit className='h-5 w-5' />
            </span>
            Điều chỉnh thông tin đơn hàng —{' '}
            <span className='font-mono text-primary font-bold'>{order.orderCode}</span>
          </DialogTitle>
          <p className='text-xs text-muted-foreground mt-1'>
            Cập nhật thông tin hàng hóa, địa chỉ nhận/giao và ghi chú điều vận. Mã đơn hàng không thay đổi.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <div className='min-h-0 flex-1 overflow-y-auto space-y-6 py-3 pr-1'>
          <div className='bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4'>
            <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400'>
              <IconPackage className='h-4 w-4 text-primary' />
              Quy cách & tải trọng hàng hóa
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='space-y-1.5'>
                <label htmlFor='ovQuantity' className='text-sm font-semibold text-slate-700 dark:text-slate-300'>Số kiện</label>
                <Input id='ovQuantity' type='number' min='1' step='1' className='bg-white dark:bg-slate-950 font-medium' value={quantity} onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')} />
              </div>
              <div className='space-y-1.5'>
                <label htmlFor='ovWeight' className='text-sm font-semibold text-slate-700 dark:text-slate-300'>Khối lượng (kg)</label>
                <Input id='ovWeight' type='number' min='0' step='0.01' className='bg-white dark:bg-slate-950 font-medium' value={weight} onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')} />
              </div>
              <div className='space-y-1.5'>
                <label htmlFor='ovVolume' className='text-sm font-semibold text-slate-700 dark:text-slate-300'>Thể tích (m³)</label>
                <Input id='ovVolume' type='number' min='0' step='0.01' className='bg-white dark:bg-slate-950 font-medium' value={volume} onChange={(e) => setVolume(e.target.value ? Number(e.target.value) : '')} />
              </div>
            </div>
          </div>

          <div className='bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4'>
            <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400'>
              <IconMapPin className='h-4 w-4 text-primary' />
              Địa chỉ & tuyến giao nhận
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <label htmlFor='ovPickupAddress' className='text-sm font-semibold text-slate-700 dark:text-slate-300'>Địa chỉ nhận hàng</label>
                <Input id='ovPickupAddress' className='bg-white dark:bg-slate-950' value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
              </div>
              <div className='space-y-1.5'>
                <label htmlFor='ovDeliveryAddress' className='text-sm font-semibold text-slate-700 dark:text-slate-300'>Địa chỉ giao hàng</label>
                <Input id='ovDeliveryAddress' className='bg-white dark:bg-slate-950' value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
              </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <label htmlFor='ovOrigin' className='text-sm font-semibold text-slate-700 dark:text-slate-300'>Kho gửi</label>
                <NativeSelect id='ovOrigin' size='sm' className='w-full bg-white dark:bg-slate-950' value={originHubId === '' ? '' : String(originHubId)} onChange={(e) => setOriginHubId(e.target.value ? Number(e.target.value) : '')}>
                  <NativeSelectOption value=''>— Giữ nguyên —</NativeSelectOption>
                  {hubs.map((h) => <NativeSelectOption key={h.id} value={String(h.id)}>{h.name}</NativeSelectOption>)}
                </NativeSelect>
              </div>
              <div className='space-y-1.5'>
                <label htmlFor='ovDestination' className='text-sm font-semibold text-slate-700 dark:text-slate-300'>Kho nhận</label>
                <NativeSelect id='ovDestination' size='sm' className='w-full bg-white dark:bg-slate-950' value={destinationHubId === '' ? '' : String(destinationHubId)} onChange={(e) => setDestinationHubId(e.target.value ? Number(e.target.value) : '')}>
                  <NativeSelectOption value=''>— Giữ nguyên —</NativeSelectOption>
                  {hubs.map((h) => <NativeSelectOption key={h.id} value={String(h.id)}>{h.name}</NativeSelectOption>)}
                </NativeSelect>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label htmlFor='ovGoods' className='text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5'><IconFileText className='h-4 w-4 text-slate-500' />Mô tả hàng hóa</label>
              <Textarea id='ovGoods' rows={4} className='min-h-25 resize-y text-sm bg-white dark:bg-slate-950' value={goodsDescription} onChange={(e) => setGoodsDescription(e.target.value)} />
            </div>
            <div className='space-y-1.5'>
              <label htmlFor='ovNotes' className='text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5'><IconFileText className='h-4 w-4 text-slate-500' />Ghi chú điều vận</label>
              <Textarea id='ovNotes' rows={4} className='min-h-25 resize-y text-sm bg-white dark:bg-slate-950' value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label htmlFor='ovProvince' className='text-sm font-semibold text-slate-700 dark:text-slate-300'>Tỉnh / TP</label>
              <Input id='ovProvince' className='bg-white dark:bg-slate-950' value={province} onChange={(e) => setProvince(e.target.value)} />
            </div>
            <div className='space-y-1.5'>
              <label htmlFor='ovDocs' className='text-sm font-semibold text-slate-700 dark:text-slate-300'>Chứng từ</label>
              <Input id='ovDocs' className='bg-white dark:bg-slate-950' value={accompanyingDocs} onChange={(e) => setAccompanyingDocs(e.target.value)} />
            </div>
          </div>

          <div className='space-y-3.5 p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-900 rounded-xl'>
            <div className='flex items-center gap-3'>
              <input type='checkbox' id='ovExternal' checked={isExternalVehicleNeeded} onChange={(e) => setIsExternalVehicleNeeded(e.target.checked)} className='h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer' />
              <label htmlFor='ovExternal' className='text-sm text-amber-950 dark:text-amber-200 font-semibold cursor-pointer flex items-center gap-2'><IconTruck className='h-4 w-4 text-amber-700 dark:text-amber-400' />Có nhu cầu xe ngoài</label>
            </div>
            <div className='space-y-1.5'>
              <label htmlFor='ovExternalNote' className='text-sm font-semibold text-amber-950 dark:text-amber-200'>Ghi chú xe ngoài</label>
              <Textarea id='ovExternalNote' rows={2} className='bg-white dark:bg-slate-950 text-sm resize-y' value={externalNote} onChange={(e) => setExternalNote(e.target.value)} />
            </div>
          </div>

          <div className='space-y-1.5'>
            <label htmlFor='ovReason' className='text-sm font-semibold text-slate-700 dark:text-slate-300'>Lý do điều chỉnh <span className='text-rose-500'>*</span></label>
            <Textarea id='ovReason' rows={3} className='text-sm bg-white dark:bg-slate-950 resize-y' placeholder='VD: Khách hàng xác nhận khai sai số kiện khi tạo đơn, biên bản số ...' value={auditReason} onChange={(e) => setAuditReason(e.target.value)} required />
            {!reasonValid && auditReason.length > 0 && <p className='text-xs text-rose-600 mt-1'>Lý do cần tối thiểu {MIN_REASON_LENGTH} ký tự.</p>}
          </div>

          </div>

          <DialogFooter className='mx-0 mb-0 shrink-0 rounded-none bg-transparent p-0 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3'>
            <span className='mr-auto text-xs text-muted-foreground'>{changedCount > 0 ? `${changedCount} thông tin thay đổi` : 'Chưa có thay đổi'}</span>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={mutation.isPending} className='cursor-pointer px-5'>Hủy bỏ</Button>
            <Button type='submit' disabled={mutation.isPending || !warehouseHubId || !reasonValid || changedCount === 0} className='bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 cursor-pointer px-6'>{mutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
