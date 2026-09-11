'use client';

import React, { useEffect } from 'react';
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

  const currentHubName = (data?.originHub || user?.hub?.name || 'Kho tiếp nhận').toUpperCase();

  const formattedDate = data?.createdAt
    ? new Date(data.createdAt).toLocaleDateString('vi-VN')
    : new Date().toLocaleDateString('vi-VN');

  const totalQuantity = data?.totalQuantity ?? 1;
  const quantityDisplay = data?.packagesOnPallet
    ? `${data.packagesOnPallet} / ${totalQuantity}`
    : `... / ${totalQuantity}`;
  const palletIndex = data?.palletIndex ? data.palletIndex.toString().padStart(2, '0') : '...';
  const totalPallets = data?.totalPallets ? data.totalPallets.toString().padStart(2, '0') : '...';
  const goodsDescription = (data?.goodsDescription || 'HÀNG HÓA NHẬP KHO').toUpperCase();

  const handlePrint = () => {
    if (!data) return;
    // ── Isolated High-Fidelity A4 Landscape Print Routine via Hidden Iframe ──
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
          <title>Tem Nhận Diện Hàng Hóa - ${data.orderCode}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: 100%;
              height: 100%;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, 'Segoe UI', Tahoma, 'Helvetica Neue', sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page-container {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              box-sizing: border-box;
              padding: 2mm 4mm;
            }
            .header-title {
              text-align: center;
              font-size: 32pt;
              font-weight: 900;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 6px;
              color: #000000;
              font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
            }
            .sub-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 14pt;
              font-weight: bold;
              margin-bottom: 12px;
              padding: 0 4px;
              color: #000000;
              font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
            }
            .table-grid {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #000000;
              table-layout: fixed;
            }
            .table-grid td {
              border: 1.5px solid #000000;
              padding: 6px 12px;
              color: #000000;
              vertical-align: middle;
            }
            .col-label {
              font-size: 13.5pt;
              font-weight: bold;
              white-space: nowrap;
              text-align: left;
              font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
            }
            .val-order {
              font-size: 44pt;
              font-weight: 900;
              text-align: center;
              font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
              letter-spacing: 2px;
              padding: 10px 4px;
            }
            .val-date {
              font-size: 24pt;
              font-weight: bold;
              text-align: center;
              padding: 6px 4px;
            }
            .val-qty {
              font-size: 38pt;
              font-weight: 900;
              text-align: center;
              padding: 6px 4px;
            }
            .val-pallet {
              font-size: 24pt;
              font-weight: bold;
              text-align: center;
              padding: 6px 4px;
            }
            .val-operator {
              font-size: 24pt;
              font-weight: bold;
              text-align: center;
              padding: 6px 4px;
              height: 12mm;
            }
            .val-dest {
              font-size: 36pt;
              font-weight: 900;
              text-align: center;
              text-transform: uppercase;
              padding: 12px 8px;
              height: 32mm;
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <!-- Row 2: Header Title -->
            <div class="header-title">TEM NHẬN DIỆN HÀNG HÓA</div>

            <!-- Row 3: Sub Header -->
            <div class="sub-header">
              <div>KHO : ${currentHubName}</div>
              <div>TÊN HÀNG: ${goodsDescription}</div>
            </div>

            <!-- Rows 5-10: Main Grid -->
            <table class="table-grid">
              <tbody>
                <!-- Row 5: MÃ ĐƠN HÀNG -->
                <tr>
                  <td class="col-label" style="width: 22%;">MÃ ĐƠN HÀNG :</td>
                  <td colspan="3" class="val-order">${data.orderCode}</td>
                </tr>

                <!-- Row 6: NGÀY NHẬP -->
                <tr>
                  <td class="col-label">NGÀY NHẬP :</td>
                  <td colspan="3" class="val-date">${formattedDate}</td>
                </tr>

                <!-- Row 7: SỐ LƯỢNG -->
                <tr>
                  <td class="col-label">SỐ LƯỢNG :</td>
                  <td colspan="3" class="val-qty">${quantityDisplay}</td>
                </tr>

                <!-- Row 8: PALET SỐ & TỔNG SỐ PALET -->
                <tr>
                  <td class="col-label" style="width: 22%;">PALET SỐ :</td>
                  <td class="val-pallet" style="width: 28%;">${palletIndex}</td>
                  <td class="col-label" style="width: 25%; text-align: center;">TỔNG SỐ PALET :</td>
                  <td class="val-pallet" style="width: 25%;">${totalPallets}</td>
                </tr>

                <!-- Row 9: NGƯỜI NHẬP -->
                <tr>
                  <td class="col-label">NGƯỜI NHẬP :</td>
                  <td colspan="3" class="val-operator"></td>
                </tr>

                <!-- Row 10: GIAO ĐẾN -->
                <tr>
                  <td class="col-label">GIAO ĐẾN :</td>
                  <td colspan="3" class="val-dest"></td>
                </tr>
              </tbody>
            </table>
          </div>
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
        console.error('Lỗi khi kích hoạt in tem:', err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 1000);
      }
    }, 250);
  };

  // Keyboard shortcut Ctrl+P / Cmd+P
  useEffect(() => {
    if (!isOpen || !data) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, data, currentHubName, formattedDate, quantityDisplay, palletIndex, totalPallets, goodsDescription]);

  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-w-[96vw] bg-slate-50 dark:bg-slate-900 p-5 sm:p-6 overflow-y-auto max-h-[95vh] border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <IconPrinter className="w-5 h-5 text-blue-600" />
            <span>Xem & In Tem Nhận Diện Hàng Hóa A4</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Khổ in tiêu chuẩn A4 Nằm ngang (Landscape) dành cho dán Pallet & Kiện hàng vận tải liên Hub.
          </p>
        </DialogHeader>

        {/* ── Realistic A4 Landscape Paper Preview Container ── */}
        <div className="w-full my-2 flex justify-center items-center bg-slate-200/80 dark:bg-slate-950 p-4 sm:p-6 rounded-xl border border-slate-300 dark:border-slate-800 shadow-inner overflow-x-auto">
          <div
            id="pallet-label-print-area"
            className="w-full max-w-[850px] bg-white text-black p-6 sm:p-8 rounded shadow-2xl border border-slate-300 font-sans select-none"
            style={{ fontFamily: "Arial, 'Segoe UI', Tahoma, sans-serif" }}
          >
            {/* Row 2: Header Title */}
            <h1 className="text-center text-2xl sm:text-3xl font-black tracking-wide uppercase text-black mb-3" style={{ fontFamily: "Arial, 'Segoe UI', Tahoma, sans-serif" }}>
              TEM NHẬN DIỆN HÀNG HÓA
            </h1>

            {/* Row 3: Sub Header (Kho & Tên hàng) */}
            <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-black mb-4 px-1" style={{ fontFamily: "Arial, 'Segoe UI', Tahoma, sans-serif" }}>
              <div>
                KHO : <span className="font-black">{currentHubName}</span>
              </div>
              <div>
                TÊN HÀNG: <span className="font-black">{goodsDescription}</span>
              </div>
            </div>

            {/* Rows 5-10: Main Grid (Bordered Table) */}
            <table className="w-full border-collapse border-2 border-black text-black">
              <tbody>
                {/* Row 5: MÃ ĐƠN HÀNG */}
                <tr className="border-b-[1.5px] border-black">
                  <td className="w-[22%] border-r-[1.5px] border-black px-3.5 py-2.5 text-xs sm:text-sm font-bold align-middle">
                    MÃ ĐƠN HÀNG :
                  </td>
                  <td colSpan={3} className="px-4 py-3 text-center align-middle font-sans text-2xl sm:text-4xl font-black tracking-widest text-black" style={{ fontFamily: "Arial, 'Segoe UI', Tahoma, sans-serif" }}>
                    {data.orderCode}
                  </td>
                </tr>

                {/* Row 6: NGÀY NHẬP */}
                <tr className="border-b-[1.5px] border-black">
                  <td className="w-[22%] border-r-[1.5px] border-black px-3.5 py-2 text-xs sm:text-sm font-bold align-middle">
                    NGÀY NHẬP :
                  </td>
                  <td colSpan={3} className="px-4 py-2 text-center align-middle text-base sm:text-xl font-bold text-black">
                    {formattedDate}
                  </td>
                </tr>

                {/* Row 7: SỐ LƯỢNG */}
                <tr className="border-b-[1.5px] border-black">
                  <td className="w-[22%] border-r-[1.5px] border-black px-3.5 py-2 text-xs sm:text-sm font-bold align-middle">
                    SỐ LƯỢNG :
                  </td>
                  <td colSpan={3} className="px-4 py-2.5 text-center align-middle text-2xl sm:text-3xl font-black text-black">
                    {quantityDisplay}
                  </td>
                </tr>

                {/* Row 8: PALET SỐ & TỔNG SỐ PALET */}
                <tr className="border-b-[1.5px] border-black">
                  <td className="w-[22%] border-r-[1.5px] border-black px-3.5 py-2 text-xs sm:text-sm font-bold align-middle">
                    PALET SỐ :
                  </td>
                  <td className="w-[28%] border-r-[1.5px] border-black px-3.5 py-2 text-center align-middle text-base sm:text-xl font-bold text-black">
                    {palletIndex}
                  </td>
                  <td className="w-[25%] border-r-[1.5px] border-black px-3.5 py-2 text-xs sm:text-sm font-bold text-center align-middle">
                    TỔNG SỐ PALET :
                  </td>
                  <td className="w-[25%] px-3.5 py-2 text-center align-middle text-base sm:text-xl font-bold text-black">
                    {totalPallets}
                  </td>
                </tr>

                {/* Row 9: NGƯỜI NHẬP */}
                <tr className="border-b-[1.5px] border-black">
                  <td className="w-[22%] border-r-[1.5px] border-black px-3.5 py-2 text-xs sm:text-sm font-bold align-middle">
                    NGƯỜI NHẬP :
                  </td>
                  <td colSpan={3} className="px-4 py-2 text-center align-middle text-base sm:text-xl font-bold text-black h-9 sm:h-11">
                  </td>
                </tr>

                {/* Row 10: GIAO ĐẾN */}
                <tr>
                  <td className="w-[22%] border-r-[1.5px] border-black px-3.5 py-4 text-xs sm:text-sm font-bold align-middle">
                    GIAO ĐẾN :
                  </td>
                  <td colSpan={3} className="px-4 py-5 text-center align-middle text-2xl sm:text-4xl font-black uppercase tracking-wide text-black h-20 sm:h-24">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 flex sm:justify-between items-center">
          <Button variant="outline" onClick={onClose} className="text-slate-700 dark:text-slate-200">
            <IconX className="mr-1.5 h-4 w-4" /> Đóng
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-[#0F3D62] text-white hover:bg-[#0c314f] font-semibold shadow-sm"
          >
            <IconPrinter className="mr-1.5 h-4 w-4" /> In Tem Ngay (Ctrl + P)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

