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
import { IconShieldLock, IconAlertTriangle } from '@tabler/icons-react';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';
import { activeHubsQueryOptions } from '@/features/hubs/api';
import { useAdminOverrideOrderMutation } from '../api/mutations';
import type { AdminOverrideOrderPayload, Order } from '../api/types';

interface OrderAdminOverrideDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (order: Order) => void;
}

const MIN_REASON_LENGTH = 5;

/**
 * SUPER_ADMIN-only dialog to adjust the immutable Master Contract.
 * Every change is recorded as an adjustment invoice with the mandatory reason.
 */
export function OrderAdminOverrideDialog({
  order,
  open,
  onOpenChange,
  onSuccess
}: OrderAdminOverrideDialogProps) {
  const [quantity, setQuantity] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [volume, setVolume] = useState<number | ''>('');
  const [goodsDescription, setGoodsDescription] = useState('');
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
    setOriginHubId(order.originHubId ?? '');
    setDestinationHubId(order.destinationHubId ?? '');
    setAuditReason('');
  }, [open, order]);

  const buildPayload = (): AdminOverrideOrderPayload => {
    const payload: AdminOverrideOrderPayload = { auditReason: auditReason.trim() };
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
    if (originHubId !== '' && originHubId !== order.originHubId) {
      payload.originHubId = Number(originHubId);
    }
    if (destinationHubId !== '' && destinationHubId !== order.destinationHubId) {
      payload.destinationHubId = Number(destinationHubId);
    }
    return payload;
  };

  const payload = buildPayload();
  const changedCount = Object.keys(payload).length - 1;
  const reasonValid = auditReason.trim().length >= MIN_REASON_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonValid || changedCount === 0) return;
    try {
      const updated = await mutation.mutateAsync({ id: order.id, payload });
      showApiSuccessToast('Đã điều chỉnh hợp đồng gốc và ghi nhận vào lịch sử đơn hàng.');
      onOpenChange(false);
      onSuccess?.(updated);
    } catch (err) {
      showApiErrorToast(err, 'Không thể điều chỉnh hợp đồng gốc. Vui lòng thử lại.');
    }
  };

  const labelCls = 'text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1 block';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[520px] p-0 gap-0'>
        <DialogHeader className='py-1.5 px-2 border-b'>
          <DialogTitle className='text-sm font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400'>
            <IconShieldLock className='h-4 w-4' />
            Điều chỉnh hợp đồng gốc — {order.orderCode}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='flex flex-col'>
          <div className='p-2 space-y-2 overflow-y-auto max-h-[80vh] text-xs'>
            <div className='p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[10px] text-rose-800 dark:text-rose-200 flex items-start gap-1.5'>
              <IconAlertTriangle className='h-3.5 w-3.5 shrink-0 mt-px' />
              <span>
                Chỉ dùng khi xử lý sự cố đặc biệt. Số tồn kho thực tế không bị thay đổi; mọi điều chỉnh
                được lưu thành phiếu điều chỉnh kèm lý do trong lịch sử đơn hàng.
              </span>
            </div>

            <div className='grid grid-cols-3 gap-1.5'>
              <div>
                <label htmlFor='ovQuantity' className={labelCls}>
                  Số kiện
                </label>
                <Input
                  id='ovQuantity'
                  type='number'
                  min='1'
                  step='1'
                  className='h-8 text-xs'
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
              <div>
                <label htmlFor='ovWeight' className={labelCls}>
                  Khối lượng (kg)
                </label>
                <Input
                  id='ovWeight'
                  type='number'
                  min='0'
                  step='0.01'
                  className='h-8 text-xs'
                  value={weight}
                  onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
              <div>
                <label htmlFor='ovVolume' className={labelCls}>
                  Thể tích (m³)
                </label>
                <Input
                  id='ovVolume'
                  type='number'
                  min='0'
                  step='0.01'
                  className='h-8 text-xs'
                  value={volume}
                  onChange={(e) => setVolume(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </div>

            <div>
              <label htmlFor='ovGoods' className={labelCls}>
                Mô tả hàng
              </label>
              <Input
                id='ovGoods'
                className='h-8 text-xs'
                value={goodsDescription}
                onChange={(e) => setGoodsDescription(e.target.value)}
              />
            </div>

            <div className='grid grid-cols-2 gap-1.5'>
              <div>
                <label htmlFor='ovOrigin' className={labelCls}>
                  Kho gửi
                </label>
                <NativeSelect
                  id='ovOrigin'
                  size='sm'
                  className='w-full'
                  value={originHubId === '' ? '' : String(originHubId)}
                  onChange={(e) => setOriginHubId(e.target.value ? Number(e.target.value) : '')}
                >
                  <NativeSelectOption value=''>— Giữ nguyên —</NativeSelectOption>
                  {hubs.map((h) => (
                    <NativeSelectOption key={h.id} value={String(h.id)}>
                      {h.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label htmlFor='ovDestination' className={labelCls}>
                  Kho nhận
                </label>
                <NativeSelect
                  id='ovDestination'
                  size='sm'
                  className='w-full'
                  value={destinationHubId === '' ? '' : String(destinationHubId)}
                  onChange={(e) =>
                    setDestinationHubId(e.target.value ? Number(e.target.value) : '')
                  }
                >
                  <NativeSelectOption value=''>— Giữ nguyên —</NativeSelectOption>
                  {hubs.map((h) => (
                    <NativeSelectOption key={h.id} value={String(h.id)}>
                      {h.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div>
              <label htmlFor='ovReason' className={labelCls}>
                Lý do điều chỉnh <span className='text-rose-500'>*</span>
              </label>
              <Textarea
                id='ovReason'
                rows={3}
                className='text-xs'
                placeholder='VD: Khách hàng xác nhận khai sai số kiện khi tạo đơn, biên bản số ...'
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                required
              />
              {!reasonValid && auditReason.length > 0 && (
                <p className='text-[10px] text-rose-600 mt-1'>
                  Lý do cần tối thiểu {MIN_REASON_LENGTH} ký tự.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className='sticky bottom-0 bg-white dark:bg-slate-900 border-t p-1.5 flex-row justify-between items-center gap-1.5'>
            <span className='text-[10px] text-slate-500'>
              {changedCount > 0 ? `${changedCount} thông tin thay đổi` : 'Chưa có thay đổi'}
            </span>
            <div className='flex items-center gap-1.5'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8'
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Hủy
              </Button>
              <Button
                type='submit'
                size='sm'
                className='h-8 bg-rose-600 hover:bg-rose-700 text-white'
                disabled={mutation.isPending || !reasonValid || changedCount === 0}
              >
                {mutation.isPending ? 'Đang lưu...' : 'Xác nhận điều chỉnh'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
