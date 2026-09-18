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
import { IconPrinter, IconX, IconTruck } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';

export interface OutboundReceiptData {
  orderCode: string;
  goodsDescription: string;
  totalQuantity: number;
  outboundQuantity?: number;
  remainingQuantity?: number;
  totalWeight?: number;
  totalVolume?: number;
  originHub?: string;
  destinationHub?: string;
  deliveryAddress?: string;
  driverName?: string;
  licensePlate?: string;
  mode?: 'CUSTOMER' | 'TRANSFER';
  dispatchDate?: string | Date;
  notes?: string;
}

interface WarehouseOutboundReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: OutboundReceiptData | null;
}

export function WarehouseOutboundReceiptModal({
  isOpen,
  onClose,
  data,
}: WarehouseOutboundReceiptModalProps) {
  const user = useAuthStore((state) => state.user);

  if (!data) return null;

  const currentHubName = (data.originHub || user?.hub?.name || 'Kho xuất hàng').toUpperCase();
  const formattedDate = data.dispatchDate
    ? new Date(data.dispatchDate).toLocaleDateString('vi-VN')
    : new Date().toLocaleDateString('vi-VN');
  const qty = data.outboundQuantity ?? data.totalQuantity ?? 1;
  const isTransfer = data.mode === 'TRANSFER';

  const handlePrint = () => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Phiếu Xuất Kho - ${data.orderCode}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 20mm;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 13pt;
              line-height: 1.4;
              color: #000;
              background: #fff;
            }
            .header-table { width: 100%; margin-bottom: 12px; }
            .company-name { font-weight: bold; font-size: 11pt; text-transform: uppercase; }
            .doc-title { text-align: center; font-size: 18pt; font-weight: bold; margin: 12px 0 4px; text-transform: uppercase; }
            .doc-date { text-align: center; font-style: italic; font-size: 11pt; margin-bottom: 16px; }
            .info-table { width: 100%; margin-bottom: 16px; font-size: 12pt; }
            .info-table td { padding: 3px 0; }
            .grid-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
              font-size: 11.5pt;
            }
            .grid-table th, .grid-table td {
              border: 1px solid #000;
              padding: 6px 8px;
              text-align: left;
            }
            .grid-table th {
              background-color: #f2f2f2;
              text-align: center;
              font-weight: bold;
            }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .signature-table { width: 100%; margin-top: 30px; font-size: 12pt; }
            .signature-table td { text-align: center; vertical-align: top; width: 33.3%; }
            .sign-title { font-weight: bold; }
            .sign-sub { font-style: italic; font-size: 10pt; }
            .sign-space { height: 65px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="company-name">HỆ THỐNG QUẢN LÝ VẬN TẢI & KHO BÃI (TMS)</div>
                <div>Kho xuất: <strong>${currentHubName}</strong></div>
              </td>
              <td class="text-right" style="font-size: 11pt;">
                <div>Mã phiếu: <strong>PXK-${data.orderCode}</strong></div>
                <div>Mã đơn hàng: <strong>${data.orderCode}</strong></div>
              </td>
            </tr>
          </table>

          <div class="doc-title">PHIẾU XUẤT KHO</div>
          <div class="doc-date">Ngày xuất: ${formattedDate} (${isTransfer ? 'Xuất luân chuyển kho' : 'Xuất giao khách hàng'})</div>

          <table class="info-table">
            <tr>
              <td style="width: 20%;">Tài xế tiếp nhận:</td>
              <td style="width: 45%;"><strong>${data.driverName || 'Tài xế giao hàng'}</strong></td>
              <td style="width: 15%;">Biển số xe:</td>
              <td><strong>${data.licensePlate || 'Xe xuất kho'}</strong></td>
            </tr>
            <tr>
              <td>Mục đích xuất:</td>
              <td colspan="3"><strong>${isTransfer ? `Luân chuyển đến ${data.destinationHub || 'Kho đích'}` : 'Giao hàng cho khách'}</strong></td>
            </tr>
            <tr>
              <td>Địa chỉ giao đến:</td>
              <td colspan="3">${data.deliveryAddress || data.destinationHub || 'Theo hợp đồng vận chuyển'}</td>
            </tr>
            <tr>
              <td>Ghi chú / Diễn giải:</td>
              <td colspan="3">${data.notes || (isTransfer ? 'Xuất luân chuyển tuyến nội bộ' : 'Xuất giao hàng chặng cuối')}</td>
            </tr>
          </table>

          <table class="grid-table">
            <thead>
              <tr>
                <th style="width: 8%;">STT</th>
                <th style="width: 40%;">Tên mặt hàng / Quy cách</th>
                <th style="width: 10%;">ĐVT</th>
                <th style="width: 14%;">Số lượng xuất</th>
                <th style="width: 14%;">Khối lượng (kg)</th>
                <th style="width: 14%;">Thể tích (m³)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-center">1</td>
                <td><strong>${data.goodsDescription || 'Hàng hóa xuất kho'}</strong></td>
                <td class="text-center">Kiện</td>
                <td class="text-center font-bold"><strong>${qty}</strong></td>
                <td class="text-right">${data.totalWeight || 0}</td>
                <td class="text-right">${data.totalVolume || 0}</td>
              </tr>
              <tr>
                <td colspan="3" class="text-center"><strong>Tổng cộng</strong></td>
                <td class="text-center"><strong>${qty}</strong></td>
                <td class="text-right"><strong>${data.totalWeight || 0}</strong></td>
                <td class="text-right"><strong>${data.totalVolume || 0}</strong></td>
              </tr>
            </tbody>
          </table>

          <table class="signature-table">
            <tr>
              <td>
                <div class="sign-title">Thủ kho xuất</div>
                <div class="sign-sub">(Ký, họ tên)</div>
                <div class="sign-space"></div>
                <div>${user?.firstName ? `${user.firstName} ${user.lastName || ''}` : ''}</div>
              </td>
              <td>
                <div class="sign-title">Tài xế tiếp nhận</div>
                <div class="sign-sub">(Ký, họ tên)</div>
                <div class="sign-space"></div>
                <div>${data.driverName || ''}</div>
              </td>
              <td>
                <div class="sign-title">Người lập phiếu</div>
                <div class="sign-sub">(Ký, họ tên)</div>
                <div class="sign-space"></div>
                <div>${user?.firstName ? `${user.firstName} ${user.lastName || ''}` : ''}</div>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (err) {
        console.error('Lỗi khi kích hoạt in:', err);
      } finally {
        setTimeout(() => printFrame.remove(), 1000);
      }
    }, 400);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <IconTruck className="w-5 h-5 text-emerald-600" />
            <span>Phiếu Xuất Kho · Mã {data.orderCode}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Paper Preview */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-5 bg-slate-50 dark:bg-slate-950 text-xs space-y-3">
          <div className="flex justify-between border-b pb-2">
            <div>
              <div className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">Hệ thống Logistics TMS</div>
              <div className="text-slate-500">Kho: {currentHubName}</div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200">MÃ: {data.orderCode}</div>
              <div className="text-slate-500">Ngày: {formattedDate}</div>
            </div>
          </div>

          <div className="text-center py-1">
            <div className="font-black text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              PHIẾU XUẤT KHO {isTransfer ? '(LUÂN CHUYỂN)' : '(GIAO KHÁCH)'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
            <div>Tài xế: <strong>{data.driverName || 'Tài xế giao hàng'}</strong></div>
            <div>Biển số xe: <strong>{data.licensePlate || 'Xe xuất kho'}</strong></div>
            <div className="col-span-2">
              Xuất: <strong>{data.goodsDescription}</strong> ({qty} kiện - {data.totalWeight || 0} kg - {data.totalVolume || 0} m³)
            </div>
            <div className="col-span-2 text-slate-500">
              Đích đến: {data.deliveryAddress || data.destinationHub || 'Theo chỉ định'}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex justify-end">
          <Button variant="outline" onClick={onClose} size="sm">
            <IconX className="mr-1 h-4 w-4" /> Đóng
          </Button>
          <Button onClick={handlePrint} size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800">
            <IconPrinter className="mr-1.5 h-4 w-4" /> In phiếu xuất A4
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
