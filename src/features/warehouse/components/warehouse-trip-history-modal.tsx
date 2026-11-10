'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconHistory,
  IconTruck,
  IconBuildingWarehouse,
  IconUser,
  IconClock,
  IconArrowRight,
  IconRefresh,
  IconX,
  IconLoader2,
  IconPackage,
  IconCircleCheck,
  IconArrowsSort
} from '@tabler/icons-react';
import { tokenManager } from '@/lib/token-manager';
import { showApiErrorToast } from '@/lib/api-error';
import { formatWeight, formatVolume } from '@/lib/format';

export interface TripHistoryChangeItem {
  label: string;
  oldValue?: string | null;
  newValue: string;
}

export interface TripHistoryTimelineItem {
  id: string;
  stepNumber?: number;
  action: string;
  actionLabel: string;
  badgeColor: 'slate' | 'blue' | 'amber' | 'emerald' | 'purple' | 'rose';
  createdAt: string;
  actorName: string;
  actorEmail: string;
  hubName: string;
  summary: string;
  note?: string | null;
  changes: TripHistoryChangeItem[];
}

export interface TripHistoryBlockerItem {
  orderId: number;
  orderCode: string;
  goodsDescription: string;
  quantityAllocated: number;
  orderStatus: string;
  pendingInboundTripCode: string | null;
  pendingInboundPlate: string | null;
  reason: string;
}

export interface TripHistoryOrderItem {
  orderId: number;
  orderCode: string;
  goodsDescription: string;
  quantityAllocated: number;
  weightAllocated: number;
  volumeAllocated: number;
  orderStatus: string;
  inboundTripCode: string | null;
  inboundLicensePlate: string | null;
  inboundConfirmedAt: string | null;
  isBlocker: boolean;
}

export interface TripHistoryData {
  tripCode: string;
  summary: {
    tripCode: string;
    tripType: 'INBOUND' | 'OUTBOUND' | 'TRANSFER';
    tripTypeLabel: string;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    statusLabel: string;
    licensePlate: string;
    driverName: string | null;
    pickupDate: string | null;
    hubId: number | null;
    hubName: string;
    totalOrders: number;
    totalQuantity: number;
    totalWeight: number;
    totalVolume: number;
    createdAt: string;
    updatedAt: string;
    creator: { id: number; name: string; email: string } | null;
    operator: { id: number; name: string; email: string } | null;
  };
  blockers: TripHistoryBlockerItem[];
  orders: TripHistoryOrderItem[];
  timeline: TripHistoryTimelineItem[];
}

interface WarehouseTripHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripCode: string | null;
}

function formatDateTimeVN(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} - ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function getBadgeColorClasses(color: TripHistoryTimelineItem['badgeColor']) {
  switch (color) {
    case 'emerald':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300';
    case 'amber':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300';
    case 'blue':
      return 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300';
    case 'purple':
      return 'bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300';
    case 'rose':
      return 'bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300';
    default:
      return 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300';
  }
}

function getDotColorClasses(color: TripHistoryTimelineItem['badgeColor']) {
  switch (color) {
    case 'emerald':
      return 'bg-emerald-600 text-white';
    case 'amber':
      return 'bg-amber-500 text-white';
    case 'blue':
      return 'bg-blue-600 text-white';
    case 'purple':
      return 'bg-purple-600 text-white';
    case 'rose':
      return 'bg-rose-600 text-white';
    default:
      return 'bg-slate-600 text-white';
  }
}

export function WarehouseTripHistoryModal({
  isOpen,
  onClose,
  tripCode
}: WarehouseTripHistoryModalProps) {
  const [data, setData] = useState<TripHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!tripCode) return;
    setIsLoading(true);
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/warehouse/trips/${encodeURIComponent(tripCode)}/history`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }
      const resJson = await res.json();
      const payload = resJson?.data ?? resJson;
      setData(payload);
    } catch (err) {
      showApiErrorToast(err, `Không thể tải lịch sử chuyến xe ${tripCode}`);
    } finally {
      setIsLoading(false);
    }
  }, [tripCode]);

  useEffect(() => {
    if (isOpen && tripCode) {
      fetchHistory();
    } else if (!isOpen) {
      setData(null);
    }
  }, [isOpen, tripCode, fetchHistory]);

  const orderedTimeline = React.useMemo(() => {
    if (!data?.timeline) return [];
    const list = [...data.timeline];
    list.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortAsc ? diff : -diff;
    });
    return list;
  }, [data?.timeline, sortAsc]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid='trip-history-modal'
        showCloseButton={false}
        className='w-[94vw] sm:max-w-4xl p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-[88vh] flex flex-col'
      >
        {/* Sticky Top Header */}
        <div className='bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0'>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <IconHistory className='h-4 w-4 text-[#0F3D62] dark:text-blue-400 shrink-0' />
            <DialogTitle className='text-xs sm:text-sm font-black text-slate-900 dark:text-white'>
              Lịch sử tạo & chỉnh sửa chuyến xe
            </DialogTitle>
            {tripCode && (
              <span className='text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800'>
                {tripCode}
              </span>
            )}
            {data?.summary && (
              <>
                <Badge
                  variant='outline'
                  className='text-[10px] font-semibold px-1.5 py-0 h-5 bg-slate-50 dark:bg-slate-800'
                >
                  {data.summary.tripTypeLabel}
                </Badge>
                <Badge
                  className={`text-[10px] font-bold px-2 py-0 h-5 border-0 ${
                    data.summary.status === 'COMPLETED'
                      ? 'bg-emerald-600 text-white'
                      : data.summary.status === 'CANCELLED'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-400 text-amber-950'
                  }`}
                >
                  {data.summary.statusLabel}
                </Badge>
              </>
            )}
          </div>

          <div className='flex items-center gap-1.5'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setSortAsc((prev) => !prev)}
              className='h-7 px-2 text-[11px] font-semibold border-slate-300'
              title='Đảo thứ tự thời gian'
            >
              <IconArrowsSort className='h-3.5 w-3.5 mr-1 text-slate-600' />
              {sortAsc ? 'Cũ → Mới (Lần 1..N)' : 'Mới nhất trước'}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={fetchHistory}
              disabled={isLoading}
              className='h-7 px-2 text-[11px] font-semibold border-slate-300'
              title='Làm mới lịch sử'
            >
              <IconRefresh
                className={`h-3.5 w-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`}
              />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={onClose}
              className='h-7 w-7 p-0 text-slate-400 hover:text-slate-600'
            >
              <IconX className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Scrollable Body (Compact Density p-2, space-y-2) */}
        <div className='p-2 overflow-y-auto max-h-[80vh] space-y-2 flex-1'>
          {isLoading && !data ? (
            <div className='p-3 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-lg border'>
              <IconLoader2 className='h-6 w-6 animate-spin mx-auto mb-1.5 text-blue-600' />
              <p className='text-xs font-medium'>Đang tra soát lịch sử chuyến xe {tripCode}...</p>
            </div>
          ) : !data ? (
            <div className='p-3 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-lg border text-xs'>
              Không tìm thấy dữ liệu lịch sử của chuyến xe {tripCode}.
            </div>
          ) : (
            <>
              {/* 1. Summary Card */}
              <div className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs'>
                <div className='bg-slate-50 dark:bg-slate-800/60 rounded p-1.5 border border-slate-100 dark:border-slate-800'>
                  <div className='text-[10px] text-slate-500 font-semibold flex items-center gap-1'>
                    <IconTruck className='h-3 w-3 text-blue-600' />
                    <span>Phương tiện & Tài xế hiện tại</span>
                  </div>
                  <div className='font-mono font-bold text-slate-900 dark:text-white mt-0.5 text-xs'>
                    {data.summary.licensePlate || 'CHƯA CÓ TT'}
                  </div>
                  <div className='text-[10px] text-slate-600 dark:text-slate-400 truncate'>
                    Tài xế: {data.summary.driverName || 'Chưa gán'}
                  </div>
                </div>

                <div className='bg-slate-50 dark:bg-slate-800/60 rounded p-1.5 border border-slate-100 dark:border-slate-800'>
                  <div className='text-[10px] text-slate-500 font-semibold flex items-center gap-1'>
                    <IconBuildingWarehouse className='h-3 w-3 text-indigo-600' />
                    <span>Kho vận hành</span>
                  </div>
                  <div className='font-bold text-slate-900 dark:text-white mt-0.5 text-xs truncate'>
                    {data.summary.hubName}
                  </div>
                  <div className='text-[10px] text-slate-600 dark:text-slate-400'>
                    Ngày chuyến: {data.summary.pickupDate || '—'}
                  </div>
                </div>

                <div className='bg-slate-50 dark:bg-slate-800/60 rounded p-1.5 border border-slate-100 dark:border-slate-800'>
                  <div className='text-[10px] text-slate-500 font-semibold flex items-center gap-1'>
                    <IconUser className='h-3 w-3 text-emerald-600' />
                    <span>Người khởi tạo chuyến</span>
                  </div>
                  <div className='font-bold text-slate-900 dark:text-white mt-0.5 text-xs truncate'>
                    {data.summary.creator?.name || 'Hệ thống'}
                  </div>
                  <div className='text-[10px] text-slate-500 font-mono truncate'>
                    {data.summary.creator?.email || '—'}
                  </div>
                </div>

                <div className='bg-slate-50 dark:bg-slate-800/60 rounded p-1.5 border border-slate-100 dark:border-slate-800'>
                  <div className='text-[10px] text-slate-500 font-semibold flex items-center gap-1'>
                    <IconPackage className='h-3 w-3 text-amber-600' />
                    <span>Tổng sản lượng trên chuyến</span>
                  </div>
                  <div className='font-bold text-[#0F3D62] dark:text-blue-400 mt-0.5 text-xs'>
                    {data.summary.totalOrders} đơn · {data.summary.totalQuantity} kiện
                  </div>
                  <div className='text-[10px] text-slate-600 dark:text-slate-400 font-mono'>
                    {formatWeight(data.summary.totalWeight)} kg ·{' '}
                    {formatVolume(data.summary.totalVolume)} m³
                  </div>
                </div>
              </div>

              {/* 2. Timeline of Creation & Edits */}
              <div className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-2'>
                <div className='flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5'>
                  <div className='flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100 uppercase'>
                    <IconClock className='h-4 w-4 text-[#0F3D62] dark:text-blue-400' />
                    <span>Chi tiết lịch sử thao tác ({orderedTimeline.length} mốc)</span>
                  </div>
                  <span className='text-[10px] text-slate-500'>Giờ Việt Nam (UTC+7)</span>
                </div>

                {orderedTimeline.length === 0 ? (
                  <div className='p-2 text-center text-xs text-slate-400'>
                    Chưa có bản ghi lịch sử thao tác.
                  </div>
                ) : (
                  <div className='relative pl-2 space-y-2'>
                    {orderedTimeline.map((item, idx) => (
                      <div key={item.id || idx} className='relative flex items-start gap-2'>
                        {/* Timeline Step Dot */}
                        <div className='flex flex-col items-center shrink-0 mt-0.5'>
                          <div
                            className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shadow-2xs ${getDotColorClasses(
                              item.badgeColor
                            )}`}
                          >
                            {item.stepNumber ?? idx + 1}
                          </div>
                        </div>

                        {/* Timeline Event Card */}
                        <div className='flex-1 min-w-0 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-lg p-2 space-y-1 text-xs'>
                          <div className='flex flex-wrap items-center justify-between gap-1.5'>
                            <div className='flex items-center gap-1.5 flex-wrap'>
                              <Badge
                                variant='outline'
                                className={`text-[10px] font-bold px-1.5 py-0 h-5 ${getBadgeColorClasses(
                                  item.badgeColor
                                )}`}
                              >
                                Lần {item.stepNumber ?? idx + 1}: {item.actionLabel}
                              </Badge>
                              <span className='font-bold text-slate-800 dark:text-slate-100 text-xs'>
                                {item.actorName}
                              </span>
                              {item.actorEmail && (
                                <span className='text-[10px] font-mono text-slate-500'>
                                  ({item.actorEmail})
                                </span>
                              )}
                              <span className='text-[10px] text-slate-400'>• {item.hubName}</span>
                            </div>

                            <span className='font-mono font-semibold text-[11px] text-[#0F3D62] dark:text-blue-300 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700'>
                              {formatDateTimeVN(item.createdAt)}
                            </span>
                          </div>

                          <div className='text-slate-700 dark:text-slate-200 font-medium text-[11px]'>
                            {item.summary}
                          </div>

                          {item.changes && item.changes.length > 0 && (
                            <div className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 space-y-1'>
                              {item.changes.map((chg, cIdx) => (
                                <div
                                  key={cIdx}
                                  className='flex flex-wrap items-center gap-1.5 text-[11px]'
                                >
                                  <span className='font-semibold text-slate-600 dark:text-slate-400'>
                                    • {chg.label}:
                                  </span>
                                  {chg.oldValue ? (
                                    <>
                                      <span className='font-mono line-through text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1 rounded'>
                                        {chg.oldValue}
                                      </span>
                                      <IconArrowRight className='h-3 w-3 text-slate-400 shrink-0' />
                                      <span className='font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded'>
                                        {chg.newValue}
                                      </span>
                                    </>
                                  ) : (
                                    <span className='font-mono font-semibold text-slate-800 dark:text-slate-200'>
                                      {chg.newValue}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {item.note && (
                            <div className='text-[10px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1 pt-0.5'>
                              <span>ℹ️ {item.note}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Current Orders Table in Trip */}
              {data.orders && data.orders.length > 0 && (
                <div className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1.5'>
                  <div className='text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5'>
                    <IconPackage className='h-3.5 w-3.5 text-[#0F3D62] dark:text-blue-400' />
                    <span>
                      Danh sách đơn hàng trong chuyến {data.tripCode} ({data.orders.length} đơn)
                    </span>
                  </div>
                  <div className='overflow-x-auto border rounded'>
                    <table className='w-full text-[10px] text-left'>
                      <thead className='bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b'>
                        <tr>
                          <th className='py-1 px-1.5 w-8 text-center'>STT</th>
                          <th className='py-1 px-1.5'>MÃ VẬN ĐƠN</th>
                          <th className='py-1 px-1.5'>TÊN HÀNG HÓA</th>
                          <th className='py-1 px-1.5 text-right'>SỐ KIỆN</th>
                          <th className='py-1 px-1.5 text-right'>KHỐI LƯỢNG</th>
                          <th className='py-1 px-1.5 text-right'>THỂ TÍCH</th>
                          <th className='py-1 px-1.5'>CHUYẾN NHẬP GỐC</th>
                          <th className='py-1 px-1.5 text-center'>TRẠNG THÁI ĐƠN</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-slate-100 dark:divide-slate-800'>
                        {data.orders.map((o, idx) => (
                          <tr
                            key={o.orderId}
                            className='hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          >
                            <td className='py-1 px-1.5 text-center font-mono text-slate-400'>
                              {idx + 1}
                            </td>
                            <td className='py-1 px-1.5 font-mono font-bold text-[11px] text-indigo-700 dark:text-indigo-300'>
                              {o.orderCode}
                            </td>
                            <td className='py-1 px-1.5 text-slate-800 dark:text-slate-200 font-medium'>
                              {o.goodsDescription}
                            </td>
                            <td className='py-1 px-1.5 text-right font-mono font-bold'>
                              {o.quantityAllocated} kiện
                            </td>
                            <td className='py-1 px-1.5 text-right font-mono'>
                              {formatWeight(o.weightAllocated)} kg
                            </td>
                            <td className='py-1 px-1.5 text-right font-mono'>
                              {formatVolume(o.volumeAllocated)} m³
                            </td>
                            <td className='py-1 px-1.5 font-mono'>
                              {o.inboundTripCode ? (
                                <span>
                                  <strong>{o.inboundTripCode}</strong>
                                  {o.inboundLicensePlate ? ` (${o.inboundLicensePlate})` : ''}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className='py-1 px-1.5 text-center'>
                              {o.orderStatus === 'DRAFT' ? (
                                <Badge className='bg-amber-400 text-amber-950 text-[9px] px-1.5 py-0 border-0 font-bold'>
                                  Đơn nháp (Chưa nhập)
                                </Badge>
                              ) : (
                                <Badge className='bg-emerald-600 text-white text-[9px] px-1.5 py-0 border-0 font-bold'>
                                  <IconCircleCheck className='h-2.5 w-2.5 mr-0.5 inline' />
                                  Đã nhập kho
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky Bottom Footer */}
        <div className='sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-1.5 flex items-center justify-end gap-2 shrink-0'>
          <Button
            variant='outline'
            size='sm'
            onClick={onClose}
            className='h-8 px-3 text-xs font-semibold'
          >
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
