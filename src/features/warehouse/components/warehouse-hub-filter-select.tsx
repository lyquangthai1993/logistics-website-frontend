'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  IconBuildingWarehouse,
  IconCheck,
  IconChevronDown,
  IconLoader2,
  IconSearch,
  IconTruck,
  IconX
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

function isSatelliteHub(h?: WarehouseHubOption): boolean {
  if (!h) return false;
  return Boolean(
    (h.level && h.level > 1) ||
    h.code?.startsWith('XB-') ||
    h.code?.startsWith('HUB-BO-') ||
    h.name?.toLowerCase().includes('xe bo')
  );
}

function getHubTypeBadge(h: WarehouseHubOption): {
  label: string;
  badgeClass: string;
  codeClass: string;
  isSatellite: boolean;
} {
  const isSatellite = isSatelliteHub(h);

  if (isSatellite) {
    return {
      label: 'Cấp 2 • Trạm Xe Bo',
      badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/25',
      codeClass:
        'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/60 dark:text-purple-300 dark:border-purple-800',
      isSatellite: true
    };
  }
  return {
    label: 'Cấp 1 • Hub Chính',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25',
    codeClass:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800',
    isSatellite: false
  };
}

export function WarehouseHubFilterSelect({
  value,
  onChange,
  hubs: externalHubs,
  className = ''
}: WarehouseHubFilterSelectProps) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const roleObj = typeof user?.role === 'object' && user?.role !== null ? (user.role as any) : null;
  const roleName = String(roleObj?.name || user?.role || '').toUpperCase();
  const isSuperAdmin =
    roleObj?.id === 1 ||
    roleName === 'SUPER_ADMIN' ||
    roleName === 'ADMIN' ||
    roleName.includes('ADMIN');

  const shouldFetch = isSuperAdmin && (!externalHubs || externalHubs.length === 0);

  const { data: fetchedHubs = [], isLoading } = useQuery<WarehouseHubOption[]>({
    queryKey: ['hubs', 'active'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/v1/hubs/active');
      const payload = res.data?.data ?? res.data ?? res;
      return Array.isArray(payload) ? payload : [];
    },
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000
  });

  const allHubs = useMemo(() => {
    const raw = externalHubs && externalHubs.length > 0 ? externalHubs : fetchedHubs;
    return [...raw].sort((a, b) => {
      const levelA = a.level || 1;
      const levelB = b.level || 1;
      if (levelA !== levelB) return levelA - levelB;
      return (a.name || '').localeCompare(b.name || '', 'vi');
    });
  }, [externalHubs, fetchedHubs]);

  const filteredHubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allHubs;
    return allHubs.filter((h) => {
      const name = (h.name || '').toLowerCase();
      const code = (h.code || '').toLowerCase();
      const city = (h.city || '').toLowerCase();
      const typeLabel = getHubTypeBadge(h).label.toLowerCase();
      return name.includes(q) || code.includes(q) || city.includes(q) || typeLabel.includes(q);
    });
  }, [allHubs, search]);

  if (!isSuperAdmin) {
    return null;
  }

  const normalizedValue = value && value !== 'ALL' ? String(value) : 'ALL';
  const isFiltered = normalizedValue !== 'ALL';
  const selectedHub = isFiltered
    ? allHubs.find((h) => String(h.id) === normalizedValue)
    : undefined;
  const isSelectedSatellite = isSatelliteHub(selectedHub);

  const handleSelectHub = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type='button'
              data-testid='warehouse-hub-filter-select'
              title='Super Admin: Lọc dữ liệu theo Kho / Trạm cụ thể'
              className={`h-8 text-xs px-2.5 gap-1.5 min-w-[185px] max-w-[260px] rounded-md border inline-flex items-center justify-between transition-colors cursor-pointer ${
                isFiltered
                  ? isSelectedSatellite
                    ? 'border-purple-500/60 bg-purple-50/70 text-purple-900 dark:border-purple-500/50 dark:bg-purple-950/40 dark:text-purple-200 font-bold shadow-2xs'
                    : 'border-blue-500/60 bg-blue-50/70 text-[#0F3D62] dark:border-blue-500/50 dark:bg-blue-950/40 dark:text-blue-300 font-bold shadow-2xs'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            />
          }
        >
          <div className='flex items-center gap-1.5 min-w-0 truncate'>
            {isFiltered && isSelectedSatellite ? (
              <IconTruck className='h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400' />
            ) : (
              <IconBuildingWarehouse className='h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400' />
            )}
            <span className='truncate'>
              {selectedHub
                ? `${selectedHub.name}${selectedHub.city ? ` (${selectedHub.city})` : ''}`
                : 'Tất cả kho'}
            </span>
          </div>
          <IconChevronDown className='h-3.5 w-3.5 shrink-0 opacity-60' />
        </PopoverTrigger>

        <PopoverContent
          side='bottom'
          align='end'
          sideOffset={6}
          className='w-80 p-2 gap-1.5 bg-white dark:bg-slate-900 border border-border shadow-xl'
        >
          {/* Header giống Đóng vai người dùng */}
          <div className='flex items-center justify-between border-b pb-1.5'>
            <div className='flex flex-col min-w-0'>
              <span className='text-xs font-semibold text-foreground'>Lọc dữ liệu theo kho</span>
              <span className='text-[10px] text-muted-foreground truncate'>
                {selectedHub
                  ? `Đang xem: ${selectedHub.name}${selectedHub.city ? ` • ${selectedHub.city}` : ''}`
                  : 'Chuyển nhanh góc nhìn theo Cấp 1 • Hub Chính / Cấp 2 • Trạm Xe Bo'}
              </span>
            </div>
            {isFiltered && (
              <Button
                type='button'
                variant='default'
                size='sm'
                onClick={() => handleSelectHub('ALL')}
                className='h-6 px-2 text-[10px] font-semibold bg-[#0F3D62] hover:bg-[#0c314f] text-white cursor-pointer shrink-0'
              >
                Tất cả kho
              </Button>
            )}
          </div>

          {/* Ô tìm kiếm kho nhanh */}
          <div className='relative'>
            <IconSearch className='text-muted-foreground absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2' />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Tìm tên kho, mã kho, tỉnh thành...'
              data-testid='warehouse-hub-filter-search'
              className='h-7 pl-7 pr-6 text-xs bg-background'
            />
            {search && (
              <button
                type='button'
                onClick={() => setSearch('')}
                className='text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2'
                title='Xóa từ khóa'
              >
                <IconX className='h-3 w-3' />
              </button>
            )}
          </div>

          {/* Danh sách kho cuộn dọc */}
          <div className='max-h-64 overflow-y-auto divide-y divide-border/60 rounded border bg-white dark:bg-slate-950'>
            {/* Tùy chọn Tất cả kho */}
            {(!search.trim() ||
              'tất cả kho toàn hệ thống all'.includes(search.trim().toLowerCase())) && (
              <button
                type='button'
                onClick={() => handleSelectHub('ALL')}
                data-testid='warehouse-hub-filter-item-all'
                className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-muted/70 transition-colors cursor-pointer ${
                  !isFiltered ? 'bg-slate-100/80 dark:bg-slate-800/60' : ''
                }`}
              >
                <div className='flex flex-col min-w-0 flex-1'>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-xs font-semibold text-foreground truncate'>
                      Tất cả kho
                    </span>
                    <span className='rounded border border-slate-200 bg-slate-100 px-1 py-0 text-[10px] font-mono font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'>
                      ALL
                    </span>
                  </div>
                  <div className='flex flex-wrap items-center gap-1 mt-0.5'>
                    <Badge
                      variant='outline'
                      className='text-[10px] px-1 py-0 h-4 bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25'
                    >
                      Toàn hệ thống
                    </Badge>
                    <span className='text-[10px] text-muted-foreground truncate'>
                      • Gộp tất cả Hub &amp; Trạm
                    </span>
                  </div>
                </div>
                <div className='shrink-0'>
                  {!isFiltered ? (
                    <IconCheck className='h-3.5 w-3.5 text-[#0F3D62] dark:text-blue-400' />
                  ) : (
                    <IconBuildingWarehouse className='h-3.5 w-3.5 text-slate-400' />
                  )}
                </div>
              </button>
            )}

            {isLoading ? (
              <div className='flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground'>
                <IconLoader2 className='h-3.5 w-3.5 animate-spin' />
                <span>Đang tải danh sách kho...</span>
              </div>
            ) : filteredHubs.length === 0 ? (
              <div className='py-3 text-center text-xs text-muted-foreground'>
                Không tìm thấy kho phù hợp
              </div>
            ) : (
              filteredHubs.map((h) => {
                const isSelected = String(h.id) === normalizedValue;
                const badgeInfo = getHubTypeBadge(h);
                const isSatellite = badgeInfo.isSatellite;

                return (
                  <button
                    key={h.id}
                    type='button'
                    onClick={() => handleSelectHub(String(h.id))}
                    data-testid={`warehouse-hub-filter-item-${h.id}`}
                    className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-muted/70 transition-colors cursor-pointer ${
                      isSelected
                        ? isSatellite
                          ? 'bg-purple-50/70 dark:bg-purple-950/40'
                          : 'bg-blue-50/70 dark:bg-blue-950/40'
                        : ''
                    }`}
                  >
                    <div className='flex flex-col min-w-0 flex-1'>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-xs font-semibold text-foreground truncate'>
                          {h.name}
                        </span>
                        {h.code && (
                          <span
                            className={`rounded border px-1 py-0 text-[10px] font-mono font-bold truncate ${badgeInfo.codeClass}`}
                          >
                            {h.code}
                          </span>
                        )}
                      </div>
                      <div className='flex flex-wrap items-center gap-1 mt-0.5'>
                        <Badge
                          variant='outline'
                          className={`text-[10px] px-1 py-0 h-4 ${badgeInfo.badgeClass}`}
                        >
                          {badgeInfo.label}
                        </Badge>
                        {h.city && (
                          <span className='text-[10px] text-muted-foreground truncate'>
                            • {h.city}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className='shrink-0'>
                      {isSelected ? (
                        <IconCheck
                          className={`h-3.5 w-3.5 ${
                            isSatellite
                              ? 'text-purple-600 dark:text-purple-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        />
                      ) : isSatellite ? (
                        <IconTruck className='h-3.5 w-3.5 text-purple-600/80 dark:text-purple-400/80' />
                      ) : (
                        <IconBuildingWarehouse className='h-3.5 w-3.5 text-blue-600/80 dark:text-blue-400/80' />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {isFiltered && (
        <button
          type='button'
          data-testid='warehouse-hub-filter-clear'
          onClick={() => handleSelectHub('ALL')}
          className={`h-8 w-7 inline-flex items-center justify-center rounded-md border transition-colors cursor-pointer ${
            isSelectedSatellite
              ? 'border-purple-200 bg-purple-50/60 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
              : 'border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
          }`}
          title='Bỏ lọc kho (Xem tất cả kho)'
        >
          <IconX className='h-3.5 w-3.5' />
        </button>
      )}
    </div>
  );
}
