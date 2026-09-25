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
  IconHistory,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { PalletLabelA4Modal, PalletLabelData } from './pallet-label-a4-modal';

export interface OrderInventoryTransaction {
  id: number;
  orderId: number;
  type: 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'ADJUSTMENT' | string;
  quantity: number;
  remainingQuantity: number;
  weight?: number;
  volume?: number;
  licensePlate?: string | null;
  driverName?: string | null;
  destination?: string | null;
  performedByUserId?: number | null;
  notes?: string | null;
  createdAt: string | Date;
}

export interface WaybillDetailData {
  id: number;
  orderCode: string;
  senderName?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  province?: string | null;
  accompanyingDocs?: string | null;
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
  inventoryTransactions?: OrderInventoryTransaction[];
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

  const formatDateTime = (dateValue?: string | Date) => {
    if (!dateValue) return '--';
    try {
      const d = new Date(dateValue);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateValue);
    }
  };

  // Chronological inventory transactions
  const transactions: OrderInventoryTransaction[] = React.useMemo(() => {
    if (waybill?.inventoryTransactions && waybill.inventoryTransactions.length > 0) {
      return [...waybill.inventoryTransactions].sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }

    // Graceful fallback for legacy records without transaction rows
    const fallback: OrderInventoryTransaction[] = [];
    const inboundQty = waybill?.inboundQuantity ?? waybill?.totalQuantity ?? 1;
    const remainingQty = waybill?.remainingQuantity ?? waybill?.totalQuantity ?? 1;
    const outboundQty = waybill?.outboundQuantity ?? 0;

    fallback.push({
      id: 1,
      orderId: waybill?.id || 0,
      type: 'INBOUND',
      quantity: inboundQty,
      remainingQuantity: inboundQty,
      weight: waybill?.totalWeight || 0,
      volume: waybill?.totalVolume || 0,
      licensePlate: waybill?.vehicleLicensePlate || null,
      driverName: waybill?.driverName || null,
      destination: waybill?.destinationHub || waybill?.province || 'Kho nhận',
      notes: 'Tiếp nhận nhập kho ban đầu',
      createdAt: waybill?.createdAt || new Date(),
    });

    if (outboundQty > 0) {
      fallback.push({
        id: 2,
        orderId: waybill?.id || 0,
        type: 'OUTBOUND',
        quantity: outboundQty,
        remainingQuantity: remainingQty,
        weight: 0,
        volume: 0,
        licensePlate: null,
        driverName: null,
        destination: waybill?.deliveryAddress || waybill?.destinationHub || 'Giao khách',
        notes: `Đã xuất ${outboundQty} kiện`,
        createdAt: waybill?.updatedAt || new Date(),
      });
    }

    return fallback;
  }, [waybill]);

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
            {/* ── Lịch Sử Hàng Hóa & Biến Động Kho ── */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <IconHistory className="h-5 w-5 text-[#0F3D62] dark:text-blue-400" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    Lịch sử hàng hóa & Biến động kho
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

              {/* 2. Dòng Thời Gian Lịch Sử Biến Động Hàng Hóa (Transaction Ledger) */}
              <div className="pt-2">
                <div className="space-y-0">
                  {transactions.map((tx, idx) => {
                    const isInbound = tx.type === 'INBOUND';
                    const isTransfer = tx.type === 'TRANSFER';
                    const outboundOrderNum = transactions
                      .slice(0, idx + 1)
                      .filter((t) => t.type !== 'INBOUND').length;

                    return (
                      <div key={tx.id || idx} className="relative flex items-stretch gap-3">
                        {/* Cột timeline: Vòng tròn số thứ tự và đường line dọc đồng tâm tuyệt đối */}
                        <div className="flex flex-col items-center shrink-0 w-6">
                          <div className="z-10 flex items-center justify-center shrink-0 h-6 w-6 rounded-full bg-[#0F3D62] text-white text-[11px] font-black shadow-xs ring-4 ring-white dark:ring-slate-900">
                            {idx + 1}
                          </div>
                          <div className="w-0.5 bg-slate-200 dark:bg-slate-700 flex-1" />
                        </div>

                        {/* Cột nội dung biến động */}
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {isInbound
                                ? 'Tiếp nhận nhập kho ban đầu'
                                : isTransfer
                                ? `Xuất luân chuyển liên Hub (Đợt ${outboundOrderNum})`
                                : `Xuất kho giao hàng (Đợt ${outboundOrderNum})`}
                            </span>
                            <Badge
                              className={`text-[10px] font-bold border-0 ${
                                isInbound
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                                  : isTransfer
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                              }`}
                            >
                              {isInbound
                                ? `+${tx.quantity} kiện`
                                : `-${tx.quantity} kiện`}
                            </Badge>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formatDateTime(tx.createdAt)}
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {isInbound ? 'Số lượng nhập: ' : 'Số lượng xuất: '}
                                </span>
                                <span
                                  className={`font-black font-mono ${
                                    isInbound ? 'text-blue-700 dark:text-blue-400' : 'text-purple-700 dark:text-purple-400'
                                  }`}
                                >
                                  {isInbound ? `+${tx.quantity}` : `-${tx.quantity}`} kiện
                                </span>
                                {(tx.weight || tx.volume) ? (
                                  <span className="text-slate-500 ml-1.5 font-mono text-[11px]">
                                    ({tx.weight ? `${Number(tx.weight).toLocaleString('vi-VN')} kg` : ''}
                                    {tx.weight && tx.volume ? ' · ' : ''}
                                    {tx.volume ? `${tx.volume} m³` : ''})
                                  </span>
                                ) : null}
                              </div>

                              <div className="text-[11px] font-bold">
                                <span className="text-slate-500">Tồn sau thao tác: </span>
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                                  {tx.remainingQuantity} kiện
                                </span>
                              </div>
                            </div>

                            {(tx.licensePlate || tx.driverName) && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {isInbound ? 'Xe chở vào: ' : 'Xe vận chuyển: '}
                                </span>
                                <span className="font-mono font-bold text-[#0F3D62] dark:text-blue-400">
                                  {tx.licensePlate || '--'}
                                </span>
                                {tx.driverName && (
                                  <span className="ml-1 text-slate-500">
                                    (Tài xế: {tx.driverName})
                                  </span>
                                )}
                              </div>
                            )}

                            {tx.destination && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  Đích đến:{' '}
                                </span>
                                <span>{tx.destination}</span>
                              </div>
                            )}

                            {tx.notes && (
                              <div className="text-[11px] text-slate-500 italic">
                                <span>Ghi chú: {tx.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Trạng thái tồn kho hiện tại */}
                  <div className="relative flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0 w-6">
                      <div className="z-10 flex items-center justify-center shrink-0 h-6 w-6 rounded-full bg-emerald-600 text-white shadow-xs ring-4 ring-white dark:ring-slate-900">
                        <IconCheck className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        {(waybill.remainingQuantity ?? waybill.totalQuantity ?? 0) === 0 && (waybill.outboundQuantity ?? 0) > 0
                          ? 'Đã xuất kho toàn bộ · Đơn hàng đã hoàn tất xuất kho'
                          : (waybill.outboundQuantity ?? 0) > 0
                          ? `Đang xuất từng phần · Còn tồn ${waybill.remainingQuantity ?? 0} kiện sẵn sàng xuất tiếp`
                          : `Đang lưu kho an toàn tại ${waybill.originHub || 'Hub'} · Tồn khả dụng sẵn sàng xuất`}
                      </span>
                      <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                        {waybill.remainingQuantity ?? waybill.totalQuantity ?? 0} kiện
                      </span>
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
                      <th className="py-2.5 px-3">TỈNH / TP</th>
                      <th className="py-2.5 px-3 text-center w-[120px]">CHỨNG TỪ</th>
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
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {waybill.province ? (
                          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 font-bold text-[11px]">
                            {waybill.province}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {waybill.accompanyingDocs && waybill.accompanyingDocs.toUpperCase() !== 'KHÔNG CÓ' ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 font-bold text-[10px]">
                            {waybill.accompanyingDocs}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[10px]">
                            {waybill.accompanyingDocs || 'Không có'}
                          </Badge>
                        )}
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
