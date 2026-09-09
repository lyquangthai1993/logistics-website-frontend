'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type ColumnPinningState,
  type CellContext,
  type RowData,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconPlus,
  IconPrinter,
  IconTrash,
  IconSearch,
  IconCopy,
  IconRefresh,
  IconFileSpreadsheet,
  IconChevronDown,
  IconCheck,
  IconX,
  IconTruck,
  IconBuildingWarehouse,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/use-auth-store';
import { PalletLabelA4Modal, PalletLabelData } from './pallet-label-a4-modal';
import { WarehouseLookupModal, WarehouseLookupItem } from './warehouse-lookup-modal';

export interface HubOption {
  id: number;
  code: string;
  name: string;
  city: string;
  level: number;
  address?: string | null;
}

export interface WarehouseRowItem {
  id?: number | string;
  orderCode: string;
  pickupAddress: string;
  goodsDescription: string;
  totalQuantity: number;
  totalWeight: number;
  totalVolume: number;
  deliveryMode: 'DIRECT_CUSTOMER' | 'HUB_L1' | 'XE_BO';
  deliveryAddress: string;
  destinationHubId?: number | null;
  notes: string;
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
    updateRow: (rowIndex: number, row: WarehouseRowItem) => void;
    duplicateRow?: (rowIndex: number) => void;
    deleteRow?: (rowIndex: number) => void;
    openPrintLabel?: (data: PalletLabelData) => void;
    openLookup?: (rowIndex: number) => void;
    level1Hubs?: HubOption[];
    level2XeBoHubs?: HubOption[];
    isOutboundMode?: boolean;
    rowsCount?: number;
  }
}

interface WarehouseEditableGridProps {
  rows: WarehouseRowItem[];
  onChange: (rows: WarehouseRowItem[]) => void;
  isOutboundMode?: boolean;
  onRefreshMetrics?: () => void;
  isLoadingMetrics?: boolean;
  showAddressHint?: boolean;
}

interface SearchableHubSelectProps {
  value?: number | null;
  deliveryAddress?: string;
  options: HubOption[];
  onSelect: (hub: HubOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  type: 'HUB_L1' | 'XE_BO';
}

function SearchableHubSelect({
  value,
  deliveryAddress,
  options,
  onSelect,
  placeholder = 'Chọn điểm giao...',
  searchPlaceholder = 'Tìm kiếm tên, mã, tỉnh thành...',
  type,
}: SearchableHubSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Match selected hub/xe bo
  const selected =
    options.find((o) => o.id === value) ||
    options.find(
      (o) => deliveryAddress && (deliveryAddress.includes(o.name) || deliveryAddress.includes(o.code)),
    ) ||
    options[0];

  const searchLower = search.toLowerCase().trim();
  const filtered = options.filter((o) => {
    if (!searchLower) return true;
    return (
      o.name.toLowerCase().includes(searchLower) ||
      o.code.toLowerCase().includes(searchLower) ||
      o.city.toLowerCase().includes(searchLower)
    );
  });

  const isXeBo = type === 'XE_BO';

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'w-full h-[32px] text-xs font-semibold rounded-md px-2 border flex items-center justify-between text-left transition-all',
          'bg-[#F8FAFC] dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800',
          isXeBo
            ? 'border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 focus:ring-1 focus:ring-purple-500'
            : 'border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 focus:ring-1 focus:ring-blue-500',
          open && 'ring-2 ring-blue-400 dark:ring-blue-600 border-transparent shadow-sm',
        )}
      >
        <div className="flex items-center gap-1.5 truncate">
          {isXeBo ? (
            <IconTruck className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
          ) : (
            <IconBuildingWarehouse className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
          )}
          <span className="truncate">
            {selected ? `${selected.name} (${selected.city})` : placeholder}
          </span>
        </div>
        <IconChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ml-1',
            open && 'rotate-180 text-blue-600',
          )}
        />
      </button>

      {/* Dropdown Menu with Live Search */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] w-80 max-w-[90vw] z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-2 space-y-2 animate-in fade-in-0 zoom-in-95">
          {/* Search Bar */}
          <div className="relative">
            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <IconX className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Header count info */}
          <div className="flex items-center justify-between px-1 text-[10px] text-slate-500 dark:text-slate-400 border-b pb-1.5 dark:border-slate-800">
            <span className="font-semibold uppercase tracking-wider">
              {isXeBo ? 'Danh sách Tuyến Xe bo' : 'Danh sách Hub cấp 1'}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 h-4 font-mono font-bold',
                isXeBo
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200',
              )}
            >
              {filtered.length} {isXeBo ? 'xe bo' : 'hubs'}
            </Badge>
          </div>

          {/* List Options */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Không tìm thấy {isXeBo ? 'tuyến xe bo' : 'hub'} nào với từ khóa "{search}"
              </div>
            ) : (
              filtered.map((item) => {
                const isItemActive = selected?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full text-left p-2 rounded-md transition-colors flex items-start justify-between text-xs',
                      isItemActive
                        ? isXeBo
                          ? 'bg-purple-50 text-purple-900 dark:bg-purple-950/50 dark:text-purple-100 font-semibold'
                          : 'bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100 font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
                    )}
                  >
                    <div className="min-w-0 pr-2 space-y-0.5">
                      <div className="truncate font-medium flex items-center gap-1.5">
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                          {item.code}
                        </span>
                        <span>&bull;</span>
                        <span>{item.city}</span>
                      </div>
                    </div>
                    {isItemActive && (
                      <IconCheck
                        className={cn(
                          'h-4 w-4 shrink-0 mt-0.5',
                          isXeBo ? 'text-purple-600' : 'text-blue-600',
                        )}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stable Cell Components (Defined Outside to Prevent Unmounting & Focus Loss) ──

function SttCell({ row }: CellContext<WarehouseRowItem, unknown>) {
  return (
    <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
      {(row.index + 1).toString().padStart(2, '0')}
    </span>
  );
}

function OrderCodeCell({ row, table }: CellContext<WarehouseRowItem, unknown>) {
  const r = row.original;
  const idx = row.index;
  const meta = table.options.meta;
  const isOutbound = meta?.isOutboundMode;

  if (isOutbound) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={r.orderCode}
          readOnly
          placeholder="Chọn mã đơn..."
          className="h-7 text-xs font-mono font-bold bg-slate-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => meta?.openLookup?.(idx)}
          className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 shrink-0"
          title="Tra cứu kho để gán mã đơn"
        >
          <IconSearch className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[30px] flex items-center justify-center px-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md">
      <span className="text-[10px] font-semibold text-slate-500 font-mono tracking-tight">
        {r.orderCode && r.orderCode !== '(Tự sinh khi lưu)' ? r.orderCode : 'Tự sinh · khóa'}
      </span>
    </div>
  );
}

function PickupAddressCell({
  getValue,
  row,
  column,
  table,
}: CellContext<WarehouseRowItem, string>) {
  const initialValue = getValue() ?? '';
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setValue(nextVal);
    table.options.meta?.updateData(row.index, column.id, nextVal);
  };

  return (
    <textarea
      rows={2}
      value={value}
      onChange={handleChange}
      placeholder="Địa chỉ / Hub nhận hàng..."
      className="w-full text-xs rounded-md border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-900 p-1.5 resize-none text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-normal min-h-[58px]"
    />
  );
}

function GoodsDescriptionCell({
  getValue,
  row,
  column,
  table,
}: CellContext<WarehouseRowItem, string>) {
  const initialValue = getValue() ?? '';
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setValue(nextVal);
    table.options.meta?.updateData(row.index, column.id, nextVal);
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={handleChange}
        placeholder="Tên loại hàng..."
        className="h-[30px] pr-6 text-xs font-medium border-slate-300 dark:border-slate-700"
      />
    </div>
  );
}

function QuantityCell({
  getValue,
  row,
  column,
  table,
}: CellContext<WarehouseRowItem, number>) {
  const initialValue = getValue() ?? 1;
  const [value, setValue] = useState<string | number>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setValue(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      table.options.meta?.updateData(row.index, column.id, parsed);
    }
  };

  const handleBlur = () => {
    if (value === '' || isNaN(Number(value)) || Number(value) < 1) {
      setValue(1);
      table.options.meta?.updateData(row.index, column.id, 1);
    }
  };

  return (
    <Input
      type="number"
      min={1}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      className="h-[30px] px-2 text-xs text-right font-bold border-slate-300 dark:border-slate-700"
    />
  );
}

function WeightCell({
  getValue,
  row,
  column,
  table,
}: CellContext<WarehouseRowItem, number>) {
  const initialValue = getValue() ?? 0;
  const [value, setValue] = useState<string | number>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setValue(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      table.options.meta?.updateData(row.index, column.id, parsed);
    }
  };

  const handleBlur = () => {
    if (value === '' || isNaN(Number(value))) {
      setValue(0);
      table.options.meta?.updateData(row.index, column.id, 0);
    }
  };

  return (
    <Input
      type="number"
      step="any"
      min={0}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      className="h-[30px] px-2 text-xs text-right font-bold border-slate-300 dark:border-slate-700"
    />
  );
}

function VolumeCell({
  getValue,
  row,
  column,
  table,
}: CellContext<WarehouseRowItem, number>) {
  const initialValue = getValue() ?? 0;
  const [value, setValue] = useState<string | number>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setValue(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      table.options.meta?.updateData(row.index, column.id, parsed);
    }
  };

  const handleBlur = () => {
    if (value === '' || isNaN(Number(value))) {
      setValue(0);
      table.options.meta?.updateData(row.index, column.id, 0);
    }
  };

  return (
    <Input
      type="number"
      step="0.01"
      min={0}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      className="h-[30px] px-2 text-xs text-right font-bold border-slate-300 dark:border-slate-700"
    />
  );
}

function DeliveryAddressCell({
  row,
  table,
}: CellContext<WarehouseRowItem, unknown>) {
  const r = row.original;
  const idx = row.index;
  const meta = table.options.meta;
  const level1Hubs = meta?.level1Hubs || [];
  const level2XeBoHubs = meta?.level2XeBoHubs || [];

  const [addressText, setAddressText] = useState(r.deliveryAddress || '');

  useEffect(() => {
    setAddressText(r.deliveryAddress || '');
  }, [r.deliveryAddress]);

  const handleModeChange = (newMode: 'DIRECT_CUSTOMER' | 'HUB_L1' | 'XE_BO') => {
    let newAddress = r.deliveryAddress;
    let destId = r.destinationHubId;

    if (newMode === 'HUB_L1') {
      const currentMatch = level1Hubs.find((h) => newAddress?.includes(h.name) || h.id === destId);
      const targetHub = currentMatch || level1Hubs[0];
      if (targetHub) {
        newAddress = `${targetHub.name} · nhận trung chuyển`;
        destId = targetHub.id;
      }
    } else if (newMode === 'XE_BO') {
      const currentMatch = level2XeBoHubs.find((h) => newAddress?.includes(h.name) || h.id === destId);
      const targetXeBo = currentMatch || level2XeBoHubs[0];
      if (targetXeBo) {
        newAddress = `${targetXeBo.name} · gom hàng tuyến nội thành`;
        destId = targetXeBo.id;
      }
    }

    meta?.updateRow(idx, {
      ...r,
      deliveryMode: newMode,
      deliveryAddress: newAddress,
      destinationHubId: destId,
    });
  };

  const handleHubSelect = (selectedHub: HubOption) => {
    meta?.updateRow(idx, {
      ...r,
      destinationHubId: selectedHub.id,
      deliveryAddress: `${selectedHub.name} · nhận trung chuyển`,
    });
  };

  const handleXeBoSelect = (selectedXeBo: HubOption) => {
    meta?.updateRow(idx, {
      ...r,
      destinationHubId: selectedXeBo.id,
      deliveryAddress: `${selectedXeBo.name} · gom hàng tuyến nội thành`,
    });
  };

  const handleAddressTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setAddressText(nextVal);
    meta?.updateData(idx, 'deliveryAddress', nextVal);
  };

  return (
    <div className="space-y-1.5">
      {/* Top Tier: Mode Selector */}
      <select
        value={r.deliveryMode}
        onChange={(e) => handleModeChange(e.target.value as any)}
        className="w-full h-7 text-xs font-bold text-[#1E3A8A] dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-500 dark:border-blue-600 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="DIRECT_CUSTOMER">Địa chỉ thường</option>
        <option value="HUB_L1">Hub cấp 1</option>
        <option value="XE_BO">Xe bo</option>
      </select>

      {/* Bottom Tier: Mode-specific selector or input */}
      {r.deliveryMode === 'HUB_L1' ? (
        <div className="space-y-1">
          <SearchableHubSelect
            type="HUB_L1"
            value={r.destinationHubId}
            deliveryAddress={r.deliveryAddress}
            options={level1Hubs}
            placeholder="Chọn Hub cấp 1..."
            searchPlaceholder="Tìm Hub (tên, mã, tỉnh)..."
            onSelect={handleHubSelect}
          />
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium px-1 truncate">
            Đích: {r.deliveryAddress || (level1Hubs[0] ? `${level1Hubs[0].name} · nhận trung chuyển` : 'Chưa chọn Hub')}
          </div>
        </div>
      ) : r.deliveryMode === 'XE_BO' ? (
        <div className="space-y-1">
          <SearchableHubSelect
            type="XE_BO"
            value={r.destinationHubId}
            deliveryAddress={r.deliveryAddress}
            options={level2XeBoHubs}
            placeholder="Chọn Tuyến xe bo..."
            searchPlaceholder="Tìm Tuyến xe bo (tên, mã, tỉnh)..."
            onSelect={handleXeBoSelect}
          />
          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium px-1 truncate">
            Tuyến: {r.deliveryAddress || (level2XeBoHubs[0] ? `${level2XeBoHubs[0].name} · gom hàng tuyến nội thành` : 'Chưa chọn Xe bo')}
          </div>
        </div>
      ) : (
        <textarea
          rows={2}
          value={addressText}
          onChange={handleAddressTextChange}
          placeholder="25 Nguyễn Văn Linh, Q.7, TP.HCM..."
          className="w-full text-[11px] rounded-md border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/80 p-1.5 resize-none text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-normal min-h-[50px]"
        />
      )}
    </div>
  );
}

function NotesCell({
  getValue,
  row,
  column,
  table,
}: CellContext<WarehouseRowItem, string>) {
  const initialValue = getValue() ?? '';
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setValue(nextVal);
    table.options.meta?.updateData(row.index, column.id, nextVal);
  };

  return (
    <textarea
      rows={2}
      value={value}
      onChange={handleChange}
      placeholder="Ghi chú bốc dỡ, lưu ý..."
      className="w-full text-xs rounded-md border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-900 p-1.5 resize-none text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-normal min-h-[58px]"
    />
  );
}

function ActionsCell({ row, table }: CellContext<WarehouseRowItem, unknown>) {
  const r = row.original;
  const idx = row.index;
  const meta = table.options.meta;
  const rowsCount = meta?.rowsCount ?? 1;

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() =>
          meta?.openPrintLabel?.({
            orderCode: r.orderCode && r.orderCode !== '(Tự sinh khi lưu)' ? r.orderCode : 'LTV2609-0025',
            goodsDescription: r.goodsDescription || 'Hàng hóa tổng quan',
            totalQuantity: r.totalQuantity || 1,
            originHub: r.pickupAddress,
            destinationHub: r.deliveryAddress,
            createdAt: new Date(),
          })
        }
        className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-800"
        title="In tem nhận diện A4"
      >
        <IconPrinter className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => meta?.duplicateRow?.(idx)}
        className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Nhân bản dòng"
      >
        <IconCopy className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={rowsCount <= 1}
        onClick={() => meta?.deleteRow?.(idx)}
        className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-30"
        title="Xóa dòng"
      >
        <IconTrash className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function WarehouseEditableGrid({
  rows,
  onChange,
  isOutboundMode = false,
  onRefreshMetrics,
  isLoadingMetrics = false,
  showAddressHint = true,
}: WarehouseEditableGridProps) {
  const [printLabelData, setPrintLabelData] = useState<PalletLabelData | null>(null);
  const [lookupRowIndex, setLookupRowIndex] = useState<number | null>(null);
  const [hubs, setHubs] = useState<HubOption[]>([
    { id: 1, code: 'HUB-HYN-01', name: 'Polaris Hub - Hưng Yên', city: 'Hưng Yên', level: 1 },
    { id: 2, code: 'HUB-DAD-01', name: 'Magellan Hub - Đà Nẵng', city: 'Đà Nẵng', level: 1 },
    { id: 3, code: 'HUB-HCM-01', name: 'Andromeda Hub - HCM', city: 'TP. Hồ Chí Minh', level: 1 },
    { id: 100, code: 'HUB-BO-HCM-01', name: 'Xe bo Tuyến HCM', city: 'TP. Hồ Chí Minh', level: 2 },
    { id: 101, code: 'HUB-BO-DAD-01', name: 'Xe bo Tuyến Đà Nẵng', city: 'Đà Nẵng', level: 2 },
    { id: 102, code: 'HUB-BO-HYN-01', name: 'Xe bo Tuyến Hưng Yên', city: 'Hưng Yên', level: 2 },
    { id: 103, code: 'HUB-BO-HAN-01', name: 'Xe bo Tuyến Hà Nội', city: 'TP. Hà Nội', level: 2 },
    { id: 104, code: 'HUB-BO-HPH-01', name: 'Xe bo Tuyến Hải Phòng', city: 'TP. Hải Phòng', level: 2 },
    { id: 105, code: 'HUB-BO-CTH-01', name: 'Xe bo Tuyến Cần Thơ', city: 'TP. Cần Thơ', level: 2 },
    { id: 106, code: 'HUB-BO-HUE-01', name: 'Xe bo Tuyến Huế', city: 'TP. Huế', level: 2 },
    { id: 107, code: 'HUB-BO-BNI-01', name: 'Xe bo Tuyến Bắc Ninh', city: 'Bắc Ninh', level: 2 },
  ]);

  // Fetch active hubs list for Level 1 & Level 2 dropdowns
  React.useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? useAuthStore.getState()?.accessToken ||
          localStorage.getItem('access_token') ||
          document.cookie.match(/(?:^|; )access_token=([^;]*)/)?.[1]
        : null;

    fetch('/api/v1/hubs/active', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        const data = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(data) && data.length > 0) {
          setHubs(data);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch active hubs:', err);
      });
  }, []);

  const level1Hubs = hubs.filter((h) => h.level === 1 || !h.code.startsWith('HUB-BO-'));
  const level2XeBoHubs = hubs.filter((h) => h.level === 2 || h.code.startsWith('HUB-BO-'));

  // Update a single field in a specific row
  const updateData = useCallback(
    (rowIndex: number, columnId: string, value: unknown) => {
      onChange(
        rows.map((row, index) => {
          if (index === rowIndex) {
            return {
              ...row,
              [columnId]: value,
            };
          }
          return row;
        }),
      );
    },
    [rows, onChange],
  );

  // Update an entire row object
  const updateRow = useCallback(
    (rowIndex: number, updatedRow: WarehouseRowItem) => {
      onChange(
        rows.map((row, index) => {
          if (index === rowIndex) {
            return updatedRow;
          }
          return row;
        }),
      );
    },
    [rows, onChange],
  );

  // Add new empty row
  const handleAddRow = () => {
    const newRow: WarehouseRowItem = {
      orderCode: isOutboundMode ? '' : '(Tự sinh khi lưu)',
      pickupAddress: 'Kho tiếp nhận',
      goodsDescription: '',
      totalQuantity: 10,
      totalWeight: 200,
      totalVolume: 1.0,
      deliveryMode: 'DIRECT_CUSTOMER',
      deliveryAddress: '',
      notes: '',
    };
    onChange([...rows, newRow]);
  };

  // Delete row
  const handleDeleteRow = useCallback(
    (index: number) => {
      if (rows.length <= 1) return;
      const updated = rows.filter((_, i) => i !== index);
      onChange(updated);
    },
    [rows, onChange],
  );

  // Duplicate row
  const handleDuplicateRow = useCallback(
    (index: number) => {
      const target = rows[index];
      const duplicated: WarehouseRowItem = {
        ...target,
        orderCode: isOutboundMode ? '' : '(Tự sinh khi lưu)',
      };
      const updated = [...rows];
      updated.splice(index + 1, 0, duplicated);
      onChange(updated);
    },
    [rows, onChange, isOutboundMode],
  );

  // Smart Paste from Excel (TSV clipboard)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData('text');
      if (!text || !text.includes('\t')) return;

      e.preventDefault();
      const lines = text.trim().split(/\r?\n/);
      const parsedRows: WarehouseRowItem[] = lines.map((line) => {
        const cols = line.split('\t');
        return {
          orderCode: isOutboundMode ? cols[0]?.trim() || '' : '(Tự sinh khi lưu)',
          pickupAddress: cols[1]?.trim() || 'Kho tiếp nhận',
          goodsDescription: cols[2]?.trim() || 'Hàng hóa tiếp nhận',
          totalQuantity: parseInt(cols[3]?.trim(), 10) || 10,
          totalWeight: parseFloat(cols[4]?.trim().replace(/,/g, '')) || 100,
          totalVolume: parseFloat(cols[5]?.trim().replace(/,/g, '')) || 0.5,
          deliveryMode: 'DIRECT_CUSTOMER',
          deliveryAddress: cols[6]?.trim() || '',
          notes: cols[7]?.trim() || '',
        };
      });

      if (parsedRows.length > 0) {
        onChange(parsedRows);
      }
    },
    [isOutboundMode, onChange],
  );

  // Trigger manual paste notification
  const handleManualPaste = () => {
    navigator.clipboard?.readText().then((text) => {
      if (text && text.includes('\t')) {
        const lines = text.trim().split(/\r?\n/);
        const parsedRows: WarehouseRowItem[] = lines.map((line) => {
          const cols = line.split('\t');
          return {
            orderCode: isOutboundMode ? cols[0]?.trim() || '' : '(Tự sinh khi lưu)',
            pickupAddress: cols[1]?.trim() || 'Kho tiếp nhận',
            goodsDescription: cols[2]?.trim() || 'Hàng hóa tiếp nhận',
            totalQuantity: parseInt(cols[3]?.trim(), 10) || 10,
            totalWeight: parseFloat(cols[4]?.trim().replace(/,/g, '')) || 100,
            totalVolume: parseFloat(cols[5]?.trim().replace(/,/g, '')) || 0.5,
            deliveryMode: 'DIRECT_CUSTOMER',
            deliveryAddress: cols[6]?.trim() || '',
            notes: cols[7]?.trim() || '',
          };
        });
        if (parsedRows.length > 0) {
          onChange(parsedRows);
        }
      }
    }).catch(() => {});
  };

  // Handle selected order from lookup modal
  const handleSelectFromLookup = (order: WarehouseLookupItem) => {
    if (lookupRowIndex === null) return;
    const updated = [...rows];
    updated[lookupRowIndex] = {
      ...updated[lookupRowIndex],
      id: order.id,
      orderCode: order.orderCode,
      goodsDescription: order.goodsDescription || '',
      totalQuantity: order.totalQuantity || 1,
      totalWeight: order.totalWeight || 0,
      totalVolume: order.totalVolume || 0,
      deliveryAddress: order.destinationHub || order.route || order.deliveryAddress || '',
    };
    onChange(updated);
    setLookupRowIndex(null);
  };

  // Calculate totals for top summary badge
  const totalPackages = rows.reduce((sum, r) => sum + (Number(r.totalQuantity) || 0), 0);
  const totalWeight = rows.reduce((sum, r) => sum + (Number(r.totalWeight) || 0), 0);
  const totalVolume = rows.reduce((sum, r) => sum + (Number(r.totalVolume) || 0), 0);

  // ── TanStack Table Columns Definition (Static - Zero Dependent Re-renders) ──
  const columns = useMemo<ColumnDef<WarehouseRowItem>[]>(
    () => [
      {
        id: 'stt',
        header: 'STT',
        size: 48,
        cell: SttCell,
      },
      {
        id: 'orderCode',
        header: 'MÃ ĐƠN HÀNG',
        size: 130,
        cell: OrderCodeCell,
      },
      {
        accessorKey: 'pickupAddress',
        id: 'pickupAddress',
        header: () => (
          <span>
            ĐỊA CHỈ NHẬN HÀNG <span className="text-red-600 font-black">*</span>
          </span>
        ),
        size: 210,
        cell: PickupAddressCell,
      },
      {
        accessorKey: 'goodsDescription',
        id: 'goodsDescription',
        header: () => (
          <span>
            TÊN HÀNG <span className="text-red-600 font-black">*</span>
          </span>
        ),
        size: 210,
        cell: GoodsDescriptionCell,
      },
      {
        accessorKey: 'totalQuantity',
        id: 'totalQuantity',
        header: () => (
          <span>
            SỐ KIỆN <span className="text-red-600 font-black">*</span>
          </span>
        ),
        size: 95,
        cell: QuantityCell,
      },
      {
        accessorKey: 'totalWeight',
        id: 'totalWeight',
        header: () => (
          <span>
            SỐ KG <span className="text-red-600 font-black">*</span>
          </span>
        ),
        size: 115,
        cell: WeightCell,
      },
      {
        accessorKey: 'totalVolume',
        id: 'totalVolume',
        header: () => (
          <span>
            SỐ M³ <span className="text-red-600 font-black">*</span>
          </span>
        ),
        size: 95,
        cell: VolumeCell,
      },
      {
        id: 'deliveryAddress',
        header: () => (
          <span>
            ĐỊA CHỈ GIAO HÀNG <span className="text-red-600 font-black">*</span>
          </span>
        ),
        size: 280,
        cell: DeliveryAddressCell,
      },
      {
        accessorKey: 'notes',
        id: 'notes',
        header: 'GHI CHÚ',
        size: 240,
        cell: NotesCell,
      },
      {
        id: 'actions',
        header: 'THAO TÁC',
        size: 90,
        cell: ActionsCell,
      },
    ],
    [],
  );

  // Column Pinning State (STT & Mã Đơn Pinned Left, Thao Tác Pinned Right)
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    left: ['stt', 'orderCode'],
    right: ['actions'],
  });

  // TanStack Table Instance
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      columnPinning,
    },
    onColumnPinningChange: setColumnPinning,
    getCoreRowModel: getCoreRowModel(),
    enablePinning: true,
    meta: {
      updateData,
      updateRow,
      duplicateRow: handleDuplicateRow,
      deleteRow: handleDeleteRow,
      openPrintLabel: (data) => setPrintLabelData(data),
      openLookup: (idx) => setLookupRowIndex(idx),
      level1Hubs,
      level2XeBoHubs,
      isOutboundMode,
      rowsCount: rows.length,
    },
  });

  // Precise Pinning Style Generator
  const getPinningStyles = (column: any, isHeader = false): React.CSSProperties => {
    const isPinned = column.getIsPinned();
    const isLastLeft = isPinned === 'left' && column.getIsLastColumn('left');
    const isFirstRight = isPinned === 'right' && column.getIsFirstColumn('right');

    return {
      left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
      right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
      position: isPinned ? 'sticky' : undefined,
      width: `${column.getSize()}px`,
      minWidth: `${column.getSize()}px`,
      maxWidth: `${column.getSize()}px`,
      zIndex: isPinned ? (isHeader ? 30 : 20) : undefined,
      boxShadow: isLastLeft
        ? '2px 0 5px -2px rgba(0, 0, 0, 0.1)'
        : isFirstRight
          ? '-2px 0 5px -2px rgba(0, 0, 0, 0.1)'
          : undefined,
    };
  };

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      {/* ── Excel Input Toolbar (Frame S5y54b in WH_CASE_01) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualPaste}
            className="h-8 text-xs font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm"
          >
            <IconFileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600" />
            Dán từ Excel
          </Button>
          <label className="cursor-pointer">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm pointer-events-none"
            >
              Import Excel
            </Button>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={() => {}}
            />
          </label>
          {onRefreshMetrics && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefreshMetrics}
              disabled={isLoadingMetrics}
              className="h-8 text-xs font-semibold border-slate-300 dark:border-slate-700"
            >
              <IconRefresh className={`mr-1.5 h-3.5 w-3.5 text-blue-600 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
              Cập nhật lại thông số
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Summary Stat Pill placed at Top - Always Visible without horizontal scroll */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/90 dark:bg-blue-950/60 text-xs font-bold border border-blue-200 dark:border-blue-800 shadow-xs">
            <span className="text-blue-950 dark:text-blue-200 font-bold">Tổng:</span>
            <span className="text-blue-700 dark:text-blue-300 font-black">{totalPackages.toLocaleString('vi-VN')} kiện</span>
            <span className="text-blue-300 dark:text-blue-700 font-normal">&bull;</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-black">{totalWeight.toLocaleString('vi-VN')} kg</span>
            <span className="text-blue-300 dark:text-blue-700 font-normal">&bull;</span>
            <span className="text-purple-700 dark:text-purple-300 font-black">{totalVolume.toFixed(1).replace('.', ',')} m³</span>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleAddRow}
            className="h-8 bg-[#0F3D62] text-white hover:bg-[#0c314f] text-xs font-bold shadow-sm shrink-0"
          >
            <IconPlus className="mr-1.5 h-4 w-4" />
            Thêm 1 dòng đơn mới
          </Button>
        </div>
      </div>

      {/* ── TanStack Table Container with Native Horizontal Scroll & Solid Sticky Columns ── */}
      <div className="relative border rounded-xl overflow-x-auto shadow-sm bg-white dark:bg-slate-900">
        <table className="w-full text-xs text-left border-collapse min-w-[1400px]">
          <thead className="select-none font-bold">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b">
                {headerGroup.headers.map((header) => {
                  const isPinned = header.column.getIsPinned();
                  const colId = header.column.id;
                  const isRequired = ['orderCode', 'pickupAddress', 'goodsDescription', 'totalQuantity', 'totalWeight', 'totalVolume', 'deliveryAddress'].includes(colId);

                  return (
                    <th
                      key={header.id}
                      style={getPinningStyles(header.column, true)}
                      className={cn(
                        'p-2.5 text-[11px] font-bold border-b border-slate-200 dark:border-slate-700',
                        colId === 'stt' || colId === 'actions' ? 'text-center' : '',
                        ['totalQuantity', 'totalWeight', 'totalVolume'].includes(colId) ? 'text-right' : '',
                        isPinned === 'left' && colId === 'orderCode'
                          ? 'bg-[#FEE2E2] dark:bg-red-950 border-r border-red-300 dark:border-red-800 text-slate-700 dark:text-slate-300'
                          : isPinned === 'left' && colId === 'stt'
                            ? 'bg-[#F1F5F9] dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700'
                            : isPinned === 'right'
                              ? 'bg-[#F1F5F9] dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              : isRequired
                                ? 'bg-[#FEF2F2] dark:bg-red-950 border-r border-red-200 dark:border-red-900 text-[#991B1B] dark:text-red-300'
                                : 'bg-[#F1F5F9] dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
                      )}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors group align-top"
              >
                {row.getVisibleCells().map((cell) => {
                  const isPinned = cell.column.getIsPinned();
                  const colId = cell.column.id;

                  return (
                    <td
                      key={cell.id}
                      style={getPinningStyles(cell.column, false)}
                      className={cn(
                        'p-2',
                        colId === 'stt' || colId === 'actions' ? 'text-center' : '',
                        ['totalQuantity', 'totalWeight', 'totalVolume'].includes(colId) ? 'text-right' : '',
                        isPinned
                          ? 'bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800'
                          : '',
                        isPinned === 'left'
                          ? 'border-r border-slate-200 dark:border-slate-700'
                          : isPinned === 'right'
                            ? 'border-l border-slate-200 dark:border-slate-700'
                            : 'border-r border-slate-100 dark:border-slate-800',
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Delivery Address Logic Hint Banner (Frame mtoot in WH_CASE_01) ── */}
      {showAddressHint && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-200">
          <IconSearch className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>
            Thêm hoặc chọn một dòng để chỉnh sửa. Hỗ trợ 3 chế độ giao hàng: <strong>Địa chỉ thường</strong> (khách nhận), <strong>Hub cấp 1</strong> (liên Hub), và <strong>Tuyến Xe bo</strong> (tuyến nội thành/vệ tinh).
          </span>
        </div>
      )}

      {/* ── Modal In Tem A4 ── */}
      <PalletLabelA4Modal
        isOpen={!!printLabelData}
        onClose={() => setPrintLabelData(null)}
        data={printLabelData}
      />

      {/* ── Modal Tra Cứu Hàng Trong Kho ── */}
      <WarehouseLookupModal
        isOpen={lookupRowIndex !== null}
        onClose={() => setLookupRowIndex(null)}
        onSelectOrder={handleSelectFromLookup}
        selectedOrderCodes={rows.map((r) => r.orderCode).filter(Boolean)}
        targetRowIndex={lookupRowIndex}
      />
    </div>
  );
}

