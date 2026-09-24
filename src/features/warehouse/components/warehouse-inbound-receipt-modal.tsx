'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconPrinter, IconX, IconBuildingWarehouse } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { SPIDER_LOGO_BASE64, SPIDER_LOGO_SRC } from '@/features/warehouse/constants/receipt-logo';

export interface InboundReceiptItem {
  orderCode: string;
  goodsDescription: string;
  quantity: number;
  unit?: string;
  deliveryAddress?: string;
  accompanyingDocs?: string;
  notes?: string;
}

export interface InboundReceiptData {
  orderCode: string;
  tripCode?: string;
  goodsDescription?: string;
  totalQuantity?: number;
  inboundQuantity?: number;
  unit?: string;
  totalWeight?: number;
  totalVolume?: number;
  originHub?: string;
  destinationHub?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  driverName?: string;
  licensePlate?: string;
  createdAt?: string | Date;
  notes?: string;
  accompanyingDocs?: string;
  items?: InboundReceiptItem[];
}

interface WarehouseInboundReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InboundReceiptData | null;
}

export function WarehouseInboundReceiptModal({
  isOpen,
  onClose,
  data
}: WarehouseInboundReceiptModalProps) {
  const user = useAuthStore((state) => state.user);

  if (!data) return null;

  const currentHubName = (data.originHub || user?.hub?.name || 'Hub Polaris').toUpperCase();
  const formattedDate = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('vi-VN')
    : new Date().toLocaleDateString('vi-VN');
  const receiptItems: InboundReceiptItem[] =
    data.items && data.items.length > 0
      ? data.items
      : [
          {
            orderCode: data.orderCode,
            goodsDescription: data.goodsDescription || 'Hàng hóa nhập kho',
            quantity: data.inboundQuantity ?? data.totalQuantity ?? 1,
            unit: data.unit || 'Kiện',
            deliveryAddress: data.deliveryAddress || data.destinationHub || '—',
            accompanyingDocs: data.accompanyingDocs || '01 BỘ CT',
            notes: data.notes || '',
          },
        ];

  const totalReceiptQty = receiptItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0,
  );
  const displayDocCode = data.tripCode || data.orderCode;

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
          <title>Phiếu Nhập Kho - ${displayDocCode}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.35;
              color: #000;
              background: #fff;
            }
            .header-table { width: 100%; margin-bottom: 10px; border: none; }
            .header-table td { border: none; vertical-align: middle; }
            .logo-img { height: 48px; max-width: 220px; object-fit: contain; }
            .doc-title { text-align: center; font-size: 18pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
            .doc-code { text-align: center; font-size: 13pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
            
            .info-grid-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              margin-bottom: 16px;
              font-size: 11.5pt;
            }
            .info-grid-table td {
              border: 1px solid #000;
              padding: 4px 8px;
            }
            .info-label { width: 22%; font-weight: bold; }
            .info-value { width: 78%; }

            .grid-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
              font-size: 11pt;
            }
            .grid-table th, .grid-table td {
              border: 1px solid #000;
              padding: 5px 6px;
            }
            .grid-table th {
              background-color: #f2f2f2;
              text-align: center;
              font-weight: bold;
            }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .font-bold { font-weight: bold !important; }

            .signature-table { width: 100%; margin-top: 24px; font-size: 11.5pt; border: none; }
            .signature-table td { text-align: center; vertical-align: top; width: 33.3%; border: none; }
            .sign-title { font-weight: bold; }
            .sign-sub { font-style: italic; font-size: 10pt; }
            .sign-space { height: 60px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 35%; vertical-align: middle;">
                <img src="${SPIDER_LOGO_BASE64}" alt="Spider Express" class="logo-img" />
              </td>
              <td style="width: 65%; text-align: center; vertical-align: middle; padding-right: 15%;">
                <div class="doc-title">PHIẾU NHẬP KHO</div>
                <div class="doc-code">${displayDocCode}</div>
              </td>
            </tr>
          </table>

          <table class="info-grid-table">
            <tr>
              <td class="info-label">Ngày/tháng/năm</td>
              <td class="info-value">${formattedDate}</td>
            </tr>
            <tr>
              <td class="info-label">Tài xế giao hàng</td>
              <td class="info-value"><strong>${(data.driverName || '—').toUpperCase()}</strong></td>
            </tr>
            <tr>
              <td class="info-label">Biển số xe</td>
              <td class="info-value"><strong>${data.licensePlate || '—'}</strong></td>
            </tr>
            <tr>
              <td class="info-label">Nhập Tại Kho</td>
              <td class="info-value"><strong>${currentHubName}</strong></td>
            </tr>
          </table>

          <table class="grid-table">
            <thead>
              <tr>
                <th style="width: 5%;">STT</th>
                <th style="width: 17%;">Mã Đơn Hàng</th>
                <th style="width: 25%;">Tên mặt hàng</th>
                <th style="width: 10%;">Số lượng</th>
                <th style="width: 8%;">Đơn vị</th>
                <th style="width: 17%;">Địa chỉ giao hàng</th>
                <th style="width: 9%;">Chứng từ đi kèm</th>
                <th style="width: 9%;">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              ${receiptItems
                .map(
                  (it, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td class="text-center font-bold">${it.orderCode}</td>
                  <td><strong>${it.goodsDescription || 'Hàng hóa nhập kho'}</strong></td>
                  <td class="text-center font-bold">${(it.quantity || 1).toLocaleString('vi-VN')}</td>
                  <td class="text-center">${it.unit || 'Kiện'}</td>
                  <td>${it.deliveryAddress || '—'}</td>
                  <td class="text-center">${it.accompanyingDocs || '01 BỘ CT'}</td>
                  <td>${it.notes || ''}</td>
                </tr>
              `,
                )
                .join('')}
              <tr>
                <td colspan="3" class="text-center font-bold"><strong>Tổng cộng</strong></td>
                <td class="text-center font-bold"><strong>${totalReceiptQty.toLocaleString('vi-VN')}</strong></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <table class="signature-table">
            <tr>
              <td>
                <div class="sign-title">Người Lập Phiếu</div>
                <div class="sign-sub">(Ký, họ tên)</div>
                <div class="sign-space"></div>
                <div>${user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''}</div>
              </td>
              <td>
                <div class="sign-title">Lái Xe</div>
                <div class="sign-sub">(Ký, họ tên)</div>
                <div class="sign-space"></div>
                <div>${data.driverName || ''}</div>
              </td>
              <td>
                <div class="sign-title">Thủ Kho</div>
                <div class="sign-sub">(Ký, họ tên)</div>
                <div class="sign-space"></div>
                <div>${user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''}</div>
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
      <DialogContent className='sm:max-w-3xl max-w-[95vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white'>
            <IconBuildingWarehouse className='w-5 h-5 text-blue-600' />
            <span>Phiếu Nhập Kho · Mã {displayDocCode}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Paper Preview */}
        <div className='border border-slate-200 dark:border-slate-700 rounded-lg p-5 bg-slate-50 dark:bg-slate-950 text-xs space-y-3'>
          <div className='flex items-center justify-between border-b pb-3'>
            <div className='flex items-center'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SPIDER_LOGO_SRC}
                alt='Spider Express'
                className='h-9 w-auto object-contain rounded'
              />
            </div>
            <div className='text-center flex-1 pr-14'>
              <div className='font-black text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wide'>
                PHIẾU NHẬP KHO
              </div>
              <div className='font-mono font-bold text-slate-600 dark:text-slate-300 text-xs mt-0.5'>
                {displayDocCode}
              </div>
            </div>
          </div>

          <div className='border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800'>
            <div className='grid grid-cols-4 text-xs'>
              <span className='p-2 font-bold bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'>
                Ngày/tháng/năm
              </span>
              <span className='p-2 col-span-3 text-slate-800 dark:text-slate-200'>
                {formattedDate}
              </span>
            </div>
            <div className='grid grid-cols-4 text-xs'>
              <span className='p-2 font-bold bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'>
                Tài xế giao hàng
              </span>
              <span className='p-2 col-span-3 font-semibold text-slate-900 dark:text-white'>
                {(data.driverName || '—').toUpperCase()}
              </span>
            </div>
            <div className='grid grid-cols-4 text-xs'>
              <span className='p-2 font-bold bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'>
                Biển số xe
              </span>
              <span className='p-2 col-span-3 font-semibold text-slate-900 dark:text-white'>
                {data.licensePlate || '—'}
              </span>
            </div>
            <div className='grid grid-cols-4 text-xs'>
              <span className='p-2 font-bold bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'>
                Nhập Tại Kho
              </span>
              <span className='p-2 col-span-3 font-semibold text-slate-900 dark:text-white'>
                {currentHubName}
              </span>
            </div>
          </div>

          <div className='overflow-x-auto border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900'>
            <table className='w-full text-[11px] text-left'>
              <thead className='bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800'>
                <tr>
                  <th className='p-2 text-center w-8'>STT</th>
                  <th className='p-2'>Mã Đơn Hàng</th>
                  <th className='p-2'>Tên mặt hàng</th>
                  <th className='p-2 text-center'>Số lượng</th>
                  <th className='p-2 text-center'>Đơn vị</th>
                  <th className='p-2'>Địa chỉ giao hàng</th>
                  <th className='p-2 text-center'>Chứng từ đi kèm</th>
                  <th className='p-2'>Ghi chú</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100 dark:divide-slate-800'>
                {receiptItems.map((item, index) => (
                  <tr key={`${item.orderCode}-${index}`}>
                    <td className='p-2 text-center font-medium'>{index + 1}</td>
                    <td className='p-2 font-mono font-bold text-blue-700 dark:text-blue-400'>
                      {item.orderCode}
                    </td>
                    <td className='p-2 font-semibold text-slate-800 dark:text-slate-200'>
                      {item.goodsDescription || 'Hàng hóa nhập kho'}
                    </td>
                    <td className='p-2 text-center font-bold text-slate-900 dark:text-white'>
                      {(item.quantity || 1).toLocaleString('vi-VN')}
                    </td>
                    <td className='p-2 text-center text-slate-600 dark:text-slate-400'>
                      {item.unit || 'Kiện'}
                    </td>
                    <td className='p-2 text-slate-600 dark:text-slate-400'>
                      {item.deliveryAddress || '—'}
                    </td>
                    <td className='p-2 text-center text-slate-600 dark:text-slate-400'>
                      {item.accompanyingDocs || '01 BỘ CT'}
                    </td>
                    <td className='p-2 text-slate-500'>{item.notes || '—'}</td>
                  </tr>
                ))}
                <tr className='bg-slate-50 dark:bg-slate-800/40 font-bold'>
                  <td colSpan={3} className='p-2 text-center text-slate-800 dark:text-slate-200'>
                    Tổng cộng
                  </td>
                  <td className='p-2 text-center text-slate-900 dark:text-white'>
                    {totalReceiptQty.toLocaleString('vi-VN')}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className='grid grid-cols-3 pt-2 text-center text-slate-700 dark:text-slate-300 text-[11px]'>
            <div>
              <div className='font-bold'>Người Lập Phiếu</div>
              <div className='text-[10px] text-slate-400'>(Ký, họ tên)</div>
              <div className='mt-8 font-medium'>
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''}
              </div>
            </div>
            <div>
              <div className='font-bold'>Lái Xe</div>
              <div className='text-[10px] text-slate-400'>(Ký, họ tên)</div>
              <div className='mt-8 font-medium'>{data.driverName || ''}</div>
            </div>
            <div>
              <div className='font-bold'>Thủ Kho</div>
              <div className='text-[10px] text-slate-400'>(Ký, họ tên)</div>
              <div className='mt-8 font-medium'>
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className='gap-2 flex justify-end'>
          <Button variant='outline' onClick={onClose} size='sm'>
            <IconX className='mr-1 h-4 w-4' /> Đóng
          </Button>
          <Button
            onClick={handlePrint}
            size='sm'
            className='bg-[#0F3D62] text-white hover:bg-[#0c314f]'
          >
            <IconPrinter className='mr-1.5 h-4 w-4' /> In phiếu nhập
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
