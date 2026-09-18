'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconBuildingWarehouse,
  IconTruck,
  IconPrinter,
  IconCopy,
  IconCheck,
  IconPackage,
  IconX,
  IconCircleCheck,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { PalletLabelA4Modal, PalletLabelData } from './pallet-label-a4-modal';

export interface WaybillDetailData {
  id: number;
  orderCode: string;
  senderName?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  deliveryMode?: 'DIRECT_CUSTOMER' | 'HUB_L1' | 'XE_BO' | string;
  destinationHub?: string;
  destinationHubId?: number | null;
  destinationHubEntity?: { id?: number; name?: string; code?: string };
  originHub?: string;
  originHubId?: number | null;
  originHubEntity?: { id?: number; name?: string; code?: string };
  route?: string;
  goodsDescription?: string;
  totalQuantity?: number;
  inboundQuantity?: number;
  outboundQuantity?: number;
  remainingQuantity?: number;
  totalWeight?: number;
  totalVolume?: number;
  notes?: string;
  externalNote?: string;
  status: string;
  inboundType?: 'CUSTOMER' | 'TRANSFER' | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  vehicleLicensePlate?: string;
  driverName?: string;
  createdBy?: {
    fullName?: string;
    hub?: { name?: string };
  };
  trips?: any[];
  trip?: {
    id?: number;
    licensePlate?: string;
    driverName?: string;
    driverPhone?: string;
  };
}

interface WarehouseWaybillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  waybill: WaybillDetailData | null;
  onStartTally?: (waybill: WaybillDetailData) => void;
  onPrintLabel?: (waybill: WaybillDetailData) => void;
}

function getWaybillStatusBadge(status: string) {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'INBOUND':
    case 'STORED':
    case 'LUU_KHO':
    case 'IN_WAREHOUSE':
      return (
        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold border-0 text-xs px-3 py-1 shadow-xs">
          LƯU KHO
        </Badge>
      );
    case 'DRAFT':
      return (
        <Badge className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold border-0 text-xs px-3 py-1 shadow-xs">
          ĐƠN NHÁP
        </Badge>
      );
    case 'PENDING':
    case 'PENDING_INBOUND':
    case 'WAITING':
      return (
        <Badge className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold border-0 text-xs px-3 py-1 shadow-xs">
          CHỜ NHẬP KHO
        </Badge>
      );
    case 'COMPLETED_INBOUND':
    case 'OUT_FOR_DELIVERY':
      return (
        <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold border-0 text-xs px-3 py-1 shadow-xs">
          ĐÃ XUẤT KHO
        </Badge>
      );
    case 'DELIVERED':
    case 'COMPLETED':
    case 'COMPLETED_OUTBOUND':
      return (
        <Badge className="bg-green-600 hover:bg-green-700 text-white font-bold border-0 text-xs px-3 py-1 shadow-xs">
          ĐÃ HOÀN THÀNH
        </Badge>
      );
    case 'IN_TRANSIT':
      return (
        <Badge className="bg-sky-500 hover:bg-sky-600 text-white font-bold border-0 text-xs px-3 py-1 shadow-xs">
          ĐANG VẬN CHUYỂN
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-500 text-white font-bold border-0 text-xs px-3 py-1">
          {status}
        </Badge>
      );
  }
}

export function WarehouseWaybillDetailModal({
  isOpen,
  onClose,
  waybill,
  onPrintLabel,
}: WarehouseWaybillDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [previewLabelData, setPreviewLabelData] = useState<PalletLabelData | null>(null);

  const inboundTrip =
    waybill?.trips?.find((t) => t.notes?.includes('NHẬP KHO') || t.tripRole === 'PICKUP') ||
    (waybill?.trips && waybill.trips.length > 0 ? waybill.trips[0] : null) ||
    (waybill?.vehicleLicensePlate
      ? { licensePlate: waybill.vehicleLicensePlate, driverName: waybill.driverName }
      : null);

  if (!waybill) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(waybill.orderCode);
    setCopied(true);
    toast.success('Đã sao chép mã vận đơn!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPreviewLabel = () => {
    if (onPrintLabel) {
      onPrintLabel(waybill);
    } else {
      setPreviewLabelData({
        orderCode: waybill.orderCode,
        goodsDescription: waybill.goodsDescription || 'HÀNG HÓA TIẾP NHẬN',
        totalQuantity: waybill.totalQuantity || 1,
        packagesOnPallet: waybill.totalQuantity || 1,
        palletIndex: 1,
        totalPallets: 1,
        originHub: waybill.pickupAddress || waybill.originHub,
        destinationHub: waybill.deliveryAddress || waybill.destinationHub,
        createdAt: waybill.createdAt,
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent showCloseButton={false} className="sm:max-w-[96vw] w-[96vw] max-w-[96vw] p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
          {/* ── Compact Header Bar ── */}
          <div className="bg-[#0F3D62] text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconBuildingWarehouse className="h-5 w-5 text-blue-300" />
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  Chi tiết đơn hàng tiếp nhận kho
                  <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-xs">
                    {waybill.orderCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-all text-xs flex items-center gap-1 font-mono cursor-pointer"
                    title="Sao chép mã"
                  >
                    {copied ? (
                      <IconCheck className="h-3.5 w-3.5 text-emerald-300" />
                    ) : (
                      <IconCopy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getWaybillStatusBadge(waybill.status)}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full"
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Scrollable Body Structured Like Inbound Create Form ── */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
            {/* ── Theo Dõi Tồn Kho & Lộ Trình Vận Chuyển ── */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <IconBuildingWarehouse className="h-5 w-5 text-[#0F3D62] dark:text-blue-400" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    Tiến trình vận chuyển & Tồn kho
                  </h3>
                </div>
                <Badge variant="outline" className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Mã đơn: <span className="font-mono text-[#0F3D62] dark:text-blue-400 ml-1">{waybill.orderCode}</span>
                </Badge>
              </div>

              {/* 1. Bảng Thống Kê Nhập - Xuất - Tồn Chi Tiết (Stat Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tổng Nhập */}
                <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-400 block">
                      Tổng đã nhập
                    </span>
                    <span className="text-xl font-black text-blue-900 dark:text-blue-200 font-mono">
                      {waybill.inboundQuantity ?? waybill.totalQuantity ?? 0}
                    </span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-300 ml-1">kiện</span>
                  </div>
                  <IconTruck className="h-7 w-7 text-blue-400/80 shrink-0" />
                </div>

                {/* Đã Xuất */}
                <div className="p-3 rounded-lg bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-purple-700 dark:text-purple-400 block">
                      Tổng đã xuất
                    </span>
                    <span className="text-xl font-black text-purple-900 dark:text-purple-200 font-mono">
                      {waybill.outboundQuantity ?? 0}
                    </span>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 ml-1">kiện</span>
                  </div>
                  <IconTruck className="h-7 w-7 text-purple-400/80 shrink-0" />
                </div>

                {/* Tồn Kho Khả Dụng */}
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-300 block">
                      Tồn kho khả dụng
                    </span>
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                      {waybill.remainingQuantity ?? waybill.totalQuantity ?? 0}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 ml-1">kiện</span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0">
                    <IconCircleCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* 2. Khối Lộ Trình Vận Chuyển Chi Tiết */}
              <div className="pt-2">
                <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3.5 pl-6 space-y-4">
                  {/* Chặng 1: Xe nhập kho */}
                  <div className="relative">
                    <div className="absolute -left-[33px] top-0.5 h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                      1
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          1. Xe nhập kho
                        </span>
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-0 text-[10px] font-bold">
                          Đã nhập kho
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Xe chở vào: </span>
                          <span className="font-mono font-bold text-[#0F3D62] dark:text-blue-400">
                            {waybill.vehicleLicensePlate || inboundTrip?.licensePlate || 'Xe tiếp nhận kho'}
                          </span>
                          {(waybill.driverName || inboundTrip?.driverName) && (
                            <span className="ml-2 text-slate-500">
                              (Tài xế: {waybill.driverName || inboundTrip?.driverName})
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-blue-700 dark:text-blue-300">
                          Nhập: {waybill.inboundQuantity ?? waybill.totalQuantity ?? 0} kiện
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chặng 2: Tuyến trung chuyển liên Hub */}
                  <div className="relative">
                    <div className="absolute -left-[33px] top-0.5 h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                      2
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          2. Trung chuyển liên Hub
                        </span>
                        <Badge variant="outline" className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 border-amber-300">
                          {waybill.destinationHub && waybill.originHub !== waybill.destinationHub ? 'Tuyến liên Hub' : 'Lưu kho trực tiếp'}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Lộ trình: </span>
                          <span>{waybill.originHub || 'Hub gửi'}</span>
                          <span className="mx-1 text-slate-400">➔</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {waybill.destinationHub || waybill.deliveryAddress || 'Điểm đích'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chặng 3: Xe xuất kho */}
                  <div className="relative">
                    <div className={`absolute -left-[33px] top-0.5 h-6 w-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold shadow-xs ${
                      (waybill.outboundQuantity ?? 0) > 0 ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700 text-slate-600'
                    }`}>
                      3
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          3. Xe xuất kho
                        </span>
                        <Badge className={`text-[10px] font-bold border-0 ${
                          (waybill.remainingQuantity ?? 0) === 0 && (waybill.outboundQuantity ?? 0) > 0
                            ? 'bg-emerald-600 text-white'
                            : (waybill.outboundQuantity ?? 0) > 0
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {(waybill.remainingQuantity ?? 0) === 0 && (waybill.outboundQuantity ?? 0) > 0
                            ? 'Đã xuất kho toàn bộ'
                            : (waybill.outboundQuantity ?? 0) > 0
                            ? 'Đang xuất từng phần'
                            : 'Chờ xuất kho'}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                        {/* List all outbound trips if any */}
                        {waybill.trips?.filter((t) => t.notes?.includes('XUẤT KHO') || t.status === 'IN_TRANSIT').length ? (
                          waybill.trips
                            ?.filter((t) => t.notes?.includes('XUẤT KHO') || t.status === 'IN_TRANSIT')
                            .map((t, idx) => (
                              <div key={t.id || idx} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-1 last:border-b-0 last:pb-0">
                                <div>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">Đợt xuất {idx + 1}: </span>
                                  <span className="font-mono font-bold text-purple-700 dark:text-purple-400">{t.licensePlate}</span>
                                  {t.driverName && <span className="ml-1 text-slate-500">({t.driverName})</span>}
                                  <span className="text-slate-400 text-[11px] ml-1.5">· {t.notes}</span>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              {(waybill.outboundQuantity ?? 0) > 0
                                ? `Đã xuất ${waybill.outboundQuantity} kiện qua các xe xuất kho.`
                                : 'Chưa có xe xuất kho cho đơn hàng này.'}
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Còn tồn: <span className="text-emerald-600 font-black">{waybill.remainingQuantity ?? waybill.totalQuantity ?? 0}</span> kiện
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bảng Danh Mục Hàng Hóa Vận Đơn (Read-only Table) ── */}
            <div className="bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <IconPackage className="h-4 w-4 text-[#0F3D62] dark:text-blue-400" />
                  <span>Danh mục hàng hóa vận đơn</span>
                </h4>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Tổng kiện: <span className="font-bold text-[#0F3D62] dark:text-blue-400 font-mono">{waybill.totalQuantity ?? 1}</span> kiện · <span className="font-bold font-mono">{(waybill.totalWeight ?? 0).toLocaleString('vi-VN')}</span> kg · <span className="font-bold font-mono">{waybill.totalVolume ?? 0}</span> m³
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 w-[50px] text-center">STT</th>
                      <th className="py-2.5 px-3 w-[150px]">MÃ VẬN ĐƠN</th>
                      <th className="py-2.5 px-3">ĐỊA CHỈ NHẬN HÀNG</th>
                      <th className="py-2.5 px-3">TÊN HÀNG HÓA</th>
                      <th className="py-2.5 px-3 text-right w-[90px]">SỐ KIỆN</th>
                      <th className="py-2.5 px-3 text-right w-[100px]">SỐ KG</th>
                      <th className="py-2.5 px-3 text-right w-[90px]">SỐ M³</th>
                      <th className="py-2.5 px-3">ĐỊA CHỈ GIAO HÀNG</th>
                      <th className="py-2.5 px-3 text-center w-[120px]">HÌNH THỨC GIAO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">01</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {waybill.orderCode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {waybill.pickupAddress || waybill.originHub || 'Kho gửi'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {waybill.goodsDescription || 'Hàng hóa tổng quan'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {waybill.totalQuantity ?? 1}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {(waybill.totalWeight ?? 0).toLocaleString('vi-VN')} kg
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {waybill.totalVolume ?? 0} m³
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {waybill.destinationHub || waybill.deliveryAddress || 'Điểm đích'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 dark:bg-slate-800">
                          {waybill.deliveryMode === 'HUB_L1' || waybill.destinationHub
                            ? 'Hub Cấp 1'
                            : waybill.deliveryMode === 'XE_BO'
                            ? 'Xe bo'
                            : 'Giao thẳng'}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {waybill.notes && (
                <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg p-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold">Ghi chú vận đơn:</span> {waybill.notes}
                </div>
              )}
            </div>
          </div>

          {/* ── Dialog Footer (Clean Close & Print Actions) ── */}
          <div className="p-3.5 px-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Trạng thái vận đơn: {getWaybillStatusBadge(waybill.status)}
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenPreviewLabel}
                className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-slate-800 h-8"
              >
                <IconPrinter className="mr-1.5 h-4 w-4" /> In tem Pallet A4
              </Button>
              <Button
                type="button"
                onClick={onClose}
                className="bg-[#0F3D62] hover:bg-[#0c314f] text-white text-xs font-bold px-4 h-8"
              >
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pallet Label Preview Modal */}
      {previewLabelData && (
        <PalletLabelA4Modal
          isOpen={Boolean(previewLabelData)}
          onClose={() => setPreviewLabelData(null)}
          data={previewLabelData}
        />
      )}
    </>
  );
}
