'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconUserCheck } from '@tabler/icons-react';
import { createDriverMutation, updateDriverMutation } from '../api/mutations';
import type { Driver, DriverStatus } from '../api/types';

interface DriverFormDialogProps {
  driver: Driver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DriverFormDialog({ driver, open, onOpenChange }: DriverFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!driver;

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseClass, setLicenseClass] = useState('FC');
  const [experienceYears, setExperienceYears] = useState(5);
  const [status, setStatus] = useState<DriverStatus>('AVAILABLE');

  useEffect(() => {
    if (open) {
      if (driver) {
        setFullName(driver.fullName);
        setPhone(driver.phone);
        setLicenseNumber(driver.licenseNumber || '');
        setLicenseClass(driver.licenseClass);
        setExperienceYears(driver.experienceYears);
        setStatus(driver.status);
      } else {
        setFullName('');
        setPhone('');
        setLicenseNumber('');
        setLicenseClass('FC');
        setExperienceYears(5);
        setStatus('AVAILABLE');
      }
    }
  }, [open, driver?.id]);

  const createMutation = useMutation({
    ...createDriverMutation,
    onSuccess: () => {
      showApiSuccessToast('Tạo tài xế mới thành công!');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
    },
    onError: (err: any) => {
      showApiErrorToast(err, 'Không thể tạo tài xế mới. Vui lòng thử lại.');
    }
  });

  const updateMutation = useMutation({
    ...updateDriverMutation,
    onSuccess: () => {
      showApiSuccessToast('Cập nhật thông tin tài xế thành công!');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
    },
    onError: (err: any) => {
      showApiErrorToast(err, 'Không thể cập nhật tài xế. Vui lòng thử lại.');
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      licenseNumber: licenseNumber.trim() || undefined,
      licenseClass,
      experienceYears: Number(experienceYears),
      status
    };

    if (driver) {
      updateMutation.mutate({ id: driver.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]' id='driver-form-dialog'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-lg font-bold'>
            <IconUserCheck className='h-5 w-5 text-primary' />
            {driver ? 'Chỉnh Sửa Thông Tin Tài Xế' : 'Thêm Tài Xế Mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 py-2'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label
                htmlFor='input-driver-name'
                className='text-xs font-semibold text-muted-foreground'
              >
                Họ Và Tên *
              </label>
              <Input
                id='input-driver-name'
                required
                placeholder='VD: Nguyễn Văn Tài'
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className='space-y-1.5'>
              <label
                htmlFor='input-driver-phone'
                className='text-xs font-semibold text-muted-foreground'
              >
                Số Điện Thoại *
              </label>
              <Input
                id='input-driver-phone'
                required
                placeholder='VD: 0905123456'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label
                htmlFor='input-driver-license-no'
                className='text-xs font-semibold text-muted-foreground'
              >
                Số GPLX
              </label>
              <Input
                id='input-driver-license-no'
                placeholder='VD: 790123456789'
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </div>
            <div className='space-y-1.5'>
              <label
                htmlFor='select-driver-license-class'
                className='text-xs font-semibold text-muted-foreground'
              >
                Hạng Bằng Lái *
              </label>
              <select
                id='select-driver-license-class'
                value={licenseClass}
                onChange={(e) => setLicenseClass(e.target.value)}
                className='w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer'
              >
                <option value='FC'>Hạng FC (Container)</option>
                <option value='C'>Hạng C (Xe Tải Nặng)</option>
                <option value='E'>Hạng E (Xe Khách/Container)</option>
                <option value='D'>Hạng D</option>
              </select>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label
                htmlFor='input-driver-exp'
                className='text-xs font-semibold text-muted-foreground'
              >
                Số Năm Kinh Nghiệm
              </label>
              <Input
                id='input-driver-exp'
                type='number'
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
              />
            </div>
            <div className='space-y-1.5'>
              <label
                htmlFor='select-driver-status'
                className='text-xs font-semibold text-muted-foreground'
              >
                Trạng Thái *
              </label>
              <select
                id='select-driver-status'
                value={status}
                onChange={(e) => setStatus(e.target.value as DriverStatus)}
                className='w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer'
              >
                <option value='AVAILABLE'>Sẵn Sàng</option>
                <option value='ON_TRIP'>Đang Đi Chuyến</option>
                <option value='OFF_DUTY'>Nghỉ Phép</option>
              </select>
            </div>
          </div>

          <DialogFooter className='pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='cursor-pointer'
            >
              Hủy
            </Button>
            <Button
              type='submit'
              id='btn-save-driver'
              disabled={isPending}
              className='cursor-pointer bg-primary text-primary-foreground'
            >
              {isPending ? 'Đang lưu...' : driver ? 'Cập Nhật Tài Xế' : 'Tạo Tài Xế Mới'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
