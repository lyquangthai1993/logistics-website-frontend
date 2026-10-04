'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  IconBuildingWarehouse
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import { availableOutboundStock } from '@/features/warehouse/lib/outbound-stock';

export interface WarehouseLookupItem {
  id: number;
  orderCode: string;
  goodsDescription?: string | null;
  totalQuantity: number;
  remainingQuantity?: number;
  /** Ledger stock at the viewer's hub (null when the viewer is not hub-scoped). */
  hubStock?: number | null;
  inboundQuantity?: number;
  outboundQuantity?: number;
  totalWeight: number;
  totalVolume: number;
  pickupAddress: string;
  deliveryAddress: string;
  deliveryMode: 'DIRECT_CUSTOMER' | 'HUB_L1' | 'XE_BO';
  status: string;
  hubStatus?: string | null;
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
  /**
   * Order id held by each grid row, by row position (null/undefined for empty rows).
   * Matching is by id: rows sharing an order code are distinct cargo lines.
   */
  selectedItemIds?: Array<number | string | null | undefined>;
  targetRowIndex?: number | null;
  isOutboundMode?: boolean;
}

const STORED_STATUSES = ['INBOUND', 'STORED', 'LUU_KHO', 'IN_WAREHOUSE'];

export function WarehouseLookupModal({
  isOpen,
  onClose,
  onSelectOrder,
  onSelect,
  selectedItemIds = [],
  targetRowIndex,
  isOutboundMode = false
}: WarehouseLookupModalProps) {
  const user = useAuthStore((state) => state.user);
  const currentHubName = user?.hub?.name;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<WarehouseLookupItem[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    totalPages: 1,
    allCount: 0,
    storedCount: 0,
    draftCount: 0
  });

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const token = tokenManager.getAccessToken();
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      // Outbound notes may only pick goods stored at this hub (or local drafts) —
      // never goods still on the way in or already dispatched.
      ...(isOutboundMode ? { flow: 'OUTBOUND_LOOKUP' } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {})
    });

    fetch(`/api/v1/warehouse/orders?${queryParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((resData) => {
        if (!isMounted) return;
        const items: WarehouseLookupItem[] = resData?.data ?? [];
        const total = resData?.meta?.total ?? items.length;
        const totalPages = resData?.meta?.totalPages || Math.ceil(total / limit) || 1;
        const allCount = resData?.meta?.allCount ?? total;
        const storedCount =
          resData?.meta?.storedCount ??
          items.filter((i) => STORED_STATUSES.includes(String(i.hubStatus ?? i.status))).length;
        const draftCount =
          resData?.meta?.draftCount ??
          items.filter((i) => (i.hubStatus ?? i.status) === 'DRAFT').length;

        setData(items);
        setMeta({ total, totalPages, allCount, storedCount, draftCount });
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
  }, [isOpen, search, statusFilter, page, limit, isOutboundMode]);

  const handleRowSelect = (order: WarehouseLookupItem) => {
    if (onSelectOrder) onSelectOrder(order);
    else if (onSelect) onSelect(order);
    onClose();
  };

  const startRecord = meta.total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, meta.total);

  // Order ids already on the note (also drives the soft "same code" hint)
  const selectedIdSet = new Set(
    selectedItemIds.filter((v) => v !== null && v !== undefined && v !== '').map(String)
  );

  const filterPill = (key: string, label: string, activeCls: string, idleCls: string, dotCls?: string) => (
    <button
      type="button"
      onClick={() => {
        setStatusFilter(key);
        setPage(1);
      }}
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all ${
        statusFilter === key ? activeCls : idleCls
      }`}
    >
      {dotCls && <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotCls}`} />}
      {label}
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[95vw] gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl !max-w-[1080px] sm:w-[1080px] sm:!max-w-[1080px] dark:border-slate-800 dark:bg-slate-900"
      >
        {/* ── Navy Header ── */}
        <div className="flex items-center justify-between border-b border-[#0c314f] bg-[#0F3D62] px-2 py-1.5 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/10">
              <IconBuildingWarehouse className="h-4 w-4 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold tracking-tight text-white">Tra cứu &amp; chọn hàng trong kho</h2>
                {targetRowIndex !== null && targetRowIndex !== undefined && (
                  <span className="rounded-full border border-blue-400/30 bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-200">
                    Gán vào dòng #{targetRowIndex + 1}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-medium text-blue-200/90">
                Kho xuất: <span className="font-semibold text-white">{currentHubName || 'Tất cả trung tâm'}</span> ·{' '}
                <span className="font-semibold text-blue-100">{meta.storedCount ?? 0}</span> đơn hàng đang lưu kho
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            title="Đóng"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {/* ── Search & Filter Toolbar ── */}
        <div className="space-y-1.5 border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="relative">
            <IconSearch className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-blue-600" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã đơn, tên hàng hóa, biển số..."
              className="h-8 rounded-md border-slate-300 bg-white pr-8 pl-8 text-xs shadow-sm focus-visible:ring-2 focus-visible:ring-[#0F3D62] dark:border-slate-700 dark:bg-slate-800"
              autoFocus
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute top-1/2 right-2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                title="Xóa từ khóa"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Trạng thái:
              </span>
              {filterPill(
                'ALL',
                `Tất cả (${meta.allCount ?? 0})`,
                'bg-[#0F3D62] text-white shadow-sm',
                'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              )}
              {filterPill(
                'INBOUND',
                `Lưu kho (${meta.storedCount ?? 0})`,
                'bg-amber-600 text-white shadow-sm',
                'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
                'bg-amber-500'
              )}
              {filterPill(
                'DRAFT',
                `Đơn nháp (${meta.draftCount ?? 0})`,
                'bg-slate-700 text-white shadow-sm',
                'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                'bg-slate-400'
              )}
            </div>
            <div className="text-[10px] font-medium text-slate-500">
              Tìm thấy <strong className="text-slate-800 dark:text-slate-200">{meta.total}</strong> đơn hàng phù hợp
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="max-h-[60vh] overflow-x-auto overflow-y-auto">
          <table className="w-full border-collapse text-left text-[10px]">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 font-bold text-slate-700 uppercase dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="w-[150px] px-1.5 py-1">Mã đơn hàng</th>
                <th className="min-w-[220px] px-1.5 py-1">Tên hàng hóa</th>
                <th className="w-[100px] px-1.5 py-1 text-right" title="Số kiện đang nằm tại kho này, có thể xuất">
                  Tồn khả dụng
                </th>
                <th className="w-[90px] px-1.5 py-1 text-right">Số kg</th>
                <th className="w-[80px] px-1.5 py-1 text-right">Số m³</th>
                <th className="w-[100px] px-1.5 py-1 text-center">Trạng thái</th>
                <th className="w-[140px] px-1.5 py-1 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <IconLoader2 className="mx-auto mb-1.5 h-5 w-5 animate-spin text-[#0F3D62]" />
                    <span className="text-xs font-medium">Đang tải danh sách hàng hóa trong kho...</span>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <IconPackage className="mx-auto mb-1 h-7 w-7 stroke-[1.5] text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Không tìm thấy lô hàng nào phù hợp
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {search
                        ? `Không có kết quả cho từ khóa "${search}"`
                        : 'Kho hiện chưa có hàng hóa ở trạng thái này'}
                    </p>
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  // Match by order id (not order code): two lines may share one order code.
                  const selectedIndex = selectedItemIds.findIndex(
                    (id) => id !== null && id !== undefined && String(id) === String(row.id)
                  );
                  const isAlreadySelected = selectedIndex !== -1;
                  const isCurrentRowSelected =
                    targetRowIndex !== null && targetRowIndex !== undefined && selectedIndex === targetRowIndex;
                  const displayStatus = row.hubStatus ?? row.status;
                  const isStored = STORED_STATUSES.includes(String(displayStatus));
                  const isDraft = displayStatus === 'DRAFT';
                  const stock = availableOutboundStock(row);
                  const isOutOfStock = isOutboundMode && stock <= 0;
                  const sameCodeOnNote =
                    !isAlreadySelected &&
                    selectedIdSet.size > 0 &&
                    data.some((other) => other.id !== row.id && other.orderCode === row.orderCode && selectedIdSet.has(String(other.id)));

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors hover:bg-blue-50/60 dark:hover:bg-slate-800/60 ${
                        isCurrentRowSelected ? 'bg-blue-50/80 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      <td className="px-1.5 py-1 font-mono text-[11px] font-bold whitespace-nowrap text-[#0F3D62] dark:text-blue-400">
                        {row.orderCode}
                        {sameCodeOnNote && (
                          <div className="font-sans text-[9px] font-medium text-slate-400">Cùng mã với dòng đã chọn</div>
                        )}
                      </td>
                      <td className="px-1.5 py-1 text-slate-800 dark:text-slate-200">
                        <div className="font-semibold">{row.goodsDescription || '—'}</div>
                        {row.route && (
                          <div className="max-w-[260px] truncate text-[9px] text-slate-400">{row.route}</div>
                        )}
                      </td>
                      <td
                        className={`px-1.5 py-1 text-right font-semibold whitespace-nowrap ${
                          isOutOfStock ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {stock.toLocaleString('vi-VN')}
                        <span className="font-normal text-slate-400">
                          {' '}
                          / {(Number(row.totalQuantity) || 0).toLocaleString('vi-VN')} kiện
                        </span>
                      </td>
                      <td className="px-1.5 py-1 text-right font-semibold whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {(Number(row.totalWeight) || 0).toLocaleString('vi-VN')} kg
                      </td>
                      <td className="px-1.5 py-1 text-right font-semibold whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {(Number(row.totalVolume) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} m³
                      </td>
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                            isStored
                              ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {isStored ? 'Lưu kho' : isDraft ? 'Đơn nháp' : displayStatus}
                        </Badge>
                      </td>
                      <td className="px-1.5 py-1 text-center whitespace-nowrap">
                        {isAlreadySelected ? (
                          <span className="inline-flex items-center justify-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                            <IconCheck className="h-3 w-3 text-emerald-600" />
                            {isCurrentRowSelected ? `Đang ở dòng #${selectedIndex + 1}` : `Đã ở dòng #${selectedIndex + 1}`}
                          </span>
                        ) : isOutOfStock ? (
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:border-red-900 dark:bg-red-950/30">
                            Hết tồn khả dụng
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleRowSelect(row)}
                            className="h-7 rounded-md bg-[#0F3D62] px-2 text-[10px] font-semibold text-white shadow-sm transition-transform hover:bg-[#0c314f] active:scale-95"
                          >
                            Chọn đơn này <IconArrowRight className="ml-1 h-3 w-3" />
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

        {/* ── Pagination + Footer ── */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/90">
          <span>
            Hiển thị{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {startRecord} - {endRecord}
            </strong>{' '}
            trên <strong className="text-slate-800 dark:text-slate-200">{meta.total}</strong> đơn hàng trong kho
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(1)}
              className="h-7 w-7 rounded-md border-slate-200 p-0 dark:border-slate-700"
              title="Trang đầu"
            >
              <IconChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 rounded-md border-slate-200 p-0 dark:border-slate-700"
              title="Trang trước"
            >
              <IconChevronLeft className="h-3.5 w-3.5" />
            </Button>

            {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;

                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-1 font-bold text-slate-400">...</span>}
                    <Button
                      variant={page === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(p)}
                      className={`h-7 w-7 rounded-md p-0 text-[10px] font-semibold ${
                        page === p
                          ? 'bg-[#0F3D62] text-white hover:bg-[#0c314f]'
                          : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
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
              className="h-7 w-7 rounded-md border-slate-200 p-0 dark:border-slate-700"
              title="Trang sau"
            >
              <IconChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages || isLoading}
              onClick={() => setPage(meta.totalPages)}
              className="h-7 w-7 rounded-md border-slate-200 p-0 dark:border-slate-700"
              title="Trang cuối"
            >
              <IconChevronsRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="ml-1.5 h-7 border-slate-300 px-2 text-[10px] font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
