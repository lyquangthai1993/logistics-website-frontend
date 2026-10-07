'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  IconSearch,
  IconLoader2,
  IconTruckLoading,
  IconBuildingWarehouse,
  IconX,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { showApiErrorToast } from '@/lib/api-error';
import { useAuthStore } from '@/stores/use-auth-store';
import {
  useAvailableOutboundOrdersQuery,
  appendStoredOrdersToTrip,
} from '../api/trip-manifest';

interface WarehouseSelectStoredOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripCode: string;
  licensePlate: string;
  hubId?: number | string | null;
  downstreamHubs?: Array<{ id: number; name: string }>;
  onSuccess?: () => void;
}

export function WarehouseSelectStoredOrdersModal({
  isOpen,
  onClose,
  tripCode,
  licensePlate,
  hubId: propHubId,
  downstreamHubs: initialDownstreamHubs,
  onSuccess,
}: WarehouseSelectStoredOrdersModalProps) {
  const user = useAuthStore((state) => state.user);
  const effectiveHubId =
    (propHubId
      ? Number(propHubId)
      : user?.hubId
        ? Number(user.hubId)
        : user?.hub?.id
          ? Number(user.hub.id)
          : null) ?? 2;

  const { data: availableData, isLoading } = useAvailableOutboundOrdersQuery(
    tripCode,
    effectiveHubId,
    isOpen
  );

  const currentHubName =
    availableData?.currentHubName || user?.hub?.name || 'Kho hiện tại';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestHubId, setSelectedDestHubId] = useState<string>('ALL');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combine downstream hubs from query and props
  const downstreamHubs = useMemo(() => {
    if (availableData?.downstreamHubs && availableData.downstreamHubs.length > 0) {
      return availableData.downstreamHubs;
    }
    return initialDownstreamHubs || [];
  }, [availableData?.downstreamHubs, initialDownstreamHubs]);

  // Raw orders available in warehouse
  const rawOrders = useMemo(() => {
    return Array.isArray(availableData?.orders) ? availableData.orders : [];
  }, [availableData?.orders]);

  // Filtered orders by search & destination hub
  const filteredOrders = useMemo(() => {
    let list = rawOrders;

    if (selectedDestHubId !== 'ALL') {
      const hubIdNum = Number(selectedDestHubId);
      list = list.filter((o) => Number(o.destinationHubId) === hubIdNum);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((o) => {
        const code = (o.orderCode || '').toLowerCase();
        const goods = (o.goodsDescription || '').toLowerCase();
        const dest = (o.destinationHub || o.destinationHubEntity?.name || '').toLowerCase();
        const route = (o.route || '').toLowerCase();
        return code.includes(q) || goods.includes(q) || dest.includes(q) || route.includes(q);
      });
    }

    return list;
  }, [rawOrders, selectedDestHubId, searchQuery]);

  // Selection helpers
  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedOrderIds.includes(o.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredOrders.map((o) => o.id));
      setSelectedOrderIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const set = new Set(selectedOrderIds);
      filteredOrders.forEach((o) => set.add(o.id));
      setSelectedOrderIds(Array.from(set));
    }
  };

  const handleSelectAllFiltered = () => {
    const set = new Set(selectedOrderIds);
    filteredOrders.forEach((o) => set.add(o.id));
    setSelectedOrderIds(Array.from(set));
  };

  const handleClearSelection = () => {
    setSelectedOrderIds([]);
  };

  const handleToggleOrder = (orderId: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Metrics for selected orders
  const selectedSummary = useMemo(() => {
    const selected = rawOrders.filter((o) => selectedOrderIds.includes(o.id));
    const pkgs = selected.reduce((sum, o) => {
      const q = Number(o.remainingQuantity) > 0 ? Number(o.remainingQuantity) : Number(o.totalQuantity) || 1;
      return sum + q;
    }, 0);
    const weight = selected.reduce((sum, o) => sum + (Number(o.totalWeight) || 0), 0);
    const volume = selected.reduce((sum, o) => sum + (Number(o.totalVolume) || 0), 0);

    return {
      count: selected.length,
      packages: pkgs,
      weight: Math.round(weight * 10) / 10,
      volume: Math.round(volume * 100) / 100,
    };
  }, [rawOrders, selectedOrderIds]);

  const handleSubmit = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 đơn hàng lưu kho để xuất lên xe');
      return;
    }

    setIsSubmitting(true);
    try {
      await appendStoredOrdersToTrip(tripCode, {
        orderIds: selectedOrderIds,
        hubId: effectiveHubId ? Number(effectiveHubId) : undefined,
        destinationHubId: selectedDestHubId !== 'ALL' ? Number(selectedDestHubId) : undefined,
      });

      toast.success(
        `Đã xuất thành công ${selectedSummary.count} đơn hàng (${selectedSummary.packages} kiện) từ kho ${currentHubName} lên chuyến xe ${tripCode}!`
      );
      setSelectedOrderIds([]);
      onSuccess?.();
      onClose();
    } catch (err) {
      showApiErrorToast(err, 'Không thể bốc đơn hàng lên chuyến xe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-6xl xl:max-w-7xl max-w-[96vw] w-[95vw] max-h-[90vh] flex flex-col p-2 gap-2 overflow-hidden'>
        <DialogHeader className='p-1 border-b border-slate-100 dark:border-slate-800 pb-1.5'>
          <DialogTitle className='text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5'>
            <IconBuildingWarehouse className='h-4 w-4 text-blue-600' />
            <span>Chọn đơn lưu kho bốc lên chuyến xe {tripCode}</span>
          </DialogTitle>
          <p className='text-[10px] text-slate-500'>
            Xe: <span className='font-bold text-slate-700 dark:text-slate-300'>{licensePlate}</span> • Chuyến: <span className='font-mono font-bold text-blue-600'>{tripCode}</span> • Kho xuất: <span className='font-bold text-slate-700 dark:text-slate-300'>{currentHubName}</span>
          </p>
        </DialogHeader>

        {/* Toolbar: Live Search, Destination Filter & Quick Actions */}
        <div className='flex flex-wrap items-center justify-between gap-1.5 px-0.5'>
          <div className='flex flex-wrap items-center gap-1.5 flex-1 min-w-[200px]'>
            <div className='relative w-72 md:w-80'>
              <IconSearch className='absolute left-2 top-2 h-3.5 w-3.5 text-slate-400' />
              <Input
                placeholder='Tìm mã vận đơn, tên hàng, nơi giao...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-7 pl-7 pr-7 text-[10px] bg-slate-50 dark:bg-slate-800'
              />
              {searchQuery.trim().length > 0 && (
                <button
                  type='button'
                  onClick={() => setSearchQuery('')}
                  className='absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  title='Xóa từ khóa'
                >
                  <IconX className='h-3.5 w-3.5' />
                </button>
              )}
            </div>

            {downstreamHubs.length > 0 && (
              <select
                value={selectedDestHubId}
                onChange={(e) => setSelectedDestHubId(e.target.value)}
                className='h-7 text-[10px] px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden'
              >
                <option value='ALL'>Tất cả trạm dỡ ({rawOrders.length})</option>
                {downstreamHubs.map((h) => {
                  const matchCount = rawOrders.filter((o) => Number(o.destinationHubId) === h.id).length;
                  return (
                    <option key={h.id} value={h.id}>
                      {h.name} ({matchCount} đơn)
                    </option>
                  );
                })}
              </select>
            )}

            {filteredOrders.length > 0 && (
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleSelectAllFiltered}
                  className='h-7 text-[10px] px-2'
                >
                  Chọn tất cả ({filteredOrders.length})
                </Button>
                {selectedOrderIds.length > 0 && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={handleClearSelection}
                    className='h-7 text-[10px] px-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  >
                    Bỏ chọn
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className='text-[10px] text-slate-500 font-medium'>
            Đang hiển thị {filteredOrders.length} / {rawOrders.length} đơn lưu kho
          </div>
        </div>

        {/* Table: Compact Density Viewport (Max Height 62vh, 10 Standard Columns) */}
        <div className='flex-1 border border-slate-200 dark:border-slate-700 rounded-lg overflow-y-auto max-h-[62vh] min-h-[360px]'>
          <table className='w-full text-[10px] text-left border-collapse'>
            <thead className='bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 uppercase'>
              <tr>
                <th className='py-1 px-1.5 w-9 text-center'>
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={handleToggleSelectAll}
                    disabled={filteredOrders.length === 0}
                    className='h-3.5 w-3.5'
                  />
                </th>
                <th className='py-1 px-1.5 w-10 text-center font-bold text-slate-500'>STT</th>
                <th className='py-1 px-1.5 w-[140px] whitespace-nowrap'>MÃ VẬN ĐƠN</th>
                <th className='py-1 px-1.5 min-w-[180px] max-w-[260px]'>TÊN HÀNG HÓA</th>
                <th className='py-1 px-1.5 text-right w-[80px] whitespace-nowrap'>SỐ KIỆN</th>
                <th className='py-1 px-1.5 text-right w-[85px] whitespace-nowrap'>SỐ KG</th>
                <th className='py-1 px-1.5 text-right w-[80px] whitespace-nowrap'>SỐ M³</th>
                <th className='py-1 px-1.5 min-w-[200px] whitespace-nowrap'>KHO ĐÍCH / NƠI GIAO</th>
                <th className='py-1 px-1.5 w-[100px] text-center whitespace-nowrap'>NGÀY NHẬP</th>
                <th className='py-1 px-1.5 min-w-[150px]'>GHI CHÚ</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900'>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className='py-12 text-center text-slate-400'>
                    <IconLoader2 className='h-5 w-5 animate-spin mx-auto mb-1 text-blue-600' />
                    Đang tải danh sách đơn hàng lưu kho khả dụng...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className='py-12 text-center text-slate-400'>
                    {rawOrders.length === 0
                      ? `Hiện không có đơn hàng nào đang lưu tại kho ${currentHubName} sẵn sàng xuất đi các trạm kế tiếp của chuyến xe này.`
                      : 'Không tìm thấy đơn hàng lưu kho nào phù hợp với bộ lọc.'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o, idx) => {
                  const isChecked = selectedOrderIds.includes(o.id);
                  const pkgQty =
                    Number(o.remainingQuantity) > 0
                      ? Number(o.remainingQuantity)
                      : Number(o.totalQuantity) || 1;
                  const destName =
                    o.destinationHub ||
                    o.destinationHubEntity?.name ||
                    (o.route && o.route.includes('→') ? o.route.split('→')[1]?.trim() : '') ||
                    '—';
                  const dateStr = o.createdAt
                    ? new Date(o.createdAt).toLocaleDateString('vi-VN')
                    : '—';

                  return (
                    <tr
                      key={o.id}
                      onClick={() => handleToggleOrder(o.id)}
                      className={`cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td
                        className='py-1 px-1.5 text-center'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleOrder(o.id)}
                          className='h-3.5 w-3.5'
                        />
                      </td>
                      <td className='py-1 px-1.5 text-center font-bold text-slate-500'>
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className='py-1 px-1.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap'>
                        {o.orderCode}
                      </td>
                      <td className='py-1 px-1.5 font-medium text-slate-800 dark:text-slate-200 min-w-[180px] max-w-[260px] truncate'>
                        {o.goodsDescription || 'Hàng lưu kho'}
                      </td>
                      <td className='py-1 px-1.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap'>
                        {pkgQty.toLocaleString('vi-VN')}
                      </td>
                      <td className='py-1 px-1.5 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap'>
                        {Number(o.totalWeight || 0).toLocaleString('vi-VN', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className='py-1 px-1.5 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap'>
                        {Number(o.totalVolume || 0).toLocaleString('vi-VN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className='py-1 px-1.5 font-semibold text-slate-700 dark:text-slate-300 min-w-[200px] whitespace-nowrap'>
                        {destName}
                      </td>
                      <td className='py-1 px-1.5 text-center text-slate-500 whitespace-nowrap'>
                        {dateStr}
                      </td>
                      <td className='py-1 px-1.5 text-slate-500 text-[10px] truncate min-w-[150px]'>
                        {o.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sticky Summary & Actions Footer */}
        <DialogFooter className='sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0'>
          <div className='text-[11px] text-slate-700 dark:text-slate-300'>
            Đã chọn:{' '}
            <span className='font-bold text-blue-600 dark:text-blue-400'>
              {selectedSummary.count} đơn hàng
            </span>
            {selectedSummary.count > 0 && (
              <span className='text-slate-500'>
                {' '}(Tổng cộng: <strong className='text-slate-800 dark:text-slate-200'>{selectedSummary.packages} kiện</strong> • {selectedSummary.weight} kg • {selectedSummary.volume} m³)
              </span>
            )}
          </div>

          <div className='flex items-center gap-1.5'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onClose}
              disabled={isSubmitting}
              className='h-7.5 text-xs px-2.5'
            >
              Hủy
            </Button>
            <Button
              type='button'
              size='sm'
              onClick={handleSubmit}
              disabled={selectedOrderIds.length === 0 || isSubmitting}
              className='h-7.5 bg-[#0F3D62] hover:bg-[#0c314f] text-white px-2.5 font-bold shadow-xs text-xs'
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
                  Đang bốc đơn lên xe...
                </>
              ) : (
                <>
                  <IconTruckLoading className='mr-1 h-3.5 w-3.5 text-blue-300' />
                  Xác nhận xuất {selectedSummary.count > 0 ? `${selectedSummary.count} ` : ''}đơn lên xe
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
