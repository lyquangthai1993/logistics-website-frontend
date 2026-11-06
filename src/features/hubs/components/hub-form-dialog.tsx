'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { createHubMutation, updateHubMutation } from '../api/mutations';
import { hubKeys } from '../api/queries';
import type { Hub, CreateHubPayload } from '../api/types';

interface HubFormDialogProps {
  hub?: Hub | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HubFormDialog({
  hub,
  open: controlledOpen,
  onOpenChange: setControlledOpen
}: HubFormDialogProps) {
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [formCode, setFormCode] = useState('');
  const [formOrderCodePrefix, setFormOrderCodePrefix] = useState('');
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formManager, setFormManager] = useState('');
  const [formLevel, setFormLevel] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    if (hub) {
      setFormCode(hub.code || '');
      setFormOrderCodePrefix(hub.orderCodePrefix || '');
      setFormName(hub.name || '');
      setFormCity(hub.city || '');
      setFormAddress(hub.address || '');
      setFormPhone(hub.contactPhone || '');
      setFormManager(hub.managerName || '');
      setFormLevel(hub.level === 2 ? 2 : 1);
      setFormIsActive(hub.isActive ?? true);
    } else {
      setFormCode('');
      setFormOrderCodePrefix('');
      setFormName('');
      setFormCity('');
      setFormAddress('');
      setFormPhone('');
      setFormManager('');
      setFormLevel(1);
      setFormIsActive(true);
    }
  }, [hub, open]);

  const createMutation = useMutation({
    ...createHubMutation,
    onSuccess: (res) => {
      showApiSuccessToast(`Tạo mới chi nhánh "${res.name}" thành công!`);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: hubKeys.all });
    },
    onError: (err: any) => {
      showApiErrorToast(err, 'Có lỗi xảy ra khi tạo mới chi nhánh');
    }
  });

  const updateMutation = useMutation({
    ...updateHubMutation,
    onSuccess: (res) => {
      showApiSuccessToast(`Cập nhật chi nhánh "${res.name}" thành công!`);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: hubKeys.all });
    },
    onError: (err: any) => {
      showApiErrorToast(err, 'Có lỗi xảy ra khi cập nhật chi nhánh');
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateHubPayload = {
      code: formCode.trim().toUpperCase(),
      orderCodePrefix: formOrderCodePrefix.trim().toUpperCase() || undefined,
      name: formName.trim(),
      city: formCity.trim(),
      address: formAddress.trim() || undefined,
      contactPhone: formPhone.trim() || undefined,
      managerName: formManager.trim() || undefined,
      level: formLevel === 2 ? 2 : 1,
      isActive: formIsActive
    };

    if (hub) {
      updateMutation.mutate({ id: hub.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='sm:max-w-xl' id='hub-form-dialog'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Icons.warehouse className='text-primary h-5 w-5' />
            {hub ? 'Chỉnh Sửa Chi Nhánh Kho' : 'Thêm Chi Nhánh Kho Mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-2 py-1'>
          <div className='space-y-1'>
            <label className='text-muted-foreground text-xs font-semibold'>
              Phân Cấp Chi Nhánh Kho (Level) *
            </label>
            <div className='grid grid-cols-2 gap-2'>
              <button
                type='button'
                id='btn-hub-level-1'
                onClick={() => setFormLevel(1)}
                className={`flex items-start gap-2 rounded-md border p-2 text-left transition-all cursor-pointer ${
                  formLevel === 1
                    ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40 ring-1 ring-blue-600/30'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Icons.warehouse
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    formLevel === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                  }`}
                />
                <div className='min-w-0 flex-1'>
                  <div className='text-xs font-semibold text-foreground'>Cấp 1 • Hub Chính</div>
                  <div className='text-[10px] text-muted-foreground leading-tight mt-0.5'>
                    Kho trung tâm tiếp nhận &amp; trung chuyển liên vùng
                  </div>
                </div>
              </button>

              <button
                type='button'
                id='btn-hub-level-2'
                onClick={() => setFormLevel(2)}
                className={`flex items-start gap-2 rounded-md border p-2 text-left transition-all cursor-pointer ${
                  formLevel === 2
                    ? 'border-amber-600 bg-amber-50/70 dark:border-amber-500 dark:bg-amber-950/40 ring-1 ring-amber-600/30'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Icons.truck
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    formLevel === 2 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                  }`}
                />
                <div className='min-w-0 flex-1'>
                  <div className='text-xs font-semibold text-foreground'>Cấp 2 • Trạm Xe Bo</div>
                  <div className='text-[10px] text-muted-foreground leading-tight mt-0.5'>
                    Trạm vệ tinh / Xe bo giao nhận chặng cuối tại tỉnh
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className='grid grid-cols-3 gap-2'>
            <div className='space-y-1'>
              <label
                htmlFor='input-hub-code'
                className='text-muted-foreground text-xs font-semibold'
              >
                Mã Chi Nhánh (Unique) *
              </label>
              <Input
                id='input-hub-code'
                required
                placeholder={formLevel === 2 ? 'VD: XB-HUE' : 'VD: HUB-HAN-01'}
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className='h-8 font-mono uppercase text-xs'
              />
            </div>
            <div className='space-y-1'>
              <label
                htmlFor='input-hub-prefix'
                className='text-muted-foreground text-xs font-semibold'
              >
                Tiền Tố Mã Đơn (Prefix)
              </label>
              <Input
                id='input-hub-prefix'
                placeholder={formLevel === 2 ? 'VD: BO_HUE' : 'VD: HAN'}
                value={formOrderCodePrefix}
                onChange={(e) => setFormOrderCodePrefix(e.target.value)}
                className='h-8 font-mono uppercase text-xs'
              />
            </div>
            <div className='space-y-1'>
              <label
                htmlFor='input-hub-city'
                className='text-muted-foreground text-xs font-semibold'
              >
                Tỉnh / Thành Phố *
              </label>
              <Input
                id='input-hub-city'
                required
                placeholder='VD: Hà Nội'
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                className='h-8 text-xs'
              />
            </div>
          </div>

          <div className='space-y-1'>
            <label htmlFor='input-hub-name' className='text-muted-foreground text-xs font-semibold'>
              Tên Chi Nhánh Kho *
            </label>
            <Input
              id='input-hub-name'
              required
              placeholder={formLevel === 2 ? 'VD: Xe Bo Huế' : 'VD: Andromeda Hub (Hà Nội)'}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className='h-8 text-xs'
            />
          </div>

          <div className='space-y-1'>
            <label
              htmlFor='input-hub-address'
              className='text-muted-foreground text-xs font-semibold'
            >
              Địa Chỉ Chi Tiết
            </label>
            <Input
              id='input-hub-address'
              placeholder='VD: KCN Bắc Thăng Long, Đông Anh, Hà Nội'
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              className='h-8 text-xs'
            />
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <label
                htmlFor='input-hub-manager'
                className='text-muted-foreground text-xs font-semibold'
              >
                Người Quản Lý Kho
              </label>
              <Input
                id='input-hub-manager'
                placeholder='VD: Nguyễn Văn Quản'
                value={formManager}
                onChange={(e) => setFormManager(e.target.value)}
                className='h-8 text-xs'
              />
            </div>
            <div className='space-y-1'>
              <label
                htmlFor='input-hub-phone'
                className='text-muted-foreground text-xs font-semibold'
              >
                Số Điện Thoại Liên Hệ
              </label>
              <Input
                id='input-hub-phone'
                placeholder='VD: 024-3886-1234'
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className='h-8 text-xs'
              />
            </div>
          </div>

          <div className='flex items-center gap-2 pt-1'>
            <input
              type='checkbox'
              id='input-hub-is-active'
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className='border-input text-primary focus:ring-primary h-4 w-4 rounded cursor-pointer'
            />
            <label
              htmlFor='input-hub-is-active'
              className='text-foreground text-xs font-medium cursor-pointer'
            >
              Kích hoạt chi nhánh ngay (Sẵn sàng tiếp nhận đơn &amp; phương tiện)
            </label>
          </div>

          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              className='cursor-pointer'
            >
              Hủy Bỏ
            </Button>
            <Button
              type='submit'
              disabled={isPending}
              className='bg-primary text-primary-foreground cursor-pointer'
            >
              {isPending ? 'Đang Lưu...' : hub ? 'Lưu Thay Đổi' : 'Thêm Chi Nhánh'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function HubFormDialogTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        id='btn-add-hub'
        onClick={() => setOpen(true)}
        className='bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer transition-all duration-150'
      >
        <Icons.add className='mr-2 h-4 w-4' />
        Thêm Chi Nhánh Mới
      </Button>
      <HubFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
