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
  originHub?: string;
  goodsDescription?: string;
  totalQuantity?: number;
  totalWeight?: number;
  totalVolume?: number;
  notes?: string;
  status: string;
  inboundType?: 'CUSTOMER' | 'TRANSFER' | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: {
    fullName?: string;
    hub?: { name?: string };
  };
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        {/* Header */}
        <div className="bg-[#0F3D62] text-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold mb-1">
                <IconBuildingWarehouse className="h-4 w-4" />
                <span>Chi tiết Mã vận đơn tiếp nhận</span>
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-mono font-black tracking-wide text-white">
                  {waybill.orderCode}
                </h2>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-all text-xs flex items-center gap-1 px-2 font-mono"
                  title="Sao chép mã"
                >
                  {copied ? (
                    <>
                      <IconCheck className="h-3.5 w-3.5 text-emerald-300" />
                      <span className="text-[11px]">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <IconCopy className="h-3.5 w-3.5" />
                      <span className="text-[11px]">Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                className={
                  waybill.status === 'INBOUND'
                    ? 'bg-emerald-500 text-white font-bold border-0 text-xs px-3 py-1'
                    : 'bg-amber-400 text-amber-950 font-bold border-0 text-xs px-3 py-1'
                }
              >
                {waybill.status === 'INBOUND' ? 'ĐÃ NHẬP KHO' : 'CHỜ NHẬP KHO'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Khối 1: Thông tin nguồn gốc & Phương tiện tiếp nhận */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <div className="space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[11px]">
                Nguồn gửi & Kho tiếp nhận
              </span>
              <div className="flex items-start gap-2">
                <IconBuildingWarehouse className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <span className="text-gray-500">Kho / Nguồn gửi:</span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {waybill.originHub || waybill.pickupAddress || 'Khách hàng gửi trực tiếp'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IconBuildingWarehouse className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="text-gray-500">Kho / Đích nhận:</span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {waybill.destinationHub || waybill.deliveryAddress || 'Kho tiếp nhận'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[11px]">
                Hình thức & Loại tiếp nhận
              </span>
              <div className="flex items-center gap-2">
                <IconTruck className="h-4 w-4 text-purple-600 shrink-0" />
                <div>
                  <span className="text-gray-500">Loại tiếp nhận:</span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {waybill.inboundType === 'TRANSFER' || waybill.orderCode.startsWith('TRIP')
                      ? 'Luân chuyển nội bộ liên Hub'
                      : 'Khách gửi trực tiếp tại kho'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <IconClock className="h-4 w-4 text-amber-600 shrink-0" />
                <div>
                  <span className="text-gray-500">Thời gian tạo:</span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {waybill.createdAt
                      ? new Date(waybill.createdAt).toLocaleString('vi-VN')
                      : 'Hôm nay'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Khối 2: Bảng kê danh mục hàng hóa theo thông số kiện vận tải (NO-SKU Rule) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <IconPackage className="h-4 w-4 text-blue-600" />
                <span>Danh mục hàng hóa theo kiện vận tải</span>
              </h3>
              <span className="text-[11px] text-gray-400 italic">
                * Quản lý theo thông số kiện vận tải (Consignment Level)
              </span>
            </div>

            <div className="border rounded-lg overflow-hidden border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                  <tr>
                    <th className="p-2.5 w-[50px] text-center">STT</th>
                    <th className="p-2.5">TÊN HÀNG HÓA</th>
                    <th className="p-2.5 text-center w-[100px]">SỐ KIỆN</th>
                    <th className="p-2.5 text-right w-[110px]">TỔNG KG</th>
                    <th className="p-2.5 text-right w-[100px]">THỂ TÍCH M³</th>
                    <th className="p-2.5 w-[140px]">HÌNH THỨC GIAO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-2.5 text-center font-mono font-bold text-gray-500">01</td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                      {waybill.goodsDescription || 'Hàng hóa tổng quan'}
                      {waybill.notes && (
                        <p className="text-[11px] text-gray-400 font-normal mt-0.5">
                          Ghi chú: {waybill.notes}
                        </p>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-bold text-blue-600 dark:text-blue-400">
                      {waybill.totalQuantity ?? 1} kiện
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-800 dark:text-slate-200">
                      {(waybill.totalWeight ?? 0).toLocaleString('vi-VN')} kg
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-800 dark:text-slate-200">
                      {waybill.totalVolume ?? 0} m³
                    </td>
                    <td className="p-2.5">
                      <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50">
                        {waybill.deliveryMode === 'HUB_L1'
                          ? 'Hub Cấp 1'
                          : waybill.deliveryMode === 'XE_BO'
                          ? 'Xe bo Cấp 2'
                          : 'Giao thẳng'}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t text-slate-800 dark:text-slate-200">
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right">Tổng cộng kiện vận tải:</td>
                    <td className="p-2.5 text-center text-blue-600 dark:text-blue-400">
                      {waybill.totalQuantity ?? 1} kiện
                    </td>
                    <td className="p-2.5 text-right">
                      {(waybill.totalWeight ?? 0).toLocaleString('vi-VN')} kg
                    </td>
                    <td className="p-2.5 text-right">{waybill.totalVolume ?? 0} m³</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Khối 3: Ghi chú & Hướng dẫn bốc dỡ */}
          {waybill.notes && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 text-xs">
              <span className="font-bold text-amber-900 dark:text-amber-300 block mb-1 flex items-center gap-1">
                <IconFileDescription className="h-3.5 w-3.5" /> Ghi chú nghiệp vụ / Bốc dỡ:
              </span>
              <p className="text-amber-800 dark:text-amber-200 whitespace-pre-line">
                {waybill.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold"
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
              className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-slate-800"
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
                className="bg-[#0F3D62] hover:bg-[#0c314f] text-white text-xs font-bold shadow-sm"
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
