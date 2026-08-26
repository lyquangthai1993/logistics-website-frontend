'use client';

import { useMemo } from 'react';
import { IconAlertTriangle, IconAlertCircle } from '@tabler/icons-react';
import type { Vehicle } from '@/features/fleet/api/types';

interface CapacityGaugeProps {
  allocatedWeight: number;
  allocatedVolume?: number;
  vehicle: Vehicle | null | undefined;
  showOverloadWarning?: boolean;
}

export function CapacityGauge({
  allocatedWeight,
  allocatedVolume = 0,
  vehicle,
  showOverloadWarning = true
}: CapacityGaugeProps) {
  const calculations = useMemo(() => {
    if (!vehicle || !vehicle.maxWeight) {
      return null;
    }

    const maxWeight = Number(vehicle.maxWeight);
    const weightRatio = Math.round((allocatedWeight / maxWeight) * 100);
    const isOverweight = allocatedWeight > maxWeight;

    let volumeRatio = 0;
    let isOvervolume = false;
    const maxVolume = vehicle.maxVolume ? Number(vehicle.maxVolume) : 0;
    if (maxVolume > 0 && allocatedVolume > 0) {
      volumeRatio = Math.round((allocatedVolume / maxVolume) * 100);
      isOvervolume = allocatedVolume > maxVolume;
    }

    return {
      maxWeight,
      weightRatio,
      isOverweight,
      maxVolume,
      volumeRatio,
      isOvervolume
    };
  }, [vehicle, allocatedWeight, allocatedVolume]);

  if (!vehicle || !calculations) {
    return null;
  }

  const { maxWeight, weightRatio, isOverweight, maxVolume, volumeRatio, isOvervolume } =
    calculations;

  const isOverloaded = isOverweight || isOvervolume;

  return (
    <div className='space-y-2.5'>
      {/* External Vehicle Alert */}
      {vehicle.isExternal && (
        <div className='p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 rounded-lg flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 font-medium'>
          <IconAlertCircle className='h-4 w-4 text-amber-600 shrink-0' />
          <span>
            <strong>🚛 XE THUÊ NGOÀI:</strong> Xe này thuộc nhà xe đối tác{' '}
            <span className='underline font-bold'>
              {vehicle.externalProvider || 'Đối tác ngoài'}
            </span>
            . Khi xác nhận, hệ thống sẽ gửi thông báo đến các bên liên quan.
          </span>
        </div>
      )}

      {/* Real-time Capacity Gauge Card */}
      <div className='p-3 bg-slate-50 dark:bg-slate-900/80 rounded-lg border border-slate-200/70 dark:border-slate-800 space-y-2'>
        <div className='flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300'>
          <span>Mức độ tải trọng xe (Capacity Utilization)</span>
          <span className='font-mono'>
            {allocatedWeight.toLocaleString()} / {maxWeight.toLocaleString()} kg ({weightRatio}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className='w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden'>
          <div
            className={`h-full transition-all duration-300 ${
              isOverweight ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, weightRatio)}%` }}
          />
        </div>

        {/* Volume utilization if available */}
        {maxVolume > 0 && allocatedVolume > 0 && (
          <div className='pt-1 border-t border-slate-200/50 dark:border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between'>
            <span>Thể tích hàng / Thể tích thùng:</span>
            <span className='font-mono'>
              {allocatedVolume} / {maxVolume} m³ ({volumeRatio}%)
            </span>
          </div>
        )}

        {/* Overload Alert */}
        {showOverloadWarning && isOverloaded && (
          <p className='text-[11px] text-rose-500 font-medium flex items-center gap-1 mt-1'>
            <IconAlertTriangle className='h-3.5 w-3.5 shrink-0' />
            Cảnh báo: Khối lượng đơn vượt quá tải trọng xe. Khuyến nghị bật Split Shipment để chia
            tải.
          </p>
        )}
      </div>
    </div>
  );
}
