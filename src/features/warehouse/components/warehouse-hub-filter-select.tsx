'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { IconBuildingWarehouse, IconX } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { apiClient } from '@/lib/api-client';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export interface WarehouseHubOption {
  id: number;
  code?: string;
  name: string;
  city?: string | null;
  level?: number;
}

export interface WarehouseHubFilterSelectProps {
  value: string;
  onChange: (hubId: string) => void;
  hubs?: WarehouseHubOption[];
  className?: string;
}

export function WarehouseHubFilterSelect({
  value,
  onChange,
  hubs: externalHubs,
  className = ''
}: WarehouseHubFilterSelectProps) {
  const { user } = useAuthStore();

  const roleObj = typeof user?.role === 'object' && user?.role !== null ? (user.role as any) : null;
  const roleName = String(roleObj?.name || user?.role || '').toUpperCase();
  const isSuperAdmin =
    roleObj?.id === 1 ||
    roleName === 'SUPER_ADMIN' ||
    roleName === 'ADMIN' ||
    roleName.includes('ADMIN');

  const shouldFetch = isSuperAdmin && (!externalHubs || externalHubs.length === 0);

  const { data: fetchedHubs = [] } = useQuery<WarehouseHubOption[]>({
    queryKey: ['hubs', 'active'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/v1/hubs/active');
      const payload = res.data?.data ?? res.data ?? res;
      return Array.isArray(payload) ? payload : [];
    },
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000
  });

  if (!isSuperAdmin) {
    return null;
  }

  const allHubs = externalHubs && externalHubs.length > 0 ? externalHubs : fetchedHubs;
  const mainHubs = allHubs.filter((h) => !h.level || h.level === 1);
  const satelliteHubs = allHubs.filter((h) => h.level && h.level > 1);

  const normalizedValue = value && value !== 'ALL' ? String(value) : 'ALL';
  const isFiltered = normalizedValue !== 'ALL';
  const selectedHub = isFiltered
    ? allHubs.find((h) => String(h.id) === normalizedValue)
    : undefined;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <Select value={normalizedValue} onValueChange={(val) => onChange(val || 'ALL')}>
        <SelectTrigger
          data-testid='warehouse-hub-filter-select'
          className={`h-8 text-xs font-semibold px-2.5 gap-1.5 min-w-[185px] max-w-[260px] transition-colors ${
            isFiltered
              ? 'border-blue-500/60 bg-blue-50/70 text-[#0F3D62] dark:border-blue-500/50 dark:bg-blue-950/40 dark:text-blue-300 font-bold'
              : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
          }`}
          title='Super Admin: Lọc dữ liệu theo Kho / Trạm cụ thể'
        >
          <IconBuildingWarehouse className='h-3.5 w-3.5 shrink-0 text-[#0F3D62] dark:text-blue-400' />
          <span className='truncate'>
            {selectedHub
              ? `${selectedHub.name}${selectedHub.city ? ` (${selectedHub.city})` : ''}`
              : 'Tất cả kho'}
          </span>
        </SelectTrigger>
        <SelectContent align='end' className='max-h-[320px]'>
          <SelectItem value='ALL' className='text-xs font-bold text-[#0F3D62] dark:text-blue-300'>
            Tất cả kho (Toàn hệ thống)
          </SelectItem>
          {mainHubs.length > 0 && (
            <SelectGroup>
              <SelectLabel className='text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1'>
                Hub chính (Kho trung tâm)
              </SelectLabel>
              {mainHubs.map((h) => (
                <SelectItem key={h.id} value={String(h.id)} className='text-xs'>
                  {h.name}
                  {h.city ? ` (${h.city})` : ''}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {satelliteHubs.length > 0 && (
            <SelectGroup>
              <SelectLabel className='text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1'>
                Trạm Xe Bo / Vệ tinh
              </SelectLabel>
              {satelliteHubs.map((h) => (
                <SelectItem key={h.id} value={String(h.id)} className='text-xs'>
                  {h.name}
                  {h.city ? ` (${h.city})` : ''}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      {isFiltered && (
        <button
          type='button'
          data-testid='warehouse-hub-filter-clear'
          onClick={() => onChange('ALL')}
          className='h-8 w-7 inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 transition-colors'
          title='Bỏ lọc kho (Xem tất cả kho)'
        >
          <IconX className='h-3.5 w-3.5' />
        </button>
      )}
    </div>
  );
}
