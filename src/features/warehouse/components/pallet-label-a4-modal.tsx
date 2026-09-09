'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconPrinter, IconX } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';

export interface PalletLabelData {
  orderCode: string;
  goodsDescription: string;
  totalQuantity: number;
  packagesOnPallet?: number;
  palletIndex?: number;
  totalPallets?: number;
  originHub?: string;
  destinationHub?: string;
  deliveryAddress?: string;
  createdAt?: string | Date;
  receiverOrDriverName?: string;
}

interface PalletLabelA4ModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PalletLabelData | null;
}

export function PalletLabelA4Modal({
  isOpen,
  onClose,
  data,
}: PalletLabelA4ModalProps) {
  const user = useAuthStore((state) => state.user);

  if (!data) return null;

  const currentHubName = user?.hub?.name || data.originHub || 'Andromeda Hub - HCM';
  const operatorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Thủ kho tiếp nhận';
  const formattedDate = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('vi-VN')
    : new Date().toLocaleDateString('vi-VN');

  const packagesOnPallet = data.packagesOnPallet || data.totalQuantity || 1;
  const totalQuantity = data.totalQuantity || packagesOnPallet;
  const palletIndex = data.palletIndex || 1;
  const totalPallets = data.totalPallets || 1;
  const destination = data.destinationHub || data.deliveryAddress || 'Điểm giao chặng cuối';

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white p-6 dark:bg-slate-900 print:p-0 print:border-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center justify-between text-lg font-bold">
            <span>🖨️ Xem & In Tem Nhận Diện Hàng Hóa A4</span>
          </DialogTitle>
        </DialogHeader>

        {/* ── Printable A4 Pallet Label Container (Golden A4 Spec) ── */}
        <div id="pallet-label-print-area" className="w-full border-4 border-black p-4 font-sans text-black dark:text-black dark:bg-white bg-white">
          <div className="border-b-4 border-black pb-2 text-center">
            <h1 className="text-2xl font-black uppercase tracking-wider">
              TEM NHẬN DIỆN HÀNG HÓA
            </h1>
            <p className="text-xs font-semibold text-gray-700">
              TIÊU CHUẨN DÁN PALLET / KIỆN VẬN TẢI HÀNG KHÔNG & ĐƯỜNG BỘ
            </p>
          </div>

          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="border-r-2 border-black p-2">
              <span className="text-xs font-bold text-gray-600 block">KHO TIẾP NHẬN:</span>
              <span className="text-sm font-black uppercase">{currentHubName}</span>
            </div>
            <div className="p-2">
              <span className="text-xs font-bold text-gray-600 block">TÊN HÀNG HÓA:</span>
              <span className="text-base font-black text-blue-900 uppercase">
                {data.goodsDescription}
              </span>
            </div>
          </div>

          <div className="border-b-2 border-black p-3 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-600 block">MÃ ĐƠN HÀNG (CANONICAL):</span>
              <span className="text-xl font-mono font-black tracking-widest text-red-600">
                {data.orderCode}
              </span>
            </div>
            <div className="text-right">
              {/* Pseudo Barcode / QR pattern */}
              <div className="font-mono text-xs tracking-tighter bg-black text-white px-2 py-1 inline-block font-bold">
                ||| | |||| | ||| |||| | ||
              </div>
              <span className="text-[10px] text-gray-500 block font-mono">CODE128: {data.orderCode}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="border-r-2 border-black p-2">
              <span className="text-xs font-bold text-gray-600 block">NGÀY NHẬP:</span>
              <span className="text-sm font-bold">{formattedDate}</span>
            </div>
            <div className="p-2">
              <span className="text-xs font-bold text-gray-600 block">SỐ LƯỢNG (KIỆN / TỔNG ĐƠN):</span>
              <span className="text-lg font-black text-amber-700">
                {packagesOnPallet} / {totalQuantity} <span className="text-xs font-normal text-gray-600">kiện</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="border-r-2 border-black p-2 bg-amber-50/50">
              <span className="text-xs font-bold text-gray-600 block">PALET SỐ:</span>
              <span className="text-xl font-black text-slate-800">
                PALET #{palletIndex.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="p-2 bg-amber-50/50">
              <span className="text-xs font-bold text-gray-600 block">TỔNG SỐ PALET:</span>
              <span className="text-xl font-black text-slate-800">
                {totalPallets} PALET
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="border-r-2 border-black p-2">
              <span className="text-xs font-bold text-gray-600 block">NGƯỜI TIẾP NHẬN:</span>
              <span className="text-sm font-bold">{operatorName}</span>
            </div>
            <div className="p-2">
              <span className="text-xs font-bold text-gray-600 block">NGƯỜI GIAO / LÁI XE:</span>
              <span className="text-sm font-bold">{data.receiverOrDriverName || 'Theo biên bản bàn giao'}</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/50">
            <span className="text-xs font-bold text-gray-600 block">GIAO ĐẾN (ĐÍCH ĐẾN / TUYẾN XE BO):</span>
            <span className="text-base font-black text-emerald-900 uppercase">
              {destination}
            </span>
          </div>
        </div>

        <DialogFooter className="print:hidden mt-4 gap-2 flex sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            <IconX className="mr-1.5 h-4 w-4" /> Đóng
          </Button>
          <Button onClick={handlePrint} className="bg-[#0F3D62] text-white hover:bg-[#0c314f]">
            <IconPrinter className="mr-1.5 h-4 w-4" /> In Tem Ngay (Ctrl + P)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
