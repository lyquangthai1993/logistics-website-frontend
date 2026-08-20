'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { IconTruck } from '@tabler/icons-react';
import { activeHubsQueryOptions, type Hub } from '@/features/hubs/api';
import { createVehicleMutation, updateVehicleMutation } from '../api/mutations';
import type { Vehicle, VehicleStatus } from '../api/types';

interface VehicleFormDialogProps {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleFormDialog({ vehicle, open, onOpenChange }: VehicleFormDialogProps) {
  const queryClient = useQueryClient();
  const { data: hubs = [] } = useQuery(activeHubsQueryOptions());

  // Form State
  const [licensePlate, setLicensePlate] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('CONTAINER_40FT');
  const [maxWeight, setMaxWeight] = useState(25000);
  const [maxVolume, setMaxVolume] = useState(65.5);
  const [hubId, setHubId] = useState<number | null>(null);
  const [currentHub, setCurrentHub] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('AVAILABLE');
  const [isExternal, setIsExternal] = useState(false);
  const [externalProvider, setExternalProvider] = useState('');

  // Sync form with vehicle prop only on open or vehicle identity change
  useEffect(() => {
    if (open) {
      if (vehicle) {
        setLicensePlate(vehicle.licensePlate || '');
        setModel(vehicle.model || '');
        setType(vehicle.type || 'CONTAINER_40FT');
        setMaxWeight(vehicle.maxWeight ?? 25000);
        setMaxVolume(vehicle.maxVolume ?? 65.5);
        setHubId(vehicle.hubId || vehicle.hub?.id || null);
        setCurrentHub(vehicle.hub?.name || vehicle.currentHub || '');
        setStatus(vehicle.status || 'AVAILABLE');
        setIsExternal(!!vehicle.isExternal);
        setExternalProvider(vehicle.externalProvider || '');
      } else {
        setLicensePlate('');
        setModel('');
        setType('CONTAINER_40FT');
        setMaxWeight(25000);
        setMaxVolume(65.5);
        setHubId(null);
        setCurrentHub('');
        setStatus('AVAILABLE');
        setIsExternal(false);
        setExternalProvider('');
      }
    }
  }, [open, vehicle?.id]);

  const createMutation = useMutation({
    ...createVehicleMutation,
    onSuccess: () => {
      showApiSuccessToast('Tạo xe mới thành công!');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
    },
    onError: (err: any) => {
      showApiErrorToast(err, 'Không thể tạo xe mới. Vui lòng thử lại.');
    }
  });

  const updateMutation = useMutation({
    ...updateVehicleMutation,
    onSuccess: () => {
      showApiSuccessToast('Cập nhật thông tin xe thành công!');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
    },
    onError: (err: any) => {
      showApiErrorToast(err, 'Không thể cập nhật xe. Vui lòng thử lại.');
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedHubObj = hubs.find((h) => h.id === hubId);
    const resolvedHubName = currentHub.trim() || (selectedHubObj ? selectedHubObj.name : undefined);

    const payload = {
      licensePlate: licensePlate.trim(),
      model: model.trim() || undefined,
      type,
      maxWeight: Number(maxWeight),
      maxVolume: Number(maxVolume),
      hubId: hubId || undefined,
      currentHub: resolvedHubName,
      status,
      isExternal,
      externalProvider: isExternal ? externalProvider.trim() : undefined
    };

    if (vehicle) {
      updateMutation.mutate({ id: vehicle.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[520px]' id='vehicle-form-dialog'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-lg font-bold'>
            <IconTruck className='h-5 w-5 text-primary' />
            {vehicle ? 'Chỉnh Sửa Thông Tin Xe' : 'Thêm Phương Tiện Mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 py-2'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label
                htmlFor='input-license-plate'
                className='text-xs font-semibold text-muted-foreground'
              >
                Biển Số Xe *
              </label>
              <Input
                id='input-license-plate'
                required
                placeholder='VD: 75H-051.21'
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
              />
            </div>
            <div className='space-y-1.5'>
              <label
                htmlFor='input-vehicle-model'
                className='text-xs font-semibold text-muted-foreground'
              >
                Mẫu Xe / Thương Hiệu
              </label>
              <Input
                id='input-vehicle-model'
                placeholder='VD: Volvo FH16'
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label
                htmlFor='select-vehicle-type'
                className='text-xs font-semibold text-muted-foreground'
              >
                Loại Xe *
              </label>
              <select
                id='select-vehicle-type'
                value={type}
                onChange={(e) => setType(e.target.value)}
                className='w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer'
              >
                <option value='CONTAINER_40FT'>Container 40ft</option>
                <option value='CONTAINER_20FT'>Container 20ft</option>
                <option value='TRUCK_8T'>Xe Tải 8 Tấn</option>
                <option value='TRUCK_5T'>Xe Tải 5 Tấn</option>
              </select>
            </div>
            <div className='space-y-1.5'>
              <label
                htmlFor='select-vehicle-status'
                className='text-xs font-semibold text-muted-foreground'
              >
                Trạng Thái *
              </label>
              <select
                id='select-vehicle-status'
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                className='w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer'
              >
                <option value='AVAILABLE'>Sẵn Sàng</option>
                <option value='IN_USE'>Đang Chạy Chuyến</option>
                <option value='MAINTENANCE'>Bảo Trì</option>
              </select>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label
                htmlFor='input-max-weight'
                className='text-xs font-semibold text-muted-foreground'
              >
                Tải Trọng Max (Kg) *
              </label>
              <Input
                id='input-max-weight'
                type='number'
                required
                value={maxWeight}
                onChange={(e) => setMaxWeight(Number(e.target.value))}
              />
            </div>
            <div className='space-y-1.5'>
              <label
                htmlFor='input-max-volume'
                className='text-xs font-semibold text-muted-foreground'
              >
                Thể Tích Max (m³) *
              </label>
              <Input
                id='input-max-volume'
                type='number'
                step='0.1'
                required
                value={maxVolume}
                onChange={(e) => setMaxVolume(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Hub Selection */}
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <label
                htmlFor='select-current-hub'
                className='text-xs font-semibold text-muted-foreground'
              >
                Kho / Hub Trực Thuộc
              </label>
              <select
                id='select-current-hub'
                value={hubId || ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setHubId(id);
                  const found = hubs.find((h) => h.id === id);
                  if (found) {
                    setCurrentHub(found.name);
                  }
                }}
                className='w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer'
              >
                <option value=''>-- Chọn Kho / Hub --</option>
                {hubs.map((hub) => (
                  <option key={hub.id} value={hub.id}>
                    {hub.name} ({hub.city})
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-1.5'>
              <label
                htmlFor='input-current-hub'
                className='text-xs font-medium text-muted-foreground'
              >
                Tên Hub / Vị trí hiện tại
              </label>
              <Input
                id='input-current-hub'
                placeholder='VD: Andromeda Hub (Hà Nội)'
                value={currentHub}
                onChange={(e) => setCurrentHub(e.target.value)}
              />
            </div>
          </div>

          {/* External Vehicle Section */}
          <div className='p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-lg space-y-2'>
            <div className='flex items-center gap-2'>
              <input
                type='checkbox'
                id='input-is-external'
                checked={isExternal}
                onChange={(e) => setIsExternal(e.target.checked)}
                className='h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer'
              />
              <label
                htmlFor='input-is-external'
                className='text-xs font-bold text-amber-900 dark:text-amber-300 cursor-pointer'
              >
                🚛 Đây là xe thuê ngoài (External Partner Vehicle)
              </label>
            </div>

            {isExternal && (
              <div className='space-y-1 pt-1'>
                <label
                  htmlFor='input-external-provider'
                  className='text-xs font-semibold text-amber-900 dark:text-amber-200'
                >
                  Tên Nhà Cung Cấp / Đối Tác Xe Ngoài *
                </label>
                <Input
                  id='input-external-provider'
                  placeholder='VD: Công ty TNHH Vận Tải Hoàng Long'
                  value={externalProvider}
                  onChange={(e) => setExternalProvider(e.target.value)}
                  required={isExternal}
                  className='bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800'
                />
              </div>
            )}
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
              id='btn-save-vehicle'
              disabled={isPending}
              className='cursor-pointer bg-primary text-primary-foreground'
            >
              {isPending ? 'Đang lưu...' : vehicle ? 'Cập Nhật Xe' : 'Tạo Xe Mới'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
