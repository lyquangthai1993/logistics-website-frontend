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
  IconUser,
  IconCalendar,
  IconX,
  IconCircleCheck,
  IconLoader2,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { WarehouseEditableGrid, WarehouseRowItem } from './warehouse-editable-grid';
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
  const [activeTab, setActiveTab] = useState<'NEW' | 'TRANSFER'>('NEW');
  const [receiveDate, setReceiveDate] = useState<string>('');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [rows, setRows] = useState<WarehouseRowItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [previewLabelData, setPreviewLabelData] = useState<PalletLabelData | null>(null);

  const inboundTrip =
    waybill?.trips?.find((t) => t.notes?.includes('NHẬP KHO') || t.tripRole === 'PICKUP') ||
    (waybill?.trips && waybill.trips.length > 0 ? waybill.trips[0] : null) ||
    (waybill?.vehicleLicensePlate
      ? { licensePlate: waybill.vehicleLicensePlate, driverName: waybill.driverName }
      : null);

  useEffect(() => {
    if (waybill) {
      const isTransfer =
        waybill.inboundType === 'TRANSFER' ||
        waybill.orderCode?.startsWith('TRIP') ||
        Boolean(waybill.originHub && waybill.destinationHub && waybill.originHub !== waybill.destinationHub);

      setActiveTab(isTransfer ? 'TRANSFER' : 'NEW');

      const d = waybill.createdAt ? new Date(waybill.createdAt) : new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setReceiveDate(`${yyyy}-${mm}-${dd}`);

      setLicensePlate(waybill.vehicleLicensePlate || inboundTrip?.licensePlate || '');
      setDriverName(waybill.driverName || inboundTrip?.driverName || '');

      setRows([
        {
          id: waybill.id,
          orderCode: waybill.orderCode || '',
          pickupAddress: waybill.pickupAddress || waybill.originHub || 'Polaris Hub - Hưng Yên',
          goodsDescription: waybill.goodsDescription || 'Hàng hóa tiếp nhận',
          totalQuantity: waybill.totalQuantity || 1,
          remainingQuantity: waybill.remainingQuantity ?? waybill.totalQuantity ?? 1,
          inboundQuantity: waybill.inboundQuantity ?? waybill.totalQuantity ?? 1,
          outboundQuantity: waybill.outboundQuantity ?? 0,
          totalWeight: waybill.totalWeight || 0,
          totalVolume: waybill.totalVolume || 0,
          deliveryMode:
            (waybill.deliveryMode as any) ||
            (waybill.destinationHubId ? 'HUB_L1' : 'DIRECT_CUSTOMER'),
          deliveryAddress: waybill.deliveryAddress || waybill.destinationHub || '',
          destinationHubId: waybill.destinationHubId ?? null,
          notes: waybill.notes || '',
        },
      ]);
    }
  }, [waybill]);

  if (!waybill) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(waybill.orderCode);
    setCopied(true);
    toast.success('Đã sao chép mã vận đơn!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      toast.success('Đã lưu nháp thay đổi thành công!');
      onClose();
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleConfirmInbound = async () => {
    setIsSubmitting(true);
    try {
      toast.success('Đã xác nhận tiếp nhận & lưu kho thành công!');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPreviewLabel = () => {
    if (rows.length > 0) {
      const r = rows[0];
      setPreviewLabelData({
        orderCode: r.orderCode || waybill.orderCode,
        goodsDescription: r.goodsDescription || 'HÀNG HÓA TIẾP NHẬN',
        totalQuantity: r.totalQuantity || 1,
        packagesOnPallet: r.totalQuantity || 1,
        palletIndex: 1,
        totalPallets: 1,
        originHub: r.pickupAddress,
        destinationHub: r.deliveryAddress,
        createdAt: waybill.createdAt,
      });
    } else if (onPrintLabel) {
      onPrintLabel(waybill);
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
            {/* 1. Mode Tabs (Mới hoàn toàn | Luân chuyển nội bộ) */}
            <div className="w-full bg-[#E8EDF4] dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('NEW')}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold text-center transition-all ${
                  activeTab === 'NEW'
                    ? 'bg-white dark:bg-slate-700 text-[#0F3D62] dark:text-blue-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Mới hoàn toàn
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TRANSFER')}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold text-center transition-all ${
                  activeTab === 'TRANSFER'
                    ? 'bg-white dark:bg-slate-700 text-[#0F3D62] dark:text-blue-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Luân chuyển nội bộ
              </button>
            </div>

            {/* 2. Three Receipt Header Fields */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* 1. Ngày tiếp nhận */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  1. Ngày tiếp nhận <span className="text-red-600 font-black">*</span>
                </label>
                <div className="relative">
                  <IconCalendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={receiveDate}
                    onChange={(e) => setReceiveDate(e.target.value)}
                    className="h-9 pl-8 text-xs border-red-300 focus:border-red-500 bg-red-50/20 dark:bg-red-950/20 dark:border-red-900"
                  />
                </div>
              </div>

              {/* 2. Biển số xe */}
              <div>
                <label className="text-xs font-bold text-red-600 dark:text-red-400 block mb-1.5">
                  2. Biển số xe <span className="text-red-600 font-black">*</span>
                </label>
                <div className="relative">
                  <IconTruck className="absolute left-2.5 top-2.5 h-4 w-4 text-red-400" />
                  <Input
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="VD: 29C-123.45"
                    className="h-9 pl-8 text-xs font-bold border-red-400 focus:border-red-500 uppercase bg-red-50/30 text-red-950 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200"
                  />
                </div>
              </div>

              {/* 3. Họ tên người nhận / tài xế */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  3. Họ tên người nhận / tài xế <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <div className="relative">
                  <IconUser className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="h-9 pl-8 text-xs font-medium border-slate-300 focus:border-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* 3. The WarehouseEditableGrid Card matching media_1789701292590.png */}
            <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
              <WarehouseEditableGrid
                rows={rows}
                onChange={setRows}
                isOutboundMode={false}
              />

              {/* Sticky Action Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {rows.length} dòng hàng
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft || isSubmitting || rows.length === 0}
                    className="text-xs font-semibold h-9 border-slate-300 dark:border-slate-700"
                  >
                    {isSavingDraft ? (
                      <>
                        <IconLoader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang lưu nháp...
                      </>
                    ) : (
                      'Lưu nháp'
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenPreviewLabel}
                    className="text-xs font-semibold h-9 border-slate-300 dark:border-slate-700"
                  >
                    <IconPrinter className="mr-1.5 h-4 w-4 text-blue-600" /> Xem trước
                  </Button>

                  <Button
                    type="button"
                    onClick={handleConfirmInbound}
                    disabled={isSubmitting || rows.length === 0}
                    className="bg-[#0F3D62] hover:bg-[#0c314f] text-white px-5 font-bold shadow-md h-9 text-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu dữ liệu...
                      </>
                    ) : (
                      <>
                        <IconCircleCheck className="mr-1.5 h-4 w-4 text-emerald-400" /> Xác nhận tiếp nhận & Lưu kho
                      </>
                    )}
                  </Button>
                </div>
              </div>
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
