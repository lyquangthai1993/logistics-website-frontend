'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconBuildingWarehouse,
  IconTruck,
  IconPrinter,
  IconClipboardCheck,
  IconCopy,
  IconCheck,
  IconPackage,
  IconClock,
  IconFileDescription,
  IconMapPin,
  IconArrowRight,
  IconUser,
} from '@tabler/icons-react';
import { toast } from 'sonner';

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
  totalWeight?: number;
  totalVolume?: number;
  notes?: string;
  externalNote?: string;
  status: string;
  inboundType?: 'CUSTOMER' | 'TRANSFER' | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
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
    case 'ASSIGNED':
    case 'PENDING_FLEET':
      return (
        <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-0 text-xs px-3 py-1 shadow-xs">
          ĐÃ PHÂN XE
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-bold border-0 text-xs px-3 py-1 shadow-xs">
          ĐÃ HỦY
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="font-bold text-xs px-3 py-1">
          {status}
        </Badge>
      );
  }
}

export function WarehouseWaybillDetailModal({
  isOpen,
  onClose,
  waybill,
  onStartTally,
  onPrintLabel,
}: WarehouseWaybillDetailModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!waybill) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(waybill.orderCode);
    setCopied(true);
    toast.success('Đã sao chép mã vận đơn!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isWaitingInbound =
    waybill.status === 'DRAFT' ||
    waybill.status === 'PENDING' ||
    waybill.status === 'PENDING_INBOUND' ||
    waybill.status === 'WAITING';

  const isTransfer =
    waybill.inboundType === 'TRANSFER' ||
    waybill.orderCode?.startsWith('TRIP') ||
    (waybill.originHub && waybill.destinationHub && waybill.originHub !== waybill.destinationHub) ||
    (waybill.originHubEntity?.id &&
      waybill.destinationHubEntity?.id &&
      waybill.originHubEntity.id !== waybill.destinationHubEntity.id) ||
    (waybill.trips && waybill.trips.length > 0);

  // Accurate Origin, Destination and Current Hub resolution
  const handlingHub = waybill.originHubEntity?.name || waybill.originHub || 'Kho tiếp nhận';

  const originDisplay =
    waybill.pickupAddress?.trim() ||
    (isTransfer ? waybill.originHub || 'Hub gửi luân chuyển' : null) ||
    waybill.senderName?.trim() ||
    (waybill.route?.includes('→') ? waybill.route.split('→')[0].trim() : null) ||
    'Khách gửi trực tiếp tại kho';

  const destinationDisplay =
    waybill.destinationHubEntity?.name ||
    waybill.destinationHub ||
    waybill.deliveryAddress?.trim() ||
    (waybill.route?.includes('→') ? waybill.route.split('→')[1].trim() : null) ||
    'Điểm giao theo vận đơn';

  const routeSummary =
    waybill.route || `${originDisplay} → ${destinationDisplay}`;

  const deliveryModeLabel =
    waybill.deliveryMode === 'HUB_L1' || Boolean(waybill.destinationHubId || waybill.destinationHub)
      ? 'Hub Cấp 1'
      : waybill.deliveryMode === 'XE_BO'
      ? 'Xe bo Cấp 2'
      : 'Giao trực tiếp';

  const tripInfo =
    waybill.trip || (waybill.trips && waybill.trips.length > 0 ? waybill.trips[0] : null);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-w-4xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
        {/* ── Navy Header (#0F3D62) ── */}
        <div className="bg-[#0F3D62] text-white p-5 border-b border-blue-900/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold mb-1">
                <IconBuildingWarehouse className="h-4 w-4 text-blue-300" />
                <span>Chi tiết Mã vận đơn tiếp nhận kho</span>
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-mono font-black tracking-wide text-white">
                  {waybill.orderCode}
                </h2>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-all text-xs flex items-center gap-1.5 px-2.5 font-mono cursor-pointer"
                  title="Sao chép mã"
                >
                  {copied ? (
                    <>
                      <IconCheck className="h-3.5 w-3.5 text-emerald-300" />
                      <span className="text-[11px] font-semibold">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <IconCopy className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-semibold">Sao chép</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-blue-100 text-xs mt-1.5">
                <IconMapPin className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                <span className="font-medium">{routeSummary}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getWaybillStatusBadge(waybill.status)}
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Khối 1: Thông tin vận chuyển & Tiếp nhận kho */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card A: Tuyến vận chuyển & Kho tiếp nhận */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-700/60">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <IconMapPin className="h-3.5 w-3.5 text-blue-600" />
                  <span>Tuyến vận chuyển & Kho tiếp nhận</span>
                </span>
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 font-bold">
                  {handlingHub}
                </Badge>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
                    <IconBuildingWarehouse className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Kho tiếp nhận hiện tại:</span>
                    <p className="font-bold text-slate-900 dark:text-white text-xs">
                      {handlingHub}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                    <IconUser className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Nguồn gửi / Điểm lấy hàng:</span>
                    <p className="font-semibold text-slate-900 dark:text-white text-xs">
                      {originDisplay}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                    <IconArrowRight className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Đích đến / Điểm giao hàng:</span>
                    <p className="font-semibold text-slate-900 dark:text-white text-xs">
                      {destinationDisplay}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card B: Hình thức & Vận hành */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-700/60">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <IconTruck className="h-3.5 w-3.5 text-purple-600" />
                  <span>Hình thức & Vận hành tiếp nhận</span>
                </span>
                <Badge
                  variant="outline"
                  className={
                    isTransfer
                      ? 'bg-purple-50 text-purple-700 border-purple-300 font-bold'
                      : 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                  }
                >
                  {isTransfer ? 'Luân chuyển' : 'Khách gửi'}
                </Badge>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0">
                    <IconTruck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Loại hình tiếp nhận:</span>
                    <p className="font-bold text-slate-900 dark:text-white text-xs">
                      {isTransfer ? 'Luân chuyển nội bộ liên Hub' : 'Khách hàng gửi trực tiếp tại kho'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0">
                    <IconPackage className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Phương thức tuyến giao:</span>
                    <p className="font-semibold text-slate-900 dark:text-white text-xs">
                      {deliveryModeLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                    <IconClock className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Thời gian tiếp nhận:</span>
                    <p className="font-semibold text-slate-900 dark:text-white text-xs">
                      {waybill.createdAt
                        ? new Date(waybill.createdAt).toLocaleString('vi-VN')
                        : 'Hôm nay'}
                    </p>
                  </div>
                </div>

                {tripInfo?.licensePlate && (
                  <div className="flex items-start gap-2.5 pt-1 border-t border-slate-200 dark:border-slate-700/40">
                    <div className="mt-0.5 p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                      <IconTruck className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Phương tiện / Tài xế:</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {tripInfo.licensePlate} {tripInfo.driverName ? `· ${tripInfo.driverName}` : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Khối 2: Bảng kê danh mục hàng hóa theo kiện vận tải (NO-SKU Mandate) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <IconPackage className="h-4 w-4 text-blue-600" />
                <span>Danh mục hàng hóa theo kiện vận tải</span>
              </h3>
              <span className="text-[11px] text-gray-400 italic">
                * Quản lý thông số kiện vận tải (Consignment Level)
              </span>
            </div>

            <div className="w-full overflow-x-auto border rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full min-w-[680px] text-xs text-left">
                <thead className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-[50px] text-center">STT</th>
                    <th className="p-3 min-w-[200px]">TÊN HÀNG HÓA</th>
                    <th className="p-3 text-center w-[100px]">SỐ KIỆN</th>
                    <th className="p-3 text-right w-[120px]">TỔNG KG</th>
                    <th className="p-3 text-right w-[110px]">THỂ TÍCH M³</th>
                    <th className="p-3 text-center w-[130px]">HÌNH THỨC GIAO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <td className="p-3 text-center font-mono font-bold text-gray-500">01</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      <div>{waybill.goodsDescription || 'Hàng hóa tổng quan'}</div>
                      {waybill.notes && (
                        <p className="text-[11px] text-gray-400 font-normal mt-0.5">
                          Ghi chú: {waybill.notes}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {waybill.totalQuantity ?? 1} kiện
                    </td>
                    <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {(waybill.totalWeight ?? 0).toLocaleString('vi-VN')} kg
                    </td>
                    <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {waybill.totalVolume ?? 0} m³
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold bg-slate-50 border-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {deliveryModeLabel}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs">
                  <tr>
                    <td colSpan={2} className="p-3 text-right">Tổng cộng kiện vận tải:</td>
                    <td className="p-3 text-center text-blue-600 dark:text-blue-400 font-black">
                      {waybill.totalQuantity ?? 1} kiện
                    </td>
                    <td className="p-3 text-right font-black">
                      {(waybill.totalWeight ?? 0).toLocaleString('vi-VN')} kg
                    </td>
                    <td className="p-3 text-right font-black">
                      {waybill.totalVolume ?? 0} m³
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Khối 3: Ghi chú & Hướng dẫn bốc dỡ */}
          {(waybill.notes || waybill.externalNote) && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 text-xs">
              <span className="font-bold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                <IconFileDescription className="h-4 w-4 text-amber-600" /> Ghi chú nghiệp vụ / Hướng dẫn bốc dỡ:
              </span>
              <p className="text-amber-800 dark:text-amber-200 whitespace-pre-line leading-relaxed">
                {waybill.notes || waybill.externalNote}
              </p>
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold h-9"
          >
            Đóng
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (onPrintLabel) onPrintLabel(waybill);
              }}
              className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-slate-800 h-9"
            >
              <IconPrinter className="h-4 w-4 mr-1.5" /> In tem Pallet A4
            </Button>

            {isWaitingInbound && onStartTally && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onStartTally(waybill);
                }}
                className="bg-[#0F3D62] hover:bg-[#0c314f] text-white text-xs font-bold shadow-md h-9 px-4"
              >
                <IconClipboardCheck className="h-4 w-4 mr-1.5 text-emerald-400" /> Bắt đầu kiểm đếm & Nhập kho
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

