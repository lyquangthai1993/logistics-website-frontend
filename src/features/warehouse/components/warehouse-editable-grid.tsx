'use client';

import React, { useState, useCallback } from 'react';
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
} from '@tabler/icons-react';
import { PalletLabelA4Modal, PalletLabelData } from './pallet-label-a4-modal';
import { WarehouseLookupModal, WarehouseLookupItem } from './warehouse-lookup-modal';

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

interface WarehouseEditableGridProps {
  rows: WarehouseRowItem[];
  onChange: (rows: WarehouseRowItem[]) => void;
  isOutboundMode?: boolean;
  onRefreshMetrics?: () => void;
  isLoadingMetrics?: boolean;
}

export function WarehouseEditableGrid({
  rows,
  onChange,
  isOutboundMode = false,
  onRefreshMetrics,
  isLoadingMetrics = false,
}: WarehouseEditableGridProps) {
  const [printLabelData, setPrintLabelData] = useState<PalletLabelData | null>(null);
  const [lookupRowIndex, setLookupRowIndex] = useState<number | null>(null);

  // Update a single field in a specific row
  const handleCellChange = (
    index: number,
    field: keyof WarehouseRowItem,
    value: any,
  ) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  // Add new empty row
  const handleAddRow = () => {
    const newRow: WarehouseRowItem = {
      orderCode: isOutboundMode ? '' : '(Tự sinh khi lưu)',
      pickupAddress: 'Kho Andromeda HCM - Cổng Dock 02',
      goodsDescription: '',
      totalQuantity: 10,
      totalWeight: 250,
      totalVolume: 1.2,
      deliveryMode: 'DIRECT_CUSTOMER',
      deliveryAddress: '',
      notes: '',
    };
    onChange([...rows, newRow]);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    if (rows.length <= 1) return;
    const updated = rows.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Duplicate row
  const handleDuplicateRow = (index: number) => {
    const target = rows[index];
    const duplicated: WarehouseRowItem = {
      ...target,
      orderCode: isOutboundMode ? '' : '(Tự sinh khi lưu)',
    };
    const updated = [...rows];
    updated.splice(index + 1, 0, duplicated);
    onChange(updated);
  };

  // Smart Paste from Excel (TSV clipboard)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData('text');
      if (!text || !text.includes('\t')) return; // Only process if multi-column tab-separated

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
      deliveryAddress: order.destinationHub || order.route || '',
    };
    onChange(updated);
    setLookupRowIndex(null);
  };

  // Calculate totals
  const totalPackages = rows.reduce((sum, r) => sum + (Number(r.totalQuantity) || 0), 0);
  const totalWeight = rows.reduce((sum, r) => sum + (Number(r.totalWeight) || 0), 0);
  const totalVolume = rows.reduce((sum, r) => sum + (Number(r.totalVolume) || 0), 0);

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleAddRow}
            className="h-8 bg-[#0F3D62] text-white hover:bg-[#0c314f] text-xs font-semibold"
          >
            <IconPlus className="mr-1 h-3.5 w-3.5" /> Thêm dòng hàng mới
          </Button>
          {onRefreshMetrics && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefreshMetrics}
              disabled={isLoadingMetrics}
              className="h-8 text-xs font-medium border-slate-300 dark:border-slate-700"
            >
              <IconRefresh className={`mr-1 h-3.5 w-3.5 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
              Cập nhật lại thông số
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
            <IconFileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Hỗ trợ Paste từ Excel (Ctrl+V)
          </span>
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {rows.length} dòng hàng
          </span>
        </div>
      </div>

      {/* ── 10-Column Canonical Editable Table Container ── */}
      <div className="relative border rounded-lg overflow-x-auto shadow-sm bg-white dark:bg-slate-900">
        <table className="w-full text-xs text-left border-collapse min-w-[1100px]">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b dark:bg-slate-800 dark:text-slate-300 select-none">
            <tr>
              <th className="p-2 w-[48px] text-center sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">STT</th>
              <th className="p-2 w-[160px] sticky left-[48px] bg-slate-100 dark:bg-slate-800 z-10">
                MÃ ĐƠN HÀNG <span className="text-red-500">*</span>
              </th>
              <th className="p-2 min-w-[160px]">
                ĐỊA CHỈ NHẬN HÀNG <span className="text-red-500">*</span>
              </th>
              <th className="p-2 min-w-[170px]">
                TÊN HÀNG <span className="text-red-500">*</span>
              </th>
              <th className="p-2 w-[90px] text-right">
                SỐ KIỆN <span className="text-red-500">*</span>
              </th>
              <th className="p-2 w-[100px] text-right">
                SỐ KG <span className="text-red-500">*</span>
              </th>
              <th className="p-2 w-[90px] text-right">
                SỐ M³ <span className="text-red-500">*</span>
              </th>
              <th className="p-2 min-w-[200px]">
                ĐỊA CHỈ GIAO HÀNG <span className="text-red-500">*</span>
              </th>
              <th className="p-2 min-w-[120px]">GHI CHÚ</th>
              <th className="p-2 w-[100px] text-center sticky right-0 bg-slate-100 dark:bg-slate-800 z-10">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors group"
              >
                {/* 1. STT */}
                <td className="p-1.5 text-center font-mono font-bold text-slate-500 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-blue-50/40">
                  {(idx + 1).toString().padStart(2, '0')}
                </td>

                {/* 2. Mã đơn hàng (Readonly / Lookup icon) */}
                <td className="p-1.5 sticky left-[48px] bg-white dark:bg-slate-900 group-hover:bg-blue-50/40">
                  <div className="flex items-center gap-1">
                    <Input
                      value={row.orderCode}
                      readOnly
                      placeholder={isOutboundMode ? 'Chọn mã đơn...' : '(Tự sinh khi lưu)'}
                      className="h-7 text-xs font-mono font-bold bg-slate-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300"
                    />
                    {isOutboundMode && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setLookupRowIndex(idx)}
                        className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                        title="Tra cứu kho để gán mã đơn"
                      >
                        <IconSearch className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>

                {/* 3. Địa chỉ nhận hàng */}
                <td className="p-1.5">
                  <Input
                    value={row.pickupAddress}
                    onChange={(e) => handleCellChange(idx, 'pickupAddress', e.target.value)}
                    placeholder="Kho Andromeda HCM..."
                    className="h-7 text-xs"
                  />
                </td>

                {/* 4. Tên hàng */}
                <td className="p-1.5">
                  <Input
                    value={row.goodsDescription}
                    onChange={(e) => handleCellChange(idx, 'goodsDescription', e.target.value)}
                    placeholder="Mô tả hàng hóa..."
                    className="h-7 text-xs font-medium"
                  />
                </td>

                {/* 5. Số kiện */}
                <td className="p-1.5 text-right">
                  <Input
                    type="number"
                    min={1}
                    value={row.totalQuantity}
                    onChange={(e) => handleCellChange(idx, 'totalQuantity', parseInt(e.target.value, 10) || 1)}
                    className="h-7 text-xs text-right font-bold"
                  />
                </td>

                {/* 6. Số kg */}
                <td className="p-1.5 text-right">
                  <Input
                    type="number"
                    step="any"
                    min={0.1}
                    value={row.totalWeight}
                    onChange={(e) => handleCellChange(idx, 'totalWeight', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs text-right font-bold"
                  />
                </td>

                {/* 7. Số m³ */}
                <td className="p-1.5 text-right">
                  <Input
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={row.totalVolume}
                    onChange={(e) => handleCellChange(idx, 'totalVolume', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs text-right font-bold"
                  />
                </td>

                {/* 8. Địa chỉ giao hàng (3-mode destination selector) */}
                <td className="p-1.5">
                  <div className="flex items-center gap-1">
                    <select
                      value={row.deliveryMode}
                      onChange={(e) => handleCellChange(idx, 'deliveryMode', e.target.value as any)}
                      className="h-7 text-[11px] font-semibold rounded border border-gray-300 dark:border-gray-700 bg-slate-50 dark:bg-slate-800 px-1"
                    >
                      <option value="DIRECT_CUSTOMER">Khách lẻ</option>
                      <option value="HUB_L1">Hub L1</option>
                      <option value="XE_BO">Xe bo</option>
                    </select>
                    <Input
                      value={row.deliveryAddress}
                      onChange={(e) => handleCellChange(idx, 'deliveryAddress', e.target.value)}
                      placeholder={
                        row.deliveryMode === 'HUB_L1'
                          ? 'Hub Đà Nẵng, Hub Hà Nội...'
                          : row.deliveryMode === 'XE_BO'
                            ? 'Xe bo Tuyến Đà Nẵng...'
                            : 'Số nhà, đường, quận/huyện...'
                      }
                      className="h-7 text-xs flex-1"
                    />
                  </div>
                </td>

                {/* 9. Ghi chú */}
                <td className="p-1.5">
                  <Input
                    value={row.notes}
                    onChange={(e) => handleCellChange(idx, 'notes', e.target.value)}
                    placeholder="Lưu ý bốc dỡ..."
                    className="h-7 text-xs"
                  />
                </td>

                {/* 10. Thao tác */}
                <td className="p-1.5 text-center sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-blue-50/40">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setPrintLabelData({
                          orderCode: row.orderCode || 'HCM-TEMP-001',
                          goodsDescription: row.goodsDescription || 'Hàng hóa tổng quan',
                          totalQuantity: row.totalQuantity || 10,
                          packagesOnPallet: row.totalQuantity || 10,
                          palletIndex: 1,
                          totalPallets: 1,
                          destinationHub: row.deliveryAddress,
                        })
                      }
                      className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-100"
                      title="In tem nhận diện A4"
                    >
                      <IconPrinter className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDuplicateRow(idx)}
                      className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100"
                      title="Nhân bản dòng"
                    >
                      <IconCopy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={rows.length <= 1}
                      onClick={() => handleDeleteRow(idx)}
                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 disabled:opacity-30"
                      title="Xóa dòng"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          {/* ── Summary Footer ── */}
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-xs">
            <tr>
              <td colSpan={4} className="p-2.5 text-right font-black text-slate-800 dark:text-slate-200">
                TỔNG CỘNG ({rows.length} DÒNG):
              </td>
              <td className="p-2.5 text-right text-blue-700 dark:text-blue-400 font-black">
                {totalPackages.toLocaleString('vi-VN')} kiện
              </td>
              <td className="p-2.5 text-right text-emerald-700 dark:text-emerald-400 font-black">
                {totalWeight.toLocaleString('vi-VN')} kg
              </td>
              <td className="p-2.5 text-right text-purple-700 dark:text-purple-400 font-black">
                {totalVolume.toFixed(2)} m³
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>

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
