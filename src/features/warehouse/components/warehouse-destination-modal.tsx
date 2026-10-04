'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconBuildingWarehouse,
  IconTruck,
  IconSearch,
  IconCheck,
  IconX,
  IconMapPin,
  IconArrowBackUp,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { HubOption } from './warehouse-editable-grid';

export interface WarehouseDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (hub: HubOption) => void;
  onResetToOriginal?: () => void;
  selectedHubId?: number | null;
  orderCode?: string;
  originalAddress?: string;
  currentAddress?: string;
  level1Hubs: HubOption[];
  level2XeBoHubs: HubOption[];
}

export function WarehouseDestinationModal({
  isOpen,
  onClose,
  onSelect,
  onResetToOriginal,
  selectedHubId,
  orderCode,
  originalAddress,
  currentAddress,
  level1Hubs = [],
  level2XeBoHubs = [],
}: WarehouseDestinationModalProps) {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'L1' | 'L2'>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setFilterTab('ALL');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  const q = search.toLowerCase().trim();

  const filteredL1 = level1Hubs.filter(
    (h) =>
      !q ||
      h.name.toLowerCase().includes(q) ||
      h.code.toLowerCase().includes(q) ||
      h.city.toLowerCase().includes(q) ||
      (h.address && h.address.toLowerCase().includes(q))
  );

  const filteredL2 = level2XeBoHubs.filter(
    (h) =>
      !q ||
      h.name.toLowerCase().includes(q) ||
      h.code.toLowerCase().includes(q) ||
      h.city.toLowerCase().includes(q) ||
      (h.address && h.address.toLowerCase().includes(q))
  );

  const totalResults = filteredL1.length + filteredL2.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#0F3D62] text-white">
              <IconBuildingWarehouse className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Chọn Đích Xuất Kho (Điều Chuyển Hub / Tuyến Xe Bo)
                </h2>
                {orderCode && (
                  <Badge
                    variant="outline"
                    className="font-mono font-bold text-blue-700 dark:text-blue-300 border-blue-300 bg-blue-50/60 dark:bg-blue-950/40 text-[10px] px-1.5 py-0"
                  >
                    {orderCode}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Chọn kho đích trung chuyển hoặc tuyến xe bo. Địa chỉ giao khách hàng gốc sẽ được lưu giữ nguyên vẹn.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            onClick={onClose}
          >
            <IconX className="h-4 w-4" />
          </Button>
        </div>

        {/* Search & Filter Tabs */}
        <div className="p-2 border-b bg-white dark:bg-slate-950 space-y-1.5">
          <div className="relative">
            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm Hub Cấp 1 hoặc Tuyến Xe Bo (tên kho, mã, tỉnh thành, địa chỉ)..."
              className="h-8 pl-8 pr-7 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={cn(
                'px-2 py-1 rounded text-[10px] font-semibold transition-colors',
                filterTab === 'ALL'
                  ? 'bg-[#0F3D62] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              Tất cả ({totalResults})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('L1')}
              className={cn(
                'px-2 py-1 rounded text-[10px] font-semibold transition-colors flex items-center gap-1',
                filterTab === 'L1'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40'
              )}
            >
              <IconBuildingWarehouse className="h-3 w-3" />
              Hub Cấp 1 - Trung chuyển ({filteredL1.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('L2')}
              className={cn(
                'px-2 py-1 rounded text-[10px] font-semibold transition-colors flex items-center gap-1',
                filterTab === 'L2'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40'
              )}
            >
              <IconTruck className="h-3 w-3" />
              Tuyến Xe Bo - Vệ tinh ({filteredL2.length})
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-2.5 max-h-[60vh] overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
          {totalResults === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 space-y-1">
              <IconBuildingWarehouse className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
              <div className="text-xs font-medium">
                Không tìm thấy Hub hoặc Tuyến Xe Bo nào phù hợp với từ khóa &ldquo;{search}&rdquo;
              </div>
              <div className="text-[10px]">Vui lòng thử tìm kiếm bằng mã kho, tên tỉnh thành hoặc từ khóa khác.</div>
            </div>
          ) : (
            <>
              {/* Section 1: Level 1 Hubs */}
              {(filterTab === 'ALL' || filterTab === 'L1') && filteredL1.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white uppercase tracking-wider">
                        1. Trung tâm trung chuyển (Hub Cấp 1)
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        (Ưu tiên hàng đầu cho các chuyến xe trung chuyển liên tỉnh &amp; liên vùng)
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                      {filteredL1.length} Hub
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {filteredL1.map((hub) => {
                      const isSelected = selectedHubId === hub.id;
                      return (
                        <div
                          key={hub.id}
                          onClick={() => {
                            onSelect(hub);
                            onClose();
                          }}
                          className={cn(
                            'p-2 rounded-md border text-left cursor-pointer transition-all space-y-1 bg-white dark:bg-slate-900',
                            isSelected
                              ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-blue-500 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-800/80'
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                                {hub.code}
                              </span>
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                {hub.name}
                              </span>
                            </div>
                            {isSelected && (
                              <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0 flex items-center gap-0.5 shrink-0">
                                <IconCheck className="h-3 w-3" /> Đang chọn
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                            <IconMapPin className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">{hub.city}</span>
                            {hub.address && <span className="truncate">· {hub.address}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 2: Level 2 Xe Bo Hubs */}
              {(filterTab === 'ALL' || filterTab === 'L2') && filteredL2.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-purple-600 text-white uppercase tracking-wider">
                        2. Tuyến Xe Bo Vệ Tinh (Cấp 2)
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        (Phục vụ phân bổ gom hàng nội thành &amp; giao chặng cuối)
                      </span>
                    </div>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                      {filteredL2.length} Tuyến
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {filteredL2.map((hub) => {
                      const isSelected = selectedHubId === hub.id;
                      return (
                        <div
                          key={hub.id}
                          onClick={() => {
                            onSelect(hub);
                            onClose();
                          }}
                          className={cn(
                            'p-2 rounded-md border text-left cursor-pointer transition-all space-y-1 bg-white dark:bg-slate-900',
                            isSelected
                              ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 ring-1 ring-purple-500 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:border-purple-400 hover:bg-purple-50/40 dark:hover:bg-slate-800/80'
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[10px] px-1 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                                {hub.code}
                              </span>
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                {hub.name}
                              </span>
                            </div>
                            {isSelected && (
                              <Badge className="bg-purple-600 text-white text-[9px] px-1.5 py-0 flex items-center gap-0.5 shrink-0">
                                <IconCheck className="h-3 w-3" /> Đang chọn
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                            <IconTruck className="h-3 w-3 text-purple-500 shrink-0" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">{hub.city}</span>
                            {hub.address && <span className="truncate">· {hub.address}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t bg-slate-50 dark:bg-slate-900/80">
          <div>
            {onResetToOriginal && (originalAddress || selectedHubId) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onResetToOriginal();
                  onClose();
                }}
                className="h-7 px-2 text-[10px] text-slate-600 dark:text-slate-300 hover:text-red-600 hover:border-red-300"
              >
                <IconArrowBackUp className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Quay lại địa chỉ khách ban đầu
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-7 px-3 text-xs"
            >
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
