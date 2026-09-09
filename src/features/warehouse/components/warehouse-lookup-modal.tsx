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
  IconSearch,
  IconCheck,
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconX,
  IconLoader2,
  IconPackage,
  IconBuildingWarehouse,
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';

export interface WarehouseLookupItem {
  id: number;
  orderCode: string;
  goodsDescription?: string | null;
  totalQuantity: number;
  totalWeight: number;
  totalVolume: number;
  pickupAddress: string;
  deliveryAddress: string;
  deliveryMode: 'DIRECT_CUSTOMER' | 'HUB_L1' | 'XE_BO';
  status: string;
  notes?: string | null;
  originHub?: string | null;
  destinationHub?: string | null;
  route?: string | null;
}

interface WarehouseLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder?: (order: WarehouseLookupItem) => void;
  onSelect?: (item: WarehouseLookupItem) => void;
  selectedOrderCodes?: string[];
  targetRowIndex?: number | null;
  isOutboundMode?: boolean;
}

export function WarehouseLookupModal({
  isOpen,
  onClose,
  onSelectOrder,
  onSelect,
  selectedOrderCodes = [],
  targetRowIndex,
  isOutboundMode = false,
}: WarehouseLookupModalProps) {
  const user = useAuthStore((state) => state.user);
  const currentHubName = user?.hub?.name;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<WarehouseLookupItem[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    totalPages: 1,
    allCount: 0,
    storedCount: 0,
    draftCount: 0,
  });

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const token = tokenManager.getAccessToken();
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    });

    fetch(`/api/v1/warehouse/orders?${queryParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((resData) => {
        if (!isMounted) return;
        const items = resData?.data || [];
        const total = resData?.meta?.total || items.length;
        const totalPages = resData?.meta?.totalPages || Math.ceil(total / limit) || 1;
        const allCount = resData?.meta?.allCount ?? total;
        const storedCount =
          resData?.meta?.storedCount ??
          items.filter(
            (i: any) =>
              i.status === 'INBOUND' ||
              i.status === 'STORED' ||
              i.status === 'LUU_KHO',
          ).length;
        const draftCount =
          resData?.meta?.draftCount ??
          items.filter((i: any) => i.status === 'DRAFT' || i.status === 'PENDING')
            .length;

        setData(items);
        setMeta({
          total,
          totalPages,
          allCount,
          storedCount,
          draftCount,
        });
      })
      .catch((err) => {
        console.error('Failed to fetch warehouse lookup orders:', err);
        if (!isMounted) return;
        setData([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, search, statusFilter, page, limit]);

  const handleRowSelect = (order: WarehouseLookupItem) => {
    if (onSelectOrder) onSelectOrder(order);
    else if (onSelect) onSelect(order);
    onClose();
  };

  const startRecord = meta.total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, meta.total);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[1140px] sm:!max-w-[1140px] sm:w-[1140px] w-[95vw] p-0 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 gap-0"
      >
        {/* ── Navy Header (Frame lm_hdr in WH_OUTBOUND_LOOKUP_MODAL) ── */}
        <div className="bg-[#0F3D62] text-white px-6 py-4 flex items-center justify-between border-b border-[#0c314f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/15 shadow-inner">
              <IconBuildingWarehouse className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Tra Cứu & Chọn Đơn Hàng Từ Kho
                </h2>
                {targetRowIndex !== null && targetRowIndex !== undefined && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                    Gán vào Dòng #{targetRowIndex + 1}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200/90 font-medium mt-0.5">
                Kho xuất: <span className="font-semibold text-white">{currentHubName || 'Tất cả trung tâm'}</span> ·{' '}
                <span className="text-blue-100 font-semibold">{meta.storedCount > 0 ? meta.storedCount : meta.total}</span> đơn hàng đang lưu kho sẵn sàng xuất
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
            title="Đóng modal"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* ── Search & Filter Toolbar (Frame lm_toolbar in Pen) ── */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 space-y-3">
          {/* Search Row */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo mã đơn (VD: HCM-LTV-2609-001...), tên hàng hóa, quy cách..."
                className="pl-10 pr-9 h-10 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm rounded-lg focus-visible:ring-2 focus-visible:ring-[#0F3D62]"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <IconX className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              type="button"
              onClick={() => setPage(1)}
              className="h-10 px-5 bg-[#0F3D62] text-white hover:bg-[#0c314f] font-semibold text-sm rounded-lg shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <IconSearch className="w-4 h-4" />
              <span>Tìm kiếm</span>
            </Button>
          </div>

          {/* Status Filter Pills Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Trạng thái:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all font-semibold ${
                    statusFilter === 'ALL'
                      ? 'bg-[#0F3D62] text-white shadow-sm font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ({meta.allCount > 0 ? meta.allCount : meta.total})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('INBOUND');
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all font-semibold flex items-center gap-1.5 ${
                    statusFilter === 'INBOUND'
                      ? 'bg-amber-600 text-white shadow-sm font-bold'
                      : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  LƯU KHO ({meta.storedCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('DRAFT');
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all font-semibold flex items-center gap-1.5 ${
                    statusFilter === 'DRAFT'
                      ? 'bg-slate-700 text-white shadow-sm font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                  DRAFT ({meta.draftCount})
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Tìm thấy <strong className="text-slate-800 dark:text-slate-200">{meta.total}</strong> đơn hàng phù hợp
            </div>
          </div>
        </div>

        {/* ── 7-Column Canonical Table (Frame lm_table_wrap & thead in Pen) ── */}
        <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 w-[180px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  MÃ ĐƠN HÀNG
                </th>
                <th className="px-4 py-3 min-w-[240px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  TÊN HÀNG HÓA
                </th>
                <th className="px-4 py-3 w-[100px] text-right font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  SỐ KIỆN
                </th>
                <th className="px-4 py-3 w-[110px] text-right font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  SỐ KG
                </th>
                <th className="px-4 py-3 w-[100px] text-right font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  SỐ M³
                </th>
                <th className="px-4 py-3 w-[130px] text-center font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  TRẠNG THÁI
                </th>
                <th className="px-4 py-3 w-[160px] text-center font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  THAO TÁC
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-500">
                    <IconLoader2 className="h-7 w-7 animate-spin mx-auto mb-2.5 text-[#0F3D62]" />
                    <span className="text-sm font-medium">Đang tải danh sách hàng hóa trong kho...</span>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <IconPackage className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      Không tìm thấy lô hàng nào phù hợp
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search ? `Không có kết quả cho từ khóa "${search}"` : 'Kho hiện chưa có hàng hóa ở trạng thái này'}
                    </p>
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const selectedIndex = selectedOrderCodes.indexOf(row.orderCode);
                  const isAlreadySelected = selectedIndex !== -1;
                  const isCurrentRowSelected = targetRowIndex !== null && targetRowIndex !== undefined && selectedIndex === targetRowIndex;
                  const isStored = row.status === 'INBOUND' || row.status === 'STORED' || row.status === 'LUU_KHO';

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors hover:bg-blue-50/60 dark:hover:bg-slate-800/60 ${
                        isCurrentRowSelected ? 'bg-blue-50/80 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-[#0F3D62] dark:text-blue-400 whitespace-nowrap">
                        {row.orderCode}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {row.goodsDescription || 'Hàng hóa tổng quan'}
                        </div>
                        {row.route && (
                          <div className="text-[11px] text-slate-400 font-normal truncate max-w-[280px]">
                            {row.route}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {(Number(row.totalQuantity) || 1).toLocaleString('vi-VN')} kiện
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {(Number(row.totalWeight) || 0).toLocaleString('vi-VN')} kg
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {(Number(row.totalVolume) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} m³
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            isStored
                              ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 font-bold px-2.5 py-0.5 rounded-full'
                              : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold px-2.5 py-0.5 rounded-full'
                          }
                        >
                          {isStored ? '🟡 LƯU KHO' : `⚫ ${row.status}`}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isAlreadySelected ? (
                          <span className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <IconCheck className="h-3.5 w-3.5 text-emerald-600" />
                            {isCurrentRowSelected ? `Đang ở Dòng #${selectedIndex + 1}` : `Đã ở Dòng #${selectedIndex + 1}`}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleRowSelect(row)}
                            className="h-8 px-3.5 text-xs bg-[#0F3D62] text-white hover:bg-[#0c314f] font-semibold rounded-lg shadow-sm transition-transform active:scale-95"
                          >
                            Chọn đơn này <IconArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Bar (Frame lm_pagination in Pen) ── */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Hiển thị <strong className="text-slate-800 dark:text-slate-200">{startRecord} - {endRecord}</strong> trên{' '}
              <strong className="text-slate-800 dark:text-slate-200">{meta.total}</strong> đơn hàng trong kho
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(1)}
              className="h-8 w-8 p-0 rounded-md border-slate-200 dark:border-slate-700"
              title="Trang đầu"
            >
              <IconChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0 rounded-md border-slate-200 dark:border-slate-700"
              title="Trang trước"
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page number buttons */}
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;

                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                    <Button
                      variant={page === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(p)}
                      className={`h-8 w-8 p-0 rounded-md font-semibold text-xs ${
                        page === p
                          ? 'bg-[#0F3D62] text-white hover:bg-[#0c314f]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {p}
                    </Button>
                  </React.Fragment>
                );
              })}

            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              className="h-8 w-8 p-0 rounded-md border-slate-200 dark:border-slate-700"
              title="Trang sau"
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages || isLoading}
              onClick={() => setPage(meta.totalPages)}
              className="h-8 w-8 p-0 rounded-md border-slate-200 dark:border-slate-700"
              title="Trang cuối"
            >
              <IconChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Footer Bar (Frame lm_footer in Pen) ── */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>💡 Nhấn <strong>&apos;Chọn đơn này&apos;</strong> để tự động điền thông tin hàng hóa vào dòng xuất kho đang chọn.</span>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <IconX className="mr-1.5 h-4 w-4" /> Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
