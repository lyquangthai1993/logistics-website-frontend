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
  showAddressHint?: boolean;
}

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

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            onClick={handleAddRow}
            className="h-8 bg-[#0F3D62] text-white hover:bg-[#0c314f] text-xs font-bold shadow-sm"
          >
            <IconPlus className="mr-1.5 h-4 w-4" />
            Thêm 1 dòng đơn mới
          </Button>
        </div>
      </div>

      {/* ── 10-Column Canonical Editable Table Container (Frame xTfjC in WH_CASE_01) ── */}
      <div className="relative border rounded-xl overflow-x-auto shadow-sm bg-white dark:bg-slate-900">
        <table className="w-full text-xs text-left border-collapse min-w-[1100px]">
          <thead className="select-none font-bold">
            <tr className="bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b">
              {/* STT */}
              <th className="p-2.5 w-[40px] text-center sticky left-0 bg-[#F1F5F9] dark:bg-slate-800 z-10 border-r border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                STT
              </th>

              {/* MÃ ĐƠN HÀNG */}
              <th className="p-2.5 w-[115px] sticky left-[40px] bg-[#FEF2F2] dark:bg-red-950/40 z-10 border-r border-b border-red-200 dark:border-red-900/60 text-slate-600 dark:text-slate-400 font-bold text-[11px]">
                MÃ ĐƠN HÀNG
              </th>

              {/* ĐỊA CHỈ NHẬN HÀNG */}
              <th className="p-2.5 w-[210px] bg-[#FEF2F2] dark:bg-red-950/40 border-r border-b border-red-200 dark:border-red-900/60 text-[#991B1B] dark:text-red-300 font-bold text-[11px]">
                ĐỊA CHỈ NHẬN HÀNG <span className="text-red-600 font-black">*</span>
              </th>

              {/* TÊN HÀNG */}
              <th className="p-2.5 w-[120px] bg-[#FEF2F2] dark:bg-red-950/40 border-r border-b border-red-200 dark:border-red-900/60 text-[#991B1B] dark:text-red-300 font-bold text-[11px]">
                TÊN HÀNG <span className="text-red-600 font-black">*</span>
              </th>

              {/* SỐ THÙNG / SỐ KIỆN */}
              <th className="p-2.5 w-[75px] text-right bg-[#FEF2F2] dark:bg-red-950/40 border-r border-b border-red-200 dark:border-red-900/60 text-[#991B1B] dark:text-red-300 font-bold text-[11px]">
                SỐ KIỆN <span className="text-red-600 font-black">*</span>
              </th>

              {/* SỐ KG */}
              <th className="p-2.5 w-[85px] text-right bg-[#FEF2F2] dark:bg-red-950/40 border-r border-b border-red-200 dark:border-red-900/60 text-[#991B1B] dark:text-red-300 font-bold text-[11px]">
                SỐ KG <span className="text-red-600 font-black">*</span>
              </th>

              {/* SỐ KHỐI / SỐ M³ */}
              <th className="p-2.5 w-[75px] text-right bg-[#FEF2F2] dark:bg-red-950/40 border-r border-b border-red-200 dark:border-red-900/60 text-[#991B1B] dark:text-red-300 font-bold text-[11px]">
                SỐ M³ <span className="text-red-600 font-black">*</span>
              </th>

              {/* ĐỊA CHỈ GIAO HÀNG */}
              <th className="p-2.5 w-[260px] bg-[#FEF2F2] dark:bg-red-950/40 border-r border-b border-red-200 dark:border-red-900/60 text-[#B91C1C] dark:text-red-300 font-bold text-[11px]">
                ĐỊA CHỈ GIAO HÀNG <span className="text-red-600 font-black">*</span>
              </th>

              {/* GHI CHÚ */}
              <th className="p-2.5 w-[190px] bg-[#F1F5F9] dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                GHI CHÚ
              </th>

              {/* THAO TÁC */}
              <th className="p-2.5 w-[85px] text-center sticky right-0 bg-[#F1F5F9] dark:bg-slate-800 z-10 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                THAO TÁC
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors group align-top"
              >
                {/* 1. STT */}
                <td className="p-2 text-center font-mono font-bold text-slate-500 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-blue-50/40 border-r border-slate-100 dark:border-slate-800">
                  {(idx + 1).toString().padStart(2, '0')}
                </td>

                {/* 2. Mã đơn hàng (Readonly Pill Badge / Outbound Lookup) */}
                <td className="p-2 sticky left-[40px] bg-white dark:bg-slate-900 group-hover:bg-blue-50/40 border-r border-slate-100 dark:border-slate-800">
                  {isOutboundMode ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={row.orderCode}
                        readOnly
                        placeholder="Chọn mã đơn..."
                        className="h-7 text-xs font-mono font-bold bg-slate-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setLookupRowIndex(idx)}
                        className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 shrink-0"
                        title="Tra cứu kho để gán mã đơn"
                      >
                        <IconSearch className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-[30px] flex items-center justify-center px-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md">
                      <span className="text-[10px] font-semibold text-slate-500 font-mono tracking-tight">
                        {row.orderCode && row.orderCode !== '(Tự sinh khi lưu)' ? row.orderCode : 'Tự sinh · khóa'}
                      </span>
                    </div>
                  )}
                </td>

                {/* 3. Địa chỉ nhận hàng (Multiline Textarea) */}
                <td className="p-2 border-r border-slate-100 dark:border-slate-800">
                  <textarea
                    rows={2}
                    value={row.pickupAddress}
                    onChange={(e) => handleCellChange(idx, 'pickupAddress', e.target.value)}
                    placeholder="Địa chỉ / Hub nhận hàng..."
                    className="w-full text-xs rounded-md border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-900 p-1.5 resize-none text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-normal min-h-[58px]"
                  />
                </td>

                {/* 4. Tên hàng (Input with edit affordance) */}
                <td className="p-2 border-r border-slate-100 dark:border-slate-800">
                  <div className="relative">
                    <Input
                      value={row.goodsDescription}
                      onChange={(e) => handleCellChange(idx, 'goodsDescription', e.target.value)}
                      placeholder="Tên loại hàng..."
                      className="h-[30px] pr-6 text-xs font-medium border-slate-300 dark:border-slate-700"
                    />
                  </div>
                </td>

                {/* 5. Số kiện (Số thùng) */}
                <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800">
                  <Input
                    type="number"
                    min={1}
                    value={row.totalQuantity}
                    onChange={(e) => handleCellChange(idx, 'totalQuantity', parseInt(e.target.value, 10) || 1)}
                    className="h-[30px] px-2 text-xs text-right font-bold border-slate-300 dark:border-slate-700"
                  />
                </td>

                {/* 6. Số kg */}
                <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800">
                  <Input
                    type="number"
                    step="any"
                    min={0.1}
                    value={row.totalWeight}
                    onChange={(e) => handleCellChange(idx, 'totalWeight', parseFloat(e.target.value) || 0)}
                    className="h-[30px] px-2 text-xs text-right font-bold border-slate-300 dark:border-slate-700"
                  />
                </td>

                {/* 7. Số khối (Số m³) */}
                <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800">
                  <Input
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={row.totalVolume}
                    onChange={(e) => handleCellChange(idx, 'totalVolume', parseFloat(e.target.value) || 0)}
                    className="h-[30px] px-2 text-xs text-right font-bold border-slate-300 dark:border-slate-700"
                  />
                </td>

                {/* 8. Địa chỉ giao hàng (2-Tier Stacked Card) */}
                <td className="p-2 border-r border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    {/* Top Tier: Mode Selector */}
                    <select
                      value={row.deliveryMode}
                      onChange={(e) => handleCellChange(idx, 'deliveryMode', e.target.value as any)}
                      className="w-full h-7 text-xs font-bold text-[#1E3A8A] dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-500 dark:border-blue-600 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="DIRECT_CUSTOMER">Địa chỉ thường</option>
                      <option value="HUB_L1">Hub cấp 1</option>
                      <option value="XE_BO">Xe bo</option>
                    </select>

                    {/* Bottom Tier: Resolved Address / Destination Text */}
                    <textarea
                      rows={2}
                      value={row.deliveryAddress}
                      onChange={(e) => handleCellChange(idx, 'deliveryAddress', e.target.value)}
                      placeholder={
                        row.deliveryMode === 'HUB_L1'
                          ? 'Polaris Hub - Hưng Yên · nhận trung chuyển...'
                          : row.deliveryMode === 'XE_BO'
                            ? 'XB-KH-02 · gom hàng tuyến nội thành...'
                            : '25 Nguyễn Văn Linh, Q.7, TP.HCM...'
                      }
                      className="w-full text-[11px] rounded-md border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/80 p-1.5 resize-none text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-normal min-h-[50px]"
                    />
                  </div>
                </td>

                {/* 9. Ghi chú (Multiline Textarea) */}
                <td className="p-2 border-r border-slate-100 dark:border-slate-800">
                  <textarea
                    rows={2}
                    value={row.notes}
                    onChange={(e) => handleCellChange(idx, 'notes', e.target.value)}
                    placeholder="Ghi chú bốc dỡ, lưu ý..."
                    className="w-full text-xs rounded-md border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-900 p-1.5 resize-none text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-normal min-h-[58px]"
                  />
                </td>

                {/* 10. Thao tác */}
                <td className="p-2 text-center sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-blue-50/40">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setPrintLabelData({
                          orderCode: row.orderCode && row.orderCode !== '(Tự sinh khi lưu)' ? row.orderCode : 'LTV2609-0025',
                          goodsDescription: row.goodsDescription || 'Hàng hóa tổng quan',
                          totalQuantity: row.totalQuantity || 10,
                          packagesOnPallet: row.totalQuantity || 10,
                          palletIndex: 1,
                          totalPallets: 1,
                          originHub: row.pickupAddress,
                          destinationHub: row.deliveryAddress,
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
                      onClick={() => handleDuplicateRow(idx)}
                      className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-30"
                      title="Xóa dòng"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          {/* ── Summary Footer (Frame yvruv in WH_CASE_01) ── */}
          <tfoot className="bg-[#F8FAFC] dark:bg-slate-800 font-semibold border-t border-slate-200 dark:border-slate-700 text-xs">
            <tr>
              <td colSpan={3} className="p-3 text-left text-slate-500 dark:text-slate-400 font-semibold">
                {rows.length} dòng hàng
              </td>
              <td colSpan={7} className="p-3 text-right text-slate-800 dark:text-slate-100 font-bold">
                Tổng: <span className="text-blue-700 dark:text-blue-400">{totalPackages.toLocaleString('vi-VN')} kiện</span> &bull;{' '}
                <span className="text-emerald-700 dark:text-emerald-400">{totalWeight.toLocaleString('vi-VN')} kg</span> &bull;{' '}
                <span className="text-purple-700 dark:text-purple-400">{totalVolume.toFixed(1).replace('.', ',')} m³</span>
              </td>
            </tr>
          </tfoot>
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

