'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { IconMapPin, IconTruck } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { HubOption } from './warehouse-editable-grid';

export interface DestinationHubInfoCardProps {
  hub: HubOption;
  isXeBo?: boolean;
  onResetToOriginal?: () => void;
  onChangeDestination?: () => void;
  disabled?: boolean;
  className?: string;
}

export function DestinationHubInfoCard({
  hub,
  isXeBo = false,
  onResetToOriginal,
  onChangeDestination,
  disabled = false,
  className,
}: DestinationHubInfoCardProps) {
  const isActualXeBo =
    isXeBo ||
    hub.level === 2 ||
    hub.code?.startsWith('XB-') ||
    hub.code?.startsWith('HUB-BO-') ||
    hub.name?.toLowerCase().includes('xe bo');

  return (
    <div
      className={cn(
        'p-1.5 rounded-md border text-[10px] space-y-1 transition-all',
        isActualXeBo
          ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
          : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
        className
      )}
    >
      {/* Hàng 1: Huy hiệu phân cấp + Mã kho font-mono + Nút hoàn tác */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <Badge
            className={cn(
              'text-[9px] font-bold px-1.5 py-0 h-4 rounded',
              isActualXeBo ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
            )}
          >
            {isActualXeBo ? 'Tuyến Xe Bo' : 'Hub Cấp 1'}
          </Badge>
          <span
            className={cn(
              'font-mono font-bold text-[9px] px-1 py-0.5 rounded',
              isActualXeBo
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
            )}
          >
            {hub.code}
          </span>
        </div>
        {onResetToOriginal && !disabled && (
          <button
            type="button"
            onClick={onResetToOriginal}
            className="text-[9px] text-slate-500 hover:text-red-600 underline cursor-pointer shrink-0"
            title="Khôi phục lại địa chỉ giao ban đầu"
          >
            Quay lại địa chỉ thường
          </button>
        )}
      </div>

      {/* Hàng 2: Tên kho / Tuyến xe bo in đậm */}
      <div
        className="font-bold text-[11px] text-slate-900 dark:text-slate-100 truncate"
        title={hub.name}
      >
        {hub.name}
      </div>

      {/* Hàng 3: Vị trí địa lý (Tỉnh/TP + Địa chỉ chi tiết) */}
      <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400">
        {isActualXeBo ? (
          <IconTruck className="h-3 w-3 text-purple-600 shrink-0" />
        ) : (
          <IconMapPin className="h-3 w-3 text-blue-600 shrink-0" />
        )}
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {hub.city || 'Liên hệ điều phối'}
        </span>
        {hub.address && (
          <span
            className="truncate text-slate-500 dark:text-slate-400"
            title={hub.address}
          >
            · {hub.address}
          </span>
        )}
      </div>

      {/* Hàng 4: Vai trò vận hành */}
      <div className="text-[9px] text-slate-500 dark:text-slate-400 italic">
        {isActualXeBo
          ? 'Tuyến xe bo gom/trả hàng nội thành'
          : 'Trung tâm trung chuyển liên tỉnh'}
      </div>

      {/* Hàng 5: Nút bấm đổi kho đích khác */}
      {onChangeDestination && !disabled && (
        <button
          type="button"
          onClick={onChangeDestination}
          className={cn(
            'w-full text-center text-[9px] font-semibold py-0.5 border border-dashed rounded transition-colors cursor-pointer',
            isActualXeBo
              ? 'text-purple-600 hover:text-purple-800 dark:text-purple-400 border-purple-300 dark:border-purple-700 hover:bg-purple-100/50'
              : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-700 hover:bg-blue-100/50'
          )}
        >
          Đổi kho đích khác...
        </button>
      )}
    </div>
  );
}

export function resolveHubOption(
  rawHub: any,
  hubId: number | null | undefined,
  deliveryAddress: string | null | undefined,
  level1Hubs: HubOption[] = [],
  level2XeBoHubs: HubOption[] = [],
  deliveryMode?: string | null
): { hub: HubOption; isXeBo: boolean } {
  const allHubs = [...level1Hubs, ...level2XeBoHubs];

  // 1. Direct object if valid
  if (
    rawHub &&
    typeof rawHub === 'object' &&
    rawHub.name &&
    (rawHub.code || rawHub.city || rawHub.address)
  ) {
    const isXeBo =
      rawHub.level === 2 ||
      rawHub.code?.startsWith('XB-') ||
      rawHub.code?.startsWith('HUB-BO-') ||
      rawHub.name?.toLowerCase().includes('xe bo') ||
      deliveryMode === 'XE_BO';
    return {
      hub: {
        id: Number(rawHub.id) || 0,
        code: rawHub.code || (isXeBo ? 'XE-BO' : 'HUB-L1'),
        name: rawHub.name,
        city: rawHub.city || '',
        address: rawHub.address || null,
        level: rawHub.level || (isXeBo ? 2 : 1),
      },
      isXeBo,
    };
  }

  // 2. Lookup by hubId
  if (hubId) {
    const matched = allHubs.find((h) => Number(h.id) === Number(hubId));
    if (matched) {
      const isXeBo =
        matched.level === 2 ||
        matched.code?.startsWith('XB-') ||
        matched.code?.startsWith('HUB-BO-') ||
        matched.name?.toLowerCase().includes('xe bo') ||
        deliveryMode === 'XE_BO';
      return { hub: matched, isXeBo };
    }
  }

  // 3. Lookup by string matching
  const searchCandidates = [
    typeof rawHub === 'string' ? rawHub : '',
    deliveryAddress || '',
  ].filter(Boolean);

  for (const text of searchCandidates) {
    const cleanText = text.toLowerCase().trim();
    if (!cleanText) continue;

    // First try finding matching code in text
    const matchedByCode = allHubs.find(
      (h) => h.code && cleanText.includes(h.code.toLowerCase())
    );
    if (matchedByCode) {
      const isXeBo =
        matchedByCode.level === 2 ||
        matchedByCode.code?.startsWith('XB-') ||
        matchedByCode.code?.startsWith('HUB-BO-') ||
        matchedByCode.name?.toLowerCase().includes('xe bo') ||
        deliveryMode === 'XE_BO';
      return { hub: matchedByCode, isXeBo };
    }

    // Next try finding matching name in text
    const matchedByName = allHubs.find((h) => {
      const hName = h.name.toLowerCase();
      return cleanText.includes(hName) || hName.includes(cleanText.split('·')[0].trim());
    });
    if (matchedByName) {
      const isXeBo =
        matchedByName.level === 2 ||
        matchedByName.code?.startsWith('XB-') ||
        matchedByName.code?.startsWith('HUB-BO-') ||
        matchedByName.name?.toLowerCase().includes('xe bo') ||
        deliveryMode === 'XE_BO';
      return { hub: matchedByName, isXeBo };
    }
  }

  // 4. Safe fallback if not in active hubs list
  const isXeBo =
    deliveryMode === 'XE_BO' ||
    (deliveryAddress && deliveryAddress.toLowerCase().includes('xe bo')) ||
    (typeof rawHub === 'string' && rawHub.toLowerCase().includes('xe bo'));

  const parsedName =
    (deliveryAddress || (typeof rawHub === 'string' ? rawHub : ''))
      .split('·')[0]
      ?.trim() || (isXeBo ? 'Tuyến Xe Bo' : 'Hub Cấp 1');

  const fallbackHub: HubOption = {
    id: Number(hubId) || 0,
    code: isXeBo ? 'XE-BO' : 'HUB-L1',
    name: parsedName,
    city: 'Liên hệ điều phối',
    address: deliveryAddress || (typeof rawHub === 'string' ? rawHub : null),
    level: isXeBo ? 2 : 1,
  };

  return { hub: fallbackHub, isXeBo: !!isXeBo };
}
