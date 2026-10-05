'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  IconBuildingWarehouse,
  IconTruck,
  IconCalendar,
  IconUser,
  IconPrinter,
  IconCircleCheck,
  IconLoader2,
  IconX,
  IconDeviceFloppy,
  IconChevronRight,
  IconPlus,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { tokenManager } from '@/lib/token-manager';
import { formatApiError, showApiErrorToast } from '@/lib/api-error';
import { useAuthStore } from '@/stores/use-auth-store';
import { WarehouseEditableGrid, WarehouseRowItem } from './warehouse-editable-grid';
import { WarehouseAppendOrderModal } from './warehouse-append-order-modal';
import { renderWarehouseOrderStatusBadge } from './warehouse-tables/columns';
import { formatWeight, formatVolume } from '@/lib/format';
import {
  useTripManifestQuery,
  tripManifestKeys,
  isManifestTripCode
} from '../api/trip-manifest';
import {
  WarehouseTripTallyTable,
  buildInitialTallyState,
  expectedForLine,
  type TallyState
} from './warehouse-trip-tally-table';
import { TripStopStatusBadge } from './trip-stop-status-badge';

export interface InboundVehicleGroup {
  groupKey: string;
  licensePlate: string;
  driverName: string;
  tripCode: string;
  receiveDate?: string;
  status: string;
  isTransfer: boolean;
  orders: any[];
  totalQuantity: number;
  totalWeight: number;
  totalVolume: number;
  goodsDescription: string;
  notes?: string;
}

interface WarehouseTripDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripGroup: InboundVehicleGroup | null;
  onSuccess?: () => void;
  onOpenReceipt?: (grp: InboundVehicleGroup) => void;
  readOnly?: boolean;
  mode?: 'INBOUND' | 'OUTBOUND';
}

export function WarehouseTripDetailModal({
  isOpen,
  onClose,
  tripGroup,
  onSuccess,
  onOpenReceipt,
  readOnly = false,
  mode = 'INBOUND'
}: WarehouseTripDetailModalProps) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Full trip manifest as seen by the current hub (per-hub stop status, lines for this hub)
  const manifestTripCode = isManifestTripCode(tripGroup?.tripCode) ? tripGroup?.tripCode : null;
  const {
    data: manifest,
    isLoading: isManifestLoading,
    isError: isManifestError,
    error: manifestError
  } = useTripManifestQuery(manifestTripCode, isOpen);

  /**
   * Tally mode: the trip carries at least one locked Master Contract (cargo coming from another hub
   * or already submitted). Contract columns become read-only and the operator records actual quantities.
   */
  const isTallyMode = mode === 'INBOUND' && !!manifest && manifest.lines.some((l) => l.isContractLocked);
  /** Block every action until we know whether the trip must be tallied (prevents contract overwrite) */
  const manifestPending = mode === 'INBOUND' && !!manifestTripCode && isManifestLoading;

  const [tally, setTally] = useState<TallyState>({});
  const [hideOtherHubs, setHideOtherHubs] = useState(false);
  const [isAppendModalOpen, setIsAppendModalOpen] = useState(false);

  /**
   * Print receipt scoped strictly to current hub (never print orders of downstream hubs).
   */
  const handlePrintReceipt = () => {
    if (!onOpenReceipt || !tripGroup) return;

    if (mode === 'INBOUND' && manifest && manifest.lines && manifest.lines.length > 0) {
      const isCompleted = manifest.currentHubStatus === 'COMPLETED';
      let targetLines = manifest.lines.filter((l) =>
        isCompleted ? l.isReceivedHere || Number(l.receivedQuantity) > 0 : l.isForCurrentHub
      );
      if (targetLines.length === 0) {
        targetLines = manifest.lines.filter((l) => l.isForCurrentHub);
      }
      if (targetLines.length === 0) {
        targetLines = manifest.lines;
      }

      const filteredOrders = targetLines.map((l) => ({
        id: l.id,
        orderCode: l.orderCode,
        goodsDescription: l.goodsDescription || 'Hàng hóa nhập kho',
        totalQuantity: l.receivedQuantity > 0 ? l.receivedQuantity : l.expectedQuantity,
        inboundQuantity: l.receivedQuantity > 0 ? l.receivedQuantity : l.expectedQuantity,
        totalWeight: l.totalWeight || l.weightAllocated || 0,
        totalVolume: l.totalVolume || l.volumeAllocated || 0,
        deliveryAddress: l.deliveryAddress || l.destinationHub || '—',
        destinationHub: l.destinationHub,
        destinationHubId: l.destinationHubId,
        destinationHubEntity: l.destinationHubEntity,
        accompanyingDocs: l.accompanyingDocs || 'KHÔNG CÓ',
        notes: l.notes || '',
        pickupAddress: l.pickupAddress,
      }));

      const totalQty = filteredOrders.reduce((sum, o) => sum + (Number(o.inboundQuantity) || 1), 0);
      const totalWeight = filteredOrders.reduce((sum, o) => sum + (Number(o.totalWeight) || 0), 0);
      const totalVolume = filteredOrders.reduce((sum, o) => sum + (Number(o.totalVolume) || 0), 0);

      onOpenReceipt({
        ...tripGroup,
        orders: filteredOrders,
        totalQuantity: totalQty,
        totalWeight,
        totalVolume,
      });
      return;
    }

    onOpenReceipt(tripGroup);
  };

  useEffect(() => {
    if (isOpen && manifest) {
      setTally(buildInitialTallyState(manifest.lines));
    }
  }, [isOpen, manifest]);

  const currentStopHubName = useMemo(() => {
    if (!manifest?.currentHubId) return user?.hub?.name ?? null;
    return (
      manifest.stops.find((s) => s.hubId === manifest.currentHubId)?.hubName ??
      user?.hub?.name ??
      null
    );
  }, [manifest, user?.hub?.name]);

  // Auto-resolve read-only mode based on business status (LƯU KHO, Đã xuất kho, etc. cannot be modified)
  const effectiveReadOnly = useMemo(() => {
    if (readOnly || mode === 'OUTBOUND') return true;
    if (!tripGroup) return true;

    if (isTallyMode && manifest) {
      // Hub-scoped: read-only once this hub processed the trip, or nothing is left to unload here
      if (!manifest.currentHubId) return true;
      if (manifest.currentHubStatus === 'COMPLETED') return true;
      return !manifest.lines.some((l) => !l.isReceivedHere);
    }

    // Check if the group has any pending/waiting orders
    const hasWaiting = tripGroup.orders?.some((o) =>
      ['DRAFT', 'PENDING', 'PENDING_INBOUND', 'WAITING', 'IN_TRANSIT'].includes(
        o.status?.toUpperCase()
      )
    );

    // If the group status is already stored / finalized
    const isStoredOrFinalized = [
      'INBOUND',
      'STORED',
      'LUU_KHO',
      'COMPLETED_INBOUND',
      'OUT_FOR_DELIVERY',
      'DISPATCHED',
      'COMPLETED',
      'DELIVERED',
      'CANCELLED'
    ].includes(tripGroup.status?.toUpperCase());

    return !hasWaiting || isStoredOrFinalized;
  }, [readOnly, mode, tripGroup, isTallyMode, manifest]);

  const [receiveDate, setReceiveDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [rows, setRows] = useState<WarehouseRowItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Fill vehicle info from the manifest when the board group did not carry it
  useEffect(() => {
    if (!isOpen || !manifest) return;
    setLicensePlate((prev) => prev || manifest.licensePlate || '');
    setDriverName((prev) => prev || manifest.driverName || '');
  }, [isOpen, manifest]);

  const tallySummary = useMemo(() => {
    if (!manifest) return { selected: 0, actual: 0, discrepancyLines: 0 };
    let selected = 0;
    let actual = 0;
    let discrepancyLines = 0;
    for (const l of manifest.lines) {
      const s = tally[l.id];
      if (!s?.checked || l.isReceivedHere) continue;
      selected++;
      const qty = s.actualQuantity === '' ? 0 : Number(s.actualQuantity);
      actual += qty;
      if (qty !== expectedForLine(l)) discrepancyLines++;
    }
    return { selected, actual, discrepancyLines };
  }, [manifest, tally]);

  // Sync state when tripGroup opens
  useEffect(() => {
    if (tripGroup && isOpen) {
      setLicensePlate(tripGroup.licensePlate !== 'CHƯA GÁN' ? tripGroup.licensePlate : '');
      setDriverName(tripGroup.driverName || '');
      setReceiveDate(tripGroup.receiveDate || new Date().toISOString().split('T')[0]);

      if (tripGroup.orders && tripGroup.orders.length > 0) {
        const mappedRows: WarehouseRowItem[] = tripGroup.orders.map((o) => {
          let deliveryAddr = o.deliveryAddress || '';
          if (!deliveryAddr && o.route && o.route.includes('→')) {
            deliveryAddr = o.route.split('→')[1]?.trim() || '';
          }

          let pickupAddr = o.pickupAddress || '';
          if (!pickupAddr && o.route && o.route.includes('→')) {
            pickupAddr = o.route.split('→')[0]?.trim() || '';
          }
          if (!pickupAddr || pickupAddr === 'Hub') {
            pickupAddr = o.originHub || '';
          }

          return {
            id: o.id,
            orderCode: o.orderCode || '',
            pickupAddress: pickupAddr,
            goodsDescription: o.goodsDescription || '',
            totalQuantity: Number(o.inboundQuantity ?? o.totalQuantity ?? 1),
            remainingQuantity: o.remainingQuantity,
            inboundQuantity: o.inboundQuantity,
            outboundQuantity: o.outboundQuantity,
            totalWeight: Number(o.totalWeight ?? 0),
            totalVolume: Number(o.totalVolume ?? 0),
            deliveryMode: (o.deliveryMode as any) || 'DIRECT_CUSTOMER',
            deliveryAddress: deliveryAddr,
            province: o.province || '',
            accompanyingDocs: o.accompanyingDocs || '',
            notes: o.notes || '',
            destinationHubId: o.destinationHubId || null,
            destinationHub:
              o.destinationHubEntity ||
              (o.destinationHub
                ? { id: o.destinationHubId, name: o.destinationHub, code: '' }
                : null),
            status: o.status
          };
        });
        setRows(mappedRows);
      } else {
        setRows([
          {
            orderCode: '',
            pickupAddress: '',
            goodsDescription: '',
            totalQuantity: 1,
            totalWeight: 0,
            totalVolume: 0,
            deliveryMode: 'DIRECT_CUSTOMER',
            deliveryAddress: '',
            province: '',
            accompanyingDocs: '',
            notes: ''
          }
        ]);
      }
    }
  }, [tripGroup, isOpen, user?.hub?.name]);

  // Aggregate summaries
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.totalQty += Number(r.totalQuantity) || 0;
        acc.totalWeight += Number(r.totalWeight) || 0;
        acc.totalVolume += Number(r.totalVolume) || 0;
        return acc;
      },
      { totalQty: 0, totalWeight: 0, totalVolume: 0 }
    );
  }, [rows]);

  if (!tripGroup) return null;

  // Validation function
  const validateForm = (): boolean => {
    if (!licensePlate.trim()) {
      toast.error('Vui lòng nhập biển số xe tiếp nhận hàng!');
      return false;
    }
    if (rows.length === 0) {
      toast.error('Chuyến xe cần ít nhất một dòng hàng hóa!');
      return false;
    }
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.orderCode || !r.orderCode.trim()) {
        toast.error(`Dòng số ${i + 1} chưa có mã vận đơn! Vui lòng nhập mã vận đơn.`);
        return false;
      }
      if (!r.totalQuantity || Number(r.totalQuantity) <= 0) {
        toast.error(`Dòng số ${i + 1} (${r.orderCode}): Số lượng kiện phải lớn hơn 0!`);
        return false;
      }
    }
    return true;
  };

  // 1. Lưu thay đổi (Save updates without changing to INBOUND status if pending)
  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    const token = tokenManager.getAccessToken();

    try {
      const payload = {
        tripCode: tripGroup.tripCode !== '—' ? tripGroup.tripCode : undefined,
        licensePlate: licensePlate.trim().toUpperCase(),
        driverName: driverName.trim() || undefined,
        receiveDate,
        targetStatus: 'KEEP',
        orders: rows.map((r) => ({
          id: r.id,
          orderCode: r.orderCode.trim().toUpperCase(),
          goodsDescription: r.goodsDescription?.trim() || 'Hàng tiếp nhận kho',
          totalQuantity: Number(r.totalQuantity) > 0 ? Number(r.totalQuantity) : 1,
          totalWeight: Number(r.totalWeight) >= 0 ? Number(r.totalWeight) : 0,
          totalVolume: Number(r.totalVolume) >= 0 ? Number(r.totalVolume) : 0,
          pickupAddress: r.pickupAddress?.trim() || user?.hub?.name || '',
          deliveryAddress: r.deliveryAddress?.trim() || '',
          province: r.province?.trim() || undefined,
          accompanyingDocs: r.accompanyingDocs?.trim() || undefined,
          destinationHubId: r.destinationHubId || null,
          notes: r.notes?.trim() || undefined,
          status: r.status
        }))
      };

      const res = await fetch('/api/v1/warehouse/inbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(`Đã lưu thay đổi cho chuyến xe ${tripGroup.tripCode} thành công!`);
      onSuccess?.();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi lưu thay đổi chuyến xe');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Xác nhận kiểm đếm & Nhập kho (Confirm All to INBOUND status)
  const handleConfirmInbound = async () => {
    if (!validateForm()) return;

    setIsConfirming(true);
    const token = tokenManager.getAccessToken();

    try {
      const payload = {
        tripCode: tripGroup.tripCode !== '—' ? tripGroup.tripCode : undefined,
        licensePlate: licensePlate.trim().toUpperCase(),
        driverName: driverName.trim() || undefined,
        receiveDate,
        targetStatus: 'INBOUND',
        orders: rows.map((r) => ({
          id: r.id,
          orderCode: r.orderCode.trim().toUpperCase(),
          goodsDescription: r.goodsDescription?.trim() || 'Hàng tiếp nhận kho',
          totalQuantity: Number(r.totalQuantity) > 0 ? Number(r.totalQuantity) : 1,
          totalWeight: Number(r.totalWeight) >= 0 ? Number(r.totalWeight) : 0,
          totalVolume: Number(r.totalVolume) >= 0 ? Number(r.totalVolume) : 0,
          pickupAddress: r.pickupAddress?.trim() || user?.hub?.name || '',
          deliveryAddress: r.deliveryAddress?.trim() || '',
          province: r.province?.trim() || undefined,
          accompanyingDocs: r.accompanyingDocs?.trim() || undefined,
          destinationHubId: r.destinationHubId || null,
          notes: r.notes?.trim() || undefined
        }))
      };

      const res = await fetch('/api/v1/warehouse/inbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(
        `Đã xác nhận kiểm đếm và tiếp nhận thành công ${rows.length} đơn hàng của xe ${licensePlate.trim().toUpperCase()} vào kho!`
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi xác nhận kiểm đếm nhập kho');
    } finally {
      setIsConfirming(false);
    }
  };

  // 3. Kiểm đếm chọn lọc theo kho (chuyến nhiều điểm dỡ / hợp đồng đã khóa)
  const handleConfirmTally = async () => {
    if (!manifest) return;
    const selectedLines = manifest.lines.filter((l) => tally[l.id]?.checked && !l.isReceivedHere);

    if (selectedLines.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 dòng hàng dỡ xuống tại kho này!');
      return;
    }
    if (!licensePlate.trim()) {
      toast.error('Vui lòng nhập biển số xe tiếp nhận hàng!');
      return;
    }
    for (const l of selectedLines) {
      const s = tally[l.id];
      const qty = s.actualQuantity === '' ? 0 : Number(s.actualQuantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        toast.error(`Đơn ${l.orderCode}: Số kiện thực nhận phải lớn hơn 0!`);
        return;
      }
      if (qty !== expectedForLine(l) && !s.discrepancyReason.trim()) {
        toast.error(`Đơn ${l.orderCode}: Vui lòng nhập lý do chênh lệch số kiện.`);
        return;
      }
    }

    setIsConfirming(true);
    const token = tokenManager.getAccessToken();
    try {
      const payload = {
        tripCode: manifest.tripCode,
        licensePlate: licensePlate.trim().toUpperCase(),
        driverName: driverName.trim() || undefined,
        receiveDate,
        targetStatus: 'INBOUND',
        orders: selectedLines.map((l) => {
          const s = tally[l.id];
          const qty = Number(s.actualQuantity);
          return {
            id: l.id,
            orderCode: l.orderCode,
            actualQuantity: qty,
            expectedQuantity: expectedForLine(l),
            discrepancyReason: s.discrepancyReason.trim() || undefined,
            // Draft lines of this hub: actual count becomes the contract quantity
            ...(l.isContractLocked ? {} : { totalQuantity: qty })
          };
        })
      };

      const res = await fetch('/api/v1/warehouse/inbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      const body = await res.json().catch(() => null);
      const invoiceCode: string | undefined = body?.data?.invoiceCode ?? body?.invoiceCode;
      toast.success(
        `Đã nhập kho ${selectedLines.length} dòng hàng từ chuyến ${manifest.tripCode}${
          invoiceCode ? ` (phiếu ${invoiceCode})` : ''
        }.`
      );
      await queryClient.invalidateQueries({ queryKey: tripManifestKeys.all });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi xác nhận kiểm đếm nhập kho');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className='max-w-[96vw] xl:max-w-7xl w-full p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-[92vh] flex flex-col'
      >
        {/* Header Bar */}
        <div className='bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0'>
          <div>
            <div className='flex items-center gap-2'>
              <span className='text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800'>
                CHUYẾN XE {manifest?.tripCode ?? tripGroup.tripCode}
              </span>
              <Badge
                variant='outline'
                className={
                  (manifest?.isTransfer ?? tripGroup.isTransfer)
                    ? 'bg-purple-50 text-purple-700 border-purple-300 font-bold text-[10px]'
                    : 'bg-blue-50 text-blue-700 border-blue-300 font-bold text-[10px]'
                }
              >
                {(manifest?.isTransfer ?? tripGroup.isTransfer) ? 'Luân chuyển nội bộ' : 'Khách gửi trực tiếp'}
              </Badge>
              {manifest?.currentHubStatus ? (
                <TripStopStatusBadge status={manifest.currentHubStatus} />
              ) : (
                renderWarehouseOrderStatusBadge(tripGroup.status)
              )}
            </div>
            <h2 className='text-sm font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2'>
              <IconBuildingWarehouse className='h-4 w-4 text-[#0F3D62] dark:text-blue-400' />
              <span>
                {effectiveReadOnly
                  ? `Chi tiết chuyến xe ${mode === 'OUTBOUND' ? 'xuất kho' : ''} (Xem thông tin)`
                  : 'Chi tiết chuyến xe & Kiểm đếm hàng hóa'}
              </span>
            </h2>
          </div>

          <div className='flex items-center gap-2'>
            {mode === 'INBOUND' && !effectiveReadOnly && isManifestTripCode(tripGroup?.tripCode) && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => setIsAppendModalOpen(true)}
                className='h-8 text-xs text-[#0F3D62] border-[#0F3D62]/40 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950 font-bold'
                title='Bốc thêm đơn dọc đường vào chuyến xe này'
              >
                <IconPlus className='h-3.5 w-3.5 mr-1' /> Bốc thêm đơn
              </Button>
            )}
            {onOpenReceipt && (
              <Button
                variant='outline'
                size='sm'
                onClick={handlePrintReceipt}
                className='h-8 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 font-semibold'
                title={mode === 'OUTBOUND' ? 'In phiếu xuất xe' : 'In phiếu nhập xe'}
              >
                <IconPrinter className='h-3.5 w-3.5 mr-1' />{' '}
                {mode === 'OUTBOUND' ? 'In phiếu xuất' : 'In phiếu nhập'}
              </Button>
            )}
            <Button
              variant='ghost'
              size='sm'
              onClick={onClose}
              className='h-8 w-8 p-0 text-slate-400 hover:text-slate-600'
            >
              <IconX className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className='p-2 space-y-1.5 overflow-y-auto flex-1'>
          {effectiveReadOnly && (
            <div className='bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[10px] px-2.5 py-1 rounded flex items-center gap-1.5 border border-slate-200 dark:border-slate-700'>
              <IconCircleCheck className='h-3.5 w-3.5 text-emerald-500 shrink-0' />
              {isTallyMode ? (
                <span>
                  Chuyến xe <strong>Đã xử lý</strong> tại {currentStopHubName ?? 'kho này'}. Chỉ hỗ
                  trợ xem thông tin và in phiếu.
                </span>
              ) : (
                <span>
                  Chuyến xe đã ở trạng thái{' '}
                  <strong>
                    {tripGroup.status === 'INBOUND' || tripGroup.status === 'STORED'
                      ? 'LƯU KHO'
                      : tripGroup.status || 'Chỉ xem'}
                  </strong>
                  . Dữ liệu đã chốt sổ cái tồn kho, chỉ hỗ trợ xem thông tin và in phiếu.
                </span>
              )}
            </div>
          )}

          {isManifestError && (
            <div className='text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded px-2 py-1'>
              {formatApiError(manifestError, 'Không thể tải bảng kê chuyến xe.')}
            </div>
          )}

          {/* Route stops: per-hub processing status */}
          {manifest && manifest.stops.length > 0 && (
            <div className='flex flex-wrap items-center gap-1 text-[10px]'>
              <span className='font-semibold text-slate-600 dark:text-slate-300'>Lộ trình:</span>
              {manifest.stops.map((s, idx) => (
                <React.Fragment key={s.hubId}>
                  {idx > 0 && <IconChevronRight className='h-3 w-3 text-slate-400' />}
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${
                      s.hubId === manifest.currentHubId
                        ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/40 font-bold'
                        : 'border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700'
                    }`}
                  >
                    {s.hubName}
                    <TripStopStatusBadge status={s.status} className='h-4 px-1' />
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Top Card: Vehicle Information (Frame UVtv4 parity) */}
          <Card className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs py-0'>
            <CardContent className='p-1 grid grid-cols-1 md:grid-cols-3 gap-2'>
              {/* 1. Ngày xuất kho / nhập kho */}
              <div>
                <label
                  className={`text-[11px] font-bold block mb-1 ${
                    effectiveReadOnly
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  1. {mode === 'OUTBOUND' ? 'Ngày xuất kho' : 'Ngày nhập kho'}{' '}
                  {!effectiveReadOnly && <span className='text-red-600 font-black'>*</span>}
                </label>
                <div className='relative'>
                  <IconCalendar className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400' />
                  <Input
                    type='date'
                    value={receiveDate}
                    onChange={(e) => setReceiveDate(e.target.value)}
                    disabled={effectiveReadOnly}
                    readOnly={effectiveReadOnly}
                    className={`h-8 pl-8 text-xs font-medium ${
                      effectiveReadOnly
                        ? 'border-slate-300 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        : 'border-red-300 focus:border-red-500 bg-red-50/20 dark:bg-red-950/20 dark:border-red-900'
                    }`}
                  />
                </div>
              </div>

              {/* 2. Biển số xe */}
              <div>
                <label
                  className={`text-[11px] font-bold block mb-1 ${
                    effectiveReadOnly
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  2. Biển số xe{' '}
                  {!effectiveReadOnly && <span className='text-red-600 font-black'>*</span>}
                </label>
                <div className='relative'>
                  <IconTruck
                    className={`absolute left-2.5 top-2.5 h-3.5 w-3.5 ${
                      effectiveReadOnly ? 'text-slate-400' : 'text-red-400'
                    }`}
                  />
                  <Input
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder='VD: 29C-123.45'
                    disabled={effectiveReadOnly}
                    readOnly={effectiveReadOnly}
                    className={`h-8 pl-8 text-xs font-bold uppercase ${
                      effectiveReadOnly
                        ? 'border-slate-300 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        : 'border-red-400 focus:border-red-500 bg-red-50/30 text-red-950 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200'
                    }`}
                  />
                </div>
              </div>

              {/* 3. Tài xế / Người giao / Người nhận */}
              <div>
                <label className='text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1'>
                  3.{' '}
                  {mode === 'OUTBOUND'
                    ? 'Họ tên người nhận / tài xế'
                    : 'Họ tên tài xế / người giao'}{' '}
                  <span className='text-slate-400 font-normal'>(Tùy chọn)</span>
                </label>
                <div className='relative'>
                  <IconUser className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400' />
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder='VD: Nguyễn Văn A'
                    disabled={effectiveReadOnly}
                    readOnly={effectiveReadOnly}
                    className='h-8 pl-8 text-xs font-medium border-slate-300 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grid Card */}
          <Card className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs py-0'>
            <CardContent className='p-1 space-y-1.5'>
              <div className='flex items-center justify-between pb-1'>
                <span className='text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5'>
                  <IconBuildingWarehouse className='h-3.5 w-3.5 text-blue-600' />
                  <span>
                    {isTallyMode
                      ? `Kiểm đếm dỡ hàng tại ${currentStopHubName ?? 'kho này'}`
                      : 'Bảng kê chi tiết các dòng hàng trên chuyến xe'}
                  </span>
                </span>
                <div className='flex items-center gap-2'>
                  <span className='text-[11px] text-gray-500'>
                    {(isTallyMode ? manifest?.lines.length : rows.length) ?? 0} đơn hàng trên xe
                  </span>
                  {mode === 'INBOUND' && !effectiveReadOnly && isManifestTripCode(tripGroup?.tripCode) && (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => setIsAppendModalOpen(true)}
                      className='h-6 px-2 text-[10px] text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-950 font-bold'
                    >
                      <IconPlus className='h-3 w-3 mr-1' /> Bốc thêm đơn lên xe
                    </Button>
                  )}
                </div>
              </div>

              {manifestPending ? (
                <div className='py-1.5 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5'>
                  <IconLoader2 className='h-3.5 w-3.5 animate-spin' /> Đang tải bảng kê chuyến xe...
                </div>
              ) : isTallyMode && manifest ? (
                <WarehouseTripTallyTable
                  lines={manifest.lines}
                  state={tally}
                  onChange={setTally}
                  hideOtherHubs={hideOtherHubs}
                  onHideOtherHubsChange={setHideOtherHubs}
                  readOnly={effectiveReadOnly}
                  currentHubName={currentStopHubName}
                />
              ) : effectiveReadOnly ? (
                <div className='border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto'>
                  <table className='w-full text-[10px] text-left'>
                    <thead className='bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-[10px]'>
                      <tr>
                        <th className='py-1 px-1.5 w-[36px] text-center'>STT</th>
                        <th className='py-1 px-1.5 w-[140px]'>MÃ VẬN ĐƠN</th>
                        <th className='py-1 px-1.5 min-w-[140px]'>ĐỊA CHỈ NHẬN</th>
                        <th className='py-1 px-1.5 min-w-[150px]'>TÊN HÀNG HÓA</th>
                        <th className='py-1 px-1.5 text-right w-[75px]'>SỐ KIỆN</th>
                        <th className='py-1 px-1.5 text-right w-[75px]'>SỐ KG</th>
                        <th className='py-1 px-1.5 text-right w-[75px]'>SỐ M³</th>
                        <th className='py-1 px-1.5 min-w-[160px]'>ĐỊA CHỈ GIAO</th>
                        <th className='py-1 px-1.5 w-[95px]'>TỈNH / TP</th>
                        <th className='py-1 px-1.5 w-[90px] text-center'>CHỨNG TỪ</th>
                        <th className='py-1 px-1.5 min-w-[120px]'>GHI CHÚ</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900'>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={11} className='py-1.5 text-center text-slate-400'>
                            Không có đơn hàng nào trong chuyến xe
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, i) => (
                          <tr
                            key={r.id || i}
                            className='hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          >
                            <td className='py-1 px-1.5 text-center font-bold text-slate-500'>
                              {String(i + 1).padStart(2, '0')}
                            </td>
                            <td className='py-1 px-1.5 font-mono font-bold text-blue-700 dark:text-blue-300'>
                              {r.orderCode}
                            </td>
                            <td className='py-1 px-1.5 text-slate-700 dark:text-slate-300'>
                              {r.pickupAddress || '—'}
                            </td>
                            <td className='py-1 px-1.5 font-medium text-slate-900 dark:text-white'>
                              {r.goodsDescription || '—'}
                            </td>
                            <td className='py-1 px-1.5 text-right font-bold text-slate-800 dark:text-slate-200'>
                              {r.totalQuantity}
                            </td>
                            <td className='py-1 px-1.5 text-right text-slate-700 dark:text-slate-300'>
                              {formatWeight(r.totalWeight)}
                            </td>
                            <td className='py-1 px-1.5 text-right text-slate-700 dark:text-slate-300'>
                              {formatVolume(r.totalVolume)}
                            </td>
                            <td className='py-1 px-1.5 text-slate-700 dark:text-slate-300'>
                              {r.deliveryAddress || '—'}
                            </td>
                            <td className='py-1 px-1.5 text-slate-600 dark:text-slate-400'>
                              {r.province || '—'}
                            </td>
                            <td className='py-1 px-1.5 text-center'>
                              <Badge variant='outline' className='text-[9px] px-1 py-0 h-4'>
                                {r.accompanyingDocs || 'Không có'}
                              </Badge>
                            </td>
                            <td className='py-1 px-1.5 text-slate-500 text-[10px]'>
                              {r.notes || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <WarehouseEditableGrid rows={rows} onChange={setRows} isOutboundMode={false} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className='sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0'>
          {isTallyMode ? (
            <div className='flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300'>
              <span>
                Dỡ tại kho:{' '}
                <strong className='text-slate-900 dark:text-white'>{tallySummary.selected}</strong> /{' '}
                {manifest?.lines.length ?? 0} dòng
              </span>
              <span>&bull;</span>
              <span>
                Thực nhận: <strong className='text-blue-600 font-bold'>{tallySummary.actual}</strong>{' '}
                kiện
              </span>
              {tallySummary.discrepancyLines > 0 && (
                <>
                  <span>&bull;</span>
                  <span className='text-rose-600'>
                    {tallySummary.discrepancyLines} dòng chênh lệch
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className='flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300'>
              <span>
                Tổng số đơn: <strong className='text-slate-900 dark:text-white'>{rows.length}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Tổng kiện: <strong className='text-blue-600 font-bold'>{totals.totalQty}</strong> kiện
              </span>
              <span>&bull;</span>
              <span>
                Tổng tải:{' '}
                <strong className='text-slate-800 dark:text-slate-200'>
                  {formatWeight(totals.totalWeight)}
                </strong>{' '}
                kg &bull;{' '}
                <strong className='text-slate-800 dark:text-slate-200'>
                  {formatVolume(totals.totalVolume)}
                </strong>{' '}
                m³
              </span>
            </div>
          )}

          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onClose}
              disabled={isSaving || isConfirming}
              className='h-8 text-xs font-semibold border-slate-300'
            >
              Đóng
            </Button>

            {!effectiveReadOnly && !manifestPending && isTallyMode && (
              <Button
                type='button'
                onClick={handleConfirmTally}
                disabled={isConfirming || tallySummary.selected === 0}
                className='h-8 bg-[#0F3D62] hover:bg-[#0c314f] text-white px-2.5 font-bold shadow-xs text-xs'
                title='Xác nhận nhập kho các dòng hàng đã chọn dỡ tại kho này'
              >
                {isConfirming ? (
                  <>
                    <IconLoader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' /> Đang nhập kho...
                  </>
                ) : (
                  <>
                    <IconCircleCheck className='mr-1.5 h-3.5 w-3.5 text-emerald-400' /> Xác nhận
                    nhập kho ({tallySummary.selected} dòng)
                  </>
                )}
              </Button>
            )}

            {!effectiveReadOnly && !manifestPending && !isTallyMode && (
              <>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleSaveDraft}
                  disabled={isSaving || isConfirming || rows.length === 0}
                  className='h-8 text-xs font-semibold border-slate-300 dark:border-slate-700 text-slate-700 hover:text-blue-700'
                >
                  {isSaving ? (
                    <>
                      <IconLoader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <IconDeviceFloppy className='mr-1.5 h-3.5 w-3.5 text-blue-600' /> Lưu thay đổi
                    </>
                  )}
                </Button>

                <Button
                  type='button'
                  onClick={handleConfirmInbound}
                  disabled={isSaving || isConfirming || rows.length === 0}
                  className='h-8 bg-[#0F3D62] hover:bg-[#0c314f] text-white px-2.5 font-bold shadow-xs text-xs'
                  title='Kiểm đếm và xác nhận toàn bộ đơn hàng của xe này vào kho'
                >
                  {isConfirming ? (
                    <>
                      <IconLoader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' /> Đang nhập kho...
                    </>
                  ) : (
                    <>
                      <IconCircleCheck className='mr-1.5 h-3.5 w-3.5 text-emerald-400' /> Xác nhận
                      nhập kho
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {isAppendModalOpen && tripGroup && (
          <WarehouseAppendOrderModal
            isOpen={isAppendModalOpen}
            onClose={() => setIsAppendModalOpen(false)}
            tripCode={tripGroup.tripCode}
            licensePlate={licensePlate || tripGroup.licensePlate}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: tripManifestKeys.all });
              queryClient.invalidateQueries({ queryKey: ['warehouse', 'inbound-trips'] });
              onSuccess?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
