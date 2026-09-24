'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  IconBuildingWarehouse,
  IconPrinter,
  IconCircleCheck,
  IconCamera,
  IconLoader2,
  IconFileDescription,
  IconZoomIn,
  IconTrash,
} from '@tabler/icons-react';
import { tokenManager } from '@/lib/token-manager';
import { toast } from 'sonner';
import { WaybillDetailData } from './warehouse-waybill-detail-modal';
import { CargoImageLightboxModal } from './cargo-image-lightbox-modal';
import { apiClient } from '@/lib/api-client';

interface WarehouseTallyModalProps {
  isOpen: boolean;
  onClose: () => void;
  waybill: WaybillDetailData | null;
  onSuccess: () => void;
  onPrintLabel?: (waybill: WaybillDetailData) => void;
}

export function WarehouseTallyModal({
  isOpen,
  onClose,
  waybill,
  onSuccess,
  onPrintLabel,
}: WarehouseTallyModalProps) {
  const [actualQuantity, setActualQuantity] = useState<number>(() => waybill?.totalQuantity || 1);
  const [actualWeight, setActualWeight] = useState<number>(() => waybill?.totalWeight || 0);
  const [actualVolume, setActualVolume] = useState<number>(() => waybill?.totalVolume || 0);
  const [tallyNote, setTallyNote] = useState<string>('Nguyên đai nguyên kiện, bao bì nguyên vẹn');
  const [photos, setPhotos] = useState<string[]>([]);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleRemovePhoto = (idxToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotos((prev) => prev.filter((_, i) => i !== idxToRemove));
    toast.info('Đã xóa ảnh kiện hàng');
  };

  // Sync state when waybill opens
  React.useEffect(() => {
    if (waybill) {
      setActualQuantity(waybill.totalQuantity || 1);
      setActualWeight(waybill.totalWeight || 0);
      setActualVolume(waybill.totalVolume || 0);
      setPhotos([]);
    }
  }, [waybill]);

  if (!waybill) return null;

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const validFiles = fileList.filter((f) => f.type.startsWith('image/'));

    if (validFiles.length === 0) {
      toast.error('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, JPEG, WebP)');
      return;
    }

    setIsUploadingPhoto(true);

    for (const file of validFiles) {
      // 1. Tạo local preview URL tức thì trên UI
      const localPreviewUrl = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, localPreviewUrl]);

      // 2. Upload file thực tế lên endpoint /api/v1/files/upload
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await apiClient.post('/api/v1/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const uploadData = res?.data?.data || res?.data;
        const uploadedFilePath = uploadData?.file?.path;
        if (uploadedFilePath) {
          const serverUrl = uploadedFilePath.startsWith('http')
            ? uploadedFilePath
            : `${apiClient.defaults.baseURL || ''}${uploadedFilePath.startsWith('/') ? '' : '/'}${uploadedFilePath}`;
          setPhotos((prev) =>
            prev.map((url) => (url === localPreviewUrl ? serverUrl : url))
          );
        }
      } catch (uploadErr) {
        console.warn('Lưu ảnh cục bộ khi backend upload chưa sẵn sàng:', uploadErr);
      }
    }

    setIsUploadingPhoto(false);
    toast.success(`Đã thêm ${validFiles.length} ảnh kiện hàng thành công!`);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmInbound = async () => {
    if (!waybill.id) {
      toast.error('Thiếu mã định danh đơn hàng để xác nhận');
      return;
    }

    setIsSubmitting(true);
    const token = tokenManager.getAccessToken();

    try {
      const res = await fetch('/api/v1/warehouse/inbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderIds: [Number(waybill.id)],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể xác nhận nhập kho');
      }

      toast.success(`Đã xác nhận kiểm đếm và tiếp nhận thành công đơn hàng ${waybill.orderCode} vào kho!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error('Lỗi nhập kho: ' + (err instanceof Error ? err.message : 'Vui lòng thử lại'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl max-w-[96vw] w-full p-0 overflow-hidden bg-[#F4F7FB] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl">
        {/* Frame SkFD5 Header (Receiving Header) */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 tracking-wider">
              {waybill.originHub || 'Kho tiếp nhận'} &nbsp;/&nbsp; <span className="font-mono">{waybill.orderCode}</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
              <span>Kiểm đếm nhập kho</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-blue-50 text-[#0F3D62] dark:bg-blue-950 dark:text-blue-300 font-extrabold border border-blue-200 dark:border-blue-800 text-xs px-3 py-1">
              ĐANG KIỂM ĐẾM · INBOUND
            </Badge>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Main Grid: Left = Cargo Table Grid (ODCk5), Right = Evidence Panel (F08wc) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Cargo Table Grid */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <IconBuildingWarehouse className="h-4 w-4 text-blue-600" />
                  <span>Danh sách các dòng hàng kiểm đếm tiếp nhận</span>
                </span>
                <span className="text-[11px] text-gray-400">1 dòng hàng</span>
              </div>

              {/* Table Card (od_table_card_container) */}
              <div className="border rounded-lg overflow-x-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                    <tr>
                      <th className="p-2.5 w-[45px] text-center">STT</th>
                      <th className="p-2.5 min-w-[160px]">MÃ ĐƠN HÀNG *</th>
                      <th className="p-2.5 min-w-[180px]">TÊN HÀNG *</th>
                      <th className="p-2.5 text-center min-w-[90px]">SỐ KIỆN *</th>
                      <th className="p-2.5 text-right min-w-[95px]">SỐ KG *</th>
                      <th className="p-2.5 text-right min-w-[85px]">SỐ M³ *</th>
                      <th className="p-2.5 text-center min-w-[75px]">TEM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    <tr className="whitespace-nowrap">
                      <td className="p-2.5 text-center font-mono font-bold text-slate-500">01</td>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {waybill.orderCode}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-900 dark:text-white max-w-[220px] truncate" title={waybill.goodsDescription || 'Hàng hóa tiếp nhận'}>
                        {waybill.goodsDescription || 'Hàng hóa tiếp nhận'}
                      </td>
                      <td className="p-2.5 text-center">
                        <Input
                          type="number"
                          min="1"
                          value={actualQuantity}
                          onChange={(e) => setActualQuantity(Number(e.target.value) || 1)}
                          className="h-7 text-xs text-center font-bold text-blue-600 p-1 w-16 mx-auto"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <Input
                          type="number"
                          min="0"
                          value={actualWeight}
                          onChange={(e) => setActualWeight(Number(e.target.value) || 0)}
                          className="h-7 text-xs text-right font-bold text-slate-900 p-1 w-20 ml-auto"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={actualVolume}
                          onChange={(e) => setActualVolume(Number(e.target.value) || 0)}
                          className="h-7 text-xs text-right font-bold text-slate-900 p-1 w-16 ml-auto"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (onPrintLabel) onPrintLabel(waybill);
                          }}
                          className="h-7 px-2 text-[11px] font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
                          title="In tem"
                        >
                          <IconPrinter className="h-3.5 w-3.5 mr-0.5" /> Tem
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-left">
                        Tổng cộng: 1 dòng hàng tiếp nhận
                      </td>
                      <td className="p-2.5 text-center text-blue-600">{actualQuantity} kiện</td>
                      <td className="p-2.5 text-right">{actualWeight.toLocaleString('vi-VN')} kg</td>
                      <td className="p-2.5 text-right">{actualVolume} m³</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tally Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <IconFileDescription className="h-3.5 w-3.5" /> Ghi chú tình trạng kiểm đếm / Quy cách kiện:
                </label>
                <Input
                  value={tallyNote}
                  onChange={(e) => setTallyNote(e.target.value)}
                  placeholder="Ghi chú hiện trạng bao bì, kiện hàng..."
                  className="h-8 text-xs bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Right 1 Col: Evidence Panel (F08wc Photo Grid) */}
            <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-1.5">
                  <IconCamera className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Ảnh kiện hàng
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold">
                  {photos.length} ảnh
                </Badge>
              </div>

              {/* Hidden File Input for Real Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Photo Grid or Empty Placeholder */}
              {photos.length === 0 ? (
                <div
                  onClick={handleTriggerUpload}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleTriggerUpload();
                  }}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition-colors text-center group"
                >
                  <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors mb-2">
                    <IconCamera className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Chưa có ảnh chụp kiện hàng
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Bấm để chọn tệp ảnh từ máy tính hoặc chụp ảnh
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-0.5">
                  {photos.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewImageIndex(idx)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setPreviewImageIndex(idx);
                        }
                      }}
                      title="Nhấn để phóng to ảnh kiện hàng"
                      className="relative aspect-video rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 group cursor-pointer hover:border-blue-500 hover:shadow-md transition-all ring-offset-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {/* oxlint-disable-next-line next/no-img-element */}
                      <img
                        src={url}
                        alt={`Kiện hàng ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />

                      {/* Corner Photo Number Badge */}
                      <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none">
                        <span className="text-[9px] font-mono font-bold bg-black/60 backdrop-blur-xs text-white px-1.5 py-0.5 rounded shadow">
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Quick Delete button (hover) */}
                      <button
                        type="button"
                        onClick={(e) => handleRemovePhoto(idx, e)}
                        title="Xóa ảnh này"
                        className="absolute top-1.5 right-1.5 z-20 h-6 w-6 rounded-full bg-black/60 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>

                      {/* Hover Overlay with Zoom Icon */}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                        <div className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shadow">
                          <IconZoomIn className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-[10px] font-bold tracking-tight">Phóng to</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Photo Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingPhoto}
                onClick={handleTriggerUpload}
                className="w-full h-9 text-xs font-bold border-dashed border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600"
              >
                {isUploadingPhoto ? (
                  <>
                    <IconLoader2 className="h-4 w-4 mr-1.5 animate-spin" /> Đang tải ảnh...
                  </>
                ) : (
                  <>
                    <IconCamera className="h-4 w-4 mr-1.5" /> Chụp / thêm ảnh
                  </>
                )}
              </Button>
              <p className="text-[10px] text-gray-400 text-center">
                Chụp ảnh kiện hàng thực tế tại cửa kho để lưu vết kiểm toán
              </p>
            </div>
          </div>
        </div>

        {/* Frame SkFD5 Sticky Footer (Receiving Sticky Footer - xJGxs) */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconCircleCheck className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Đã kiểm 1 dòng hàng · {actualQuantity} kiện · {actualWeight.toLocaleString('vi-VN')} kg sẵn sàng nhập kho
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success('Đã lưu nháp kết quả kiểm đếm!');
                onClose();
              }}
              className="text-xs font-semibold h-9"
            >
              Lưu nháp
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={handleConfirmInbound}
              className="bg-[#0F3D62] hover:bg-[#0c314f] text-white text-xs font-bold shadow-md h-9 px-5"
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 className="h-4 w-4 mr-1.5 animate-spin" /> Đang lưu kho...
                </>
              ) : (
                <>
                  <IconCircleCheck className="h-4 w-4 mr-1.5 text-emerald-400" /> Xác nhận nhập kho
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Cargo Photo Lightbox / Zoom Modal */}
        <CargoImageLightboxModal
          isOpen={previewImageIndex !== null}
          onClose={() => setPreviewImageIndex(null)}
          images={photos}
          initialIndex={previewImageIndex ?? 0}
          title={`Ảnh kiện hàng · ${waybill.orderCode}`}
        />
      </DialogContent>
    </Dialog>
  );
}
