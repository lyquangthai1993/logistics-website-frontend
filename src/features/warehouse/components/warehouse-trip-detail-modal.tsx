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
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { tokenManager } from '@/lib/token-manager';
import { formatApiError, showApiErrorToast } from '@/lib/api-error';
import { useAuthStore } from '@/stores/use-auth-store';
import { WarehouseEditableGrid, WarehouseRowItem } from './warehouse-editable-grid';
import { WarehouseAppendOrderModal } from './warehouse-append-order-modal';
import { WarehouseSelectStoredOrdersModal } from './warehouse-select-stored-orders-modal';
import { renderWarehouseOrderStatusBadge } from './warehouse-tables/columns';
import { formatWeight, formatVolume } from '@/lib/format';
import {
  useTripManifestQuery,
  tripManifestKeys,
  isManifestTripCode,
  updateTransitStep,
} from '../api/trip-manifest';
import {
  WarehouseTripTallyTable,
  buildInitialTallyState,
  expectedForLine,
  type TallyState,
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
  mode = 'INBOUND',
}: WarehouseTripDetailModalProps) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // 2-Step Workflow state: 1 = Inbound/Unloading, 2 = Outbound/Loading
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Full trip manifest as seen by the current hub (per-hub stop status, lines for this hub)
  const manifestTripCode = isManifestTripCode(tripGroup?.tripCode)
    ? tripGroup?.tripCode
    : null;
  const {
    data: manifest,
    isLoading: isManifestLoading,
    isError: isManifestError,
    error: manifestError,
  } = useTripManifestQuery(manifestTripCode, isOpen);

  /**
   * Tally mode: the trip carries at least one locked Master Contract (cargo coming from another hub
   * or already submitted). Contract columns become read-only and the operator records actual quantities.
   */
  const isTallyMode =
    mode === 'INBOUND' &&
    !!manifest &&
    manifest.lines.some((l) => l.isContractLocked);
  /** Block every action until we know whether the trip must be tallied (prevents contract overwrite) */
  const manifestPending =
    mode === 'INBOUND' && !!manifestTripCode && isManifestLoading;

  const [tally, setTally] = useState<TallyState>({});
  const [hideOtherHubs, setHideOtherHubs] = useState(false);
  const [isAppendModalOpen, setIsAppendModalOpen] = useState(false);
  const [isSelectStoredModalOpen, setIsSelectStoredModalOpen] = useState(false);
  const [appendModalMode, setAppendModalMode] = useState<
    'ROADSIDE_INBOUND' | 'HUB_OUTBOUND'
  >('ROADSIDE_INBOUND');

  /**
   * Print receipt scoped strictly to current step & hub:
   * - Step 1 (Inbound): Only print cargo arriving/unloading at this hub.
   * - Step 2 (Outbound): Only print cargo newly departing/loaded from this hub.
   */
  const handlePrintReceipt = (overrideMode?: 'INBOUND' | 'OUTBOUND') => {
    if (!onOpenReceipt || !tripGroup) return;
    const printMode =
      overrideMode || (currentStep === 1 ? 'INBOUND' : 'OUTBOUND');

    if (manifest && manifest.lines && manifest.lines.length > 0) {
      let targetLines: any[] = [];
      if (printMode === 'INBOUND') {
        const isCompleted = manifest.currentHubStatus === 'COMPLETED';
        targetLines = manifest.lines.filter((l) =>
          isCompleted
            ? l.isReceivedHere || Number(l.receivedQuantity) > 0
            : l.isForCurrentHub
        );
        if (targetLines.length === 0) {
          targetLines = manifest.lines.filter((l) => l.isForCurrentHub);
        }
      } else {
        // Outbound print: only orders departing/loaded from this hub onto the truck
        targetLines = manifest.lines.filter(
          (l) => l.originHubId === manifest.currentHubId
        );
      }

      if (targetLines.length === 0) {
        targetLines = manifest.lines;
      }

      const filteredOrders = targetLines.map((l) => ({
        id: l.id,
        orderCode: l.orderCode,
        goodsDescription: l.goodsDescription || 'Hàng hóa vận chuyển',
        totalQuantity:
          l.receivedQuantity > 0 ? l.receivedQuantity : l.expectedQuantity,
        inboundQuantity:
          l.receivedQuantity > 0 ? l.receivedQuantity : l.expectedQuantity,
        totalWeight: l.totalWeight || l.weightAllocated || 0,
        totalVolume: l.totalVolume || l.volumeAllocated || 0,
        deliveryAddress:
          l.destinationHub ||
          l.destinationHubEntity?.name ||
          l.deliveryAddress ||
          '—',
        destinationHub: l.destinationHub || l.destinationHubEntity?.name || '',
        destinationHubId: l.destinationHubId,
        destinationHubEntity: l.destinationHubEntity,
        accompanyingDocs: l.accompanyingDocs || 'KHÔNG CÓ',
        notes: l.notes || '',
        pickupAddress: l.pickupAddress,
      }));

      const totalQty = filteredOrders.reduce(
        (sum, o) => sum + (Number(o.inboundQuantity) || 1),
        0
      );
      const totalWeight = filteredOrders.reduce(
        (sum, o) => sum + (Number(o.totalWeight) || 0),
        0
      );
      const totalVolume = filteredOrders.reduce(
        (sum, o) => sum + (Number(o.totalVolume) || 0),
        0
      );

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

  // Reset to Step 1 whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen]);

  const currentStopHubName = useMemo(() => {
    if (!manifest?.currentHubId) return user?.hub?.name ?? null;
    return (
      manifest.stops.find((s) => s.hubId === manifest.currentHubId)?.hubName ??
      user?.hub?.name ??
      null
    );
  }, [manifest, user?.hub?.name]);

  // Auto-resolve read-only mode based on business status
  const effectiveReadOnly = useMemo(() => {
    if (readOnly) return true;
    if (!tripGroup) return true;

    if (isTallyMode && manifest) {
      if (!manifest.currentHubId) return true;
      if (manifest.currentHubStatus === 'COMPLETED') return true;
      return !manifest.lines.some((l) => !l.isReceivedHere);
    }

    const hasWaiting = tripGroup.orders?.some((o) =>
      ['DRAFT', 'PENDING', 'PENDING_INBOUND', 'WAITING', 'IN_TRANSIT'].includes(
        o.status?.toUpperCase()
      )
    );

    const isStoredOrFinalized = [
      'INBOUND',
      'STORED',
      'LUU_KHO',
      'COMPLETED_INBOUND',
      'OUT_FOR_DELIVERY',
      'DISPATCHED',
      'COMPLETED',
      'DELIVERED',
      'CANCELLED',
    ].includes(tripGroup.status?.toUpperCase());

    return !hasWaiting || isStoredOrFinalized;
  }, [readOnly, tripGroup, isTallyMode, manifest]);

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

  // Outbound cargo breakdown for Step 2
  const outboundBreakdown = useMemo(() => {
    if (!manifest || !manifest.lines) {
      return { transitLines: [], hubOutboundLines: [], allOutboundLines: [] };
    }
    const currentHubId = manifest.currentHubId;
    // Cargo loaded at earlier stops continuing past this hub
    const transitLines = manifest.lines.filter(
      (l) => !l.isForCurrentHub && l.originHubId !== currentHubId
    );
    // Cargo loaded directly from this hub
    const hubOutboundLines = manifest.lines.filter(
      (l) => l.originHubId === currentHubId
    );
    const allOutboundLines = [...transitLines, ...hubOutboundLines];

    return { transitLines, hubOutboundLines, allOutboundLines };
  }, [manifest]);

  // Sync state when tripGroup opens
  useEffect(() => {
    if (tripGroup && isOpen) {
      setLicensePlate(
        tripGroup.licensePlate !== 'CHƯA GÁN' ? tripGroup.licensePlate : ''
      );
      setDriverName(tripGroup.driverName || '');
      setReceiveDate(
        tripGroup.receiveDate || new Date().toISOString().split('T')[0]
      );

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
            status: o.status,
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
            notes: '',
          },
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
        toast.error(
          `Dòng số ${i + 1} chưa có mã vận đơn! Vui lòng nhập mã vận đơn.`
        );
        return false;
      }
      if (!r.totalQuantity || Number(r.totalQuantity) <= 0) {
        toast.error(
          `Dòng số ${i + 1} (${r.orderCode}): Số lượng kiện phải lớn hơn 0!`
        );
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
          totalQuantity:
            Number(r.totalQuantity) > 0 ? Number(r.totalQuantity) : 1,
          totalWeight: Number(r.totalWeight) >= 0 ? Number(r.totalWeight) : 0,
          totalVolume: Number(r.totalVolume) >= 0 ? Number(r.totalVolume) : 0,
          pickupAddress: r.pickupAddress?.trim() || user?.hub?.name || '',
          deliveryAddress: r.deliveryAddress?.trim() || '',
          province: r.province?.trim() || undefined,
          accompanyingDocs: r.accompanyingDocs?.trim() || undefined,
          destinationHubId: r.destinationHubId || null,
          notes: r.notes?.trim() || undefined,
          status: r.status,
        })),
      };

      const res = await fetch('/api/v1/warehouse/inbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(
        `Đã lưu thay đổi cho chuyến xe ${tripGroup.tripCode} thành công!`
      );
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
          totalQuantity:
            Number(r.totalQuantity) > 0 ? Number(r.totalQuantity) : 1,
          totalWeight: Number(r.totalWeight) >= 0 ? Number(r.totalWeight) : 0,
          totalVolume: Number(r.totalVolume) >= 0 ? Number(r.totalVolume) : 0,
          pickupAddress: r.pickupAddress?.trim() || user?.hub?.name || '',
          deliveryAddress: r.deliveryAddress?.trim() || '',
          province: r.province?.trim() || undefined,
          accompanyingDocs: r.accompanyingDocs?.trim() || undefined,
          destinationHubId: r.destinationHubId || null,
          notes: r.notes?.trim() || undefined,
        })),
      };

      const res = await fetch('/api/v1/warehouse/inbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(
        `Đã xác nhận kiểm đếm và tiếp nhận thành công ${rows.length} đơn hàng của xe ${licensePlate.trim().toUpperCase()} vào kho!`
      );
      onSuccess?.();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi xác nhận kiểm đếm nhập kho');
    } finally {
      setIsConfirming(false);
    }
  };

  // 3. Kiểm đếm chọn lọc theo kho (chuyến nhiều điểm dỡ / hợp đồng đã khóa)
  const handleConfirmTally = async () => {
    if (!manifest) return;
    const selectedLines = manifest.lines.filter(
      (l) => tally[l.id]?.checked && !l.isReceivedHere
    );

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
            ...(l.isContractLocked ? {} : { totalQuantity: qty }),
          };
        }),
      };

      const res = await fetch('/api/v1/warehouse/inbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      const body = await res.json().catch(() => null);
      const invoiceCode: string | undefined =
        body?.data?.invoiceCode ?? body?.invoiceCode;
      toast.success(
        `Đã nhập kho ${selectedLines.length} dòng hàng từ chuyến ${manifest.tripCode}${
          invoiceCode ? ` (phiếu ${invoiceCode})` : ''
        }.`
      );
      await queryClient.invalidateQueries({ queryKey: tripManifestKeys.all });
      onSuccess?.();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi xác nhận kiểm đếm nhập kho');
    } finally {
      setIsConfirming(false);
    }
  };

  // Hành động hoàn tất / bỏ qua xuất hàng
  const handleSkipAndFinish = async () => {
    if (manifest?.tripCode) {
      try {
        await updateTransitStep(manifest.tripCode, {
          step: 'INBOUND',
          action: 'CONFIRM',
        });
      } catch {
        // non-blocking
      }
    }
    toast.success(
      `Đã hoàn tất tác nghiệp trạm cho chuyến xe ${tripGroup.tripCode}. Chuyến xe tiếp tục hành trình.`
    );
    await queryClient.invalidateQueries({ queryKey: tripManifestKeys.all });
    await queryClient.invalidateQueries({
      queryKey: ['warehouse', 'inbound-trips'],
    });
    onSuccess?.();
    onClose();
  };

  const handleSkipOutboundAndFinish = async () => {
    if (manifest?.tripCode) {
      try {
        await updateTransitStep(manifest.tripCode, {
          step: 'OUTBOUND',
          action: 'SKIP',
        });
      } catch {
        // non-blocking
      }
    }
    toast.success(
      `Đã bỏ qua xuất thêm hàng. Chuyến xe ${tripGroup.tripCode} sẵn sàng rời trạm.`
    );
    await queryClient.invalidateQueries({ queryKey: tripManifestKeys.all });
    await queryClient.invalidateQueries({
      queryKey: ['warehouse', 'inbound-trips'],
    });
    onSuccess?.();
    onClose();
  };

  const handleConfirmOutboundStep = async () => {
    if (manifest?.tripCode) {
      try {
        await updateTransitStep(manifest.tripCode, {
          step: 'OUTBOUND',
          action: 'CONFIRM',
        });
      } catch {
        // non-blocking
      }
    }
    toast.success(
      `Đã xác nhận xuất hàng và hoàn tất trạm trung chuyển cho xe ${licensePlate.trim().toUpperCase()} (${tripGroup.tripCode})!`
    );
    await queryClient.invalidateQueries({ queryKey: tripManifestKeys.all });
    await queryClient.invalidateQueries({
      queryKey: ['warehouse', 'inbound-trips'],
    });
    onSuccess?.();
    onClose();
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
                {(manifest?.isTransfer ?? tripGroup.isTransfer)
                  ? 'Luân chuyển nội bộ'
                  : 'Khách gửi trực tiếp'}
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
                {currentStep === 1
                  ? 'Bước 1: Kiểm đếm dỡ hàng & Nhập kho'
                  : 'Bước 2: Xuất hàng mới lên xe đi trạm kế tiếp'}
              </span>
            </h2>
          </div>

          <div className='flex items-center gap-2'>
            {onOpenReceipt && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePrintReceipt()}
                className='h-7 px-2 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 font-semibold'
                title={
                  currentStep === 1 ? 'In phiếu nhập kho' : 'In phiếu xuất kho'
                }
              >
                <IconPrinter className='h-3.5 w-3.5 mr-1' />
                {currentStep === 1 ? 'In phiếu nhập' : 'In phiếu xuất'}
              </Button>
            )}
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

        {/* 2-Step Stepper Bar */}
        <div className='bg-slate-100 dark:bg-slate-800 px-2.5 py-1 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs shrink-0'>
          <div className='flex items-center gap-1.5'>
            {/* Step 1 Button */}
            <button
              type='button'
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] transition-colors ${
                currentStep === 1
                  ? 'bg-[#0F3D62] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className='w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]'>
                1
              </span>
              <span>1. Nhập hàng & Dỡ kho</span>
              {manifest?.currentHubStatus === 'COMPLETED' && (
                <Badge
                  variant='outline'
                  className='bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] px-1 py-0 h-3.5'
                >
                  <IconCheck className='h-2.5 w-2.5 mr-0.5' /> Đã xong
                </Badge>
              )}
            </button>

            <IconChevronRight className='w-3.5 h-3.5 text-slate-400' />

            {/* Step 2 Button */}
            <button
              type='button'
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] transition-colors ${
                currentStep === 2
                  ? 'bg-[#0F3D62] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className='w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]'>
                2
              </span>
              <span>2. Xuất hàng mới lên xe</span>
              <span className='text-[10px] text-slate-400 font-normal'>
                (Tùy chọn)
              </span>
              {outboundBreakdown.hubOutboundLines.length > 0 && (
                <Badge className='bg-blue-600 text-white text-[9px] px-1 py-0 h-3.5'>
                  +{outboundBreakdown.hubOutboundLines.length}
                </Badge>
              )}
            </button>
          </div>

          <div className='text-[10px] text-slate-500 hidden sm:flex items-center gap-1.5'>
            <span>
              Trạm hiện tại:{' '}
              <strong className='text-emerald-700 dark:text-emerald-400 font-bold'>
                {currentStopHubName ?? 'Kho này'}
              </strong>
            </span>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className='p-2 space-y-1.5 overflow-y-auto flex-1'>
          {effectiveReadOnly && currentStep === 1 && (
            <div className='bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[10px] px-2.5 py-1 rounded flex items-center gap-1.5 border border-slate-200 dark:border-slate-700'>
              <IconCircleCheck className='h-3.5 w-3.5 text-emerald-500 shrink-0' />
              {isTallyMode ? (
                <span>
                  Chuyến xe <strong>Đã xử lý dỡ hàng</strong> tại{' '}
                  {currentStopHubName ?? 'kho này'}. Bạn có thể bấm sang{' '}
                  <strong>Bước 2: Xuất hàng mới lên xe</strong> để bốc thêm hàng
                  gửi tiếp.
                </span>
              ) : (
                <span>
                  Chuyến xe đã chốt sổ cái tồn kho nhập tại kho này.
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
              <span className='font-semibold text-slate-600 dark:text-slate-300'>
                Lộ trình xe:
              </span>
              {manifest.stops.map((s, idx) => (
                <React.Fragment key={s.hubId}>
                  {idx > 0 && (
                    <IconChevronRight className='h-3 w-3 text-slate-400' />
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${
                      s.hubId === manifest.currentHubId
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 font-bold text-blue-950 dark:text-blue-200'
                        : 'border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700'
                    }`}
                  >
                    {s.hubName}
                    <TripStopStatusBadge
                      status={s.status}
                      className='h-3.5 px-1 text-[9px]'
                    />
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Top Card: Vehicle Information */}
          <Card className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs py-0'>
            <CardContent className='p-1 grid grid-cols-1 md:grid-cols-3 gap-2'>
              {/* 1. Ngày nhận / xuất */}
              <div>
                <label className='text-[10px] font-bold block mb-0.5 text-slate-700 dark:text-slate-300'>
                  1. {currentStep === 1 ? 'Ngày nhập kho' : 'Ngày xuất kho'}
                </label>
                <div className='relative'>
                  <IconCalendar className='absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400' />
                  <Input
                    type='date'
                    value={receiveDate}
                    onChange={(e) => setReceiveDate(e.target.value)}
                    disabled={effectiveReadOnly && currentStep === 1}
                    className='h-7 pl-8 text-xs font-medium border-slate-300 bg-slate-50 dark:bg-slate-800'
                  />
                </div>
              </div>

              {/* 2. Biển số xe */}
              <div>
                <label className='text-[10px] font-bold block mb-0.5 text-slate-700 dark:text-slate-300'>
                  2. Biển số xe
                </label>
                <div className='relative'>
                  <IconTruck className='absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400' />
                  <Input
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder='VD: 29C-123.45'
                    disabled={effectiveReadOnly && currentStep === 1}
                    className='h-7 pl-8 text-xs font-bold uppercase border-slate-300 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white'
                  />
                </div>
              </div>

              {/* 3. Tài xế */}
              <div>
                <label className='text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5'>
                  3. Tài xế phụ trách
                </label>
                <div className='relative'>
                  <IconUser className='absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400' />
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder='VD: Nguyễn Văn A'
                    disabled={effectiveReadOnly && currentStep === 1}
                    className='h-7 pl-8 text-xs font-medium border-slate-300 bg-slate-50 dark:bg-slate-800'
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MAIN WORKFLOW AREA */}
          {currentStep === 1 ? (
            /* BƯỚC 1: NHẬP HÀNG & DỠ KHO */
            <Card className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs py-0'>
              <CardContent className='p-1 space-y-1.5'>
                <div className='flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800'>
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
                      {(isTallyMode ? manifest?.lines.length : rows.length) ??
                        0}{' '}
                      dòng hàng
                    </span>
                    {/* Nút duy nhất bốc thêm đơn dọc đường về Hub */}
                    {isManifestTripCode(tripGroup?.tripCode) && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setAppendModalMode('ROADSIDE_INBOUND');
                          setIsAppendModalOpen(true);
                        }}
                        className='h-6 px-2 text-[10px] text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-950 font-bold'
                        title='Tài xế bốc thêm hàng ngoài đường chở về dỡ tại kho hiện tại'
                      >
                        <IconPlus className='h-3 w-3 mr-1' /> Bốc thêm đơn dọc
                        đường về Hub
                      </Button>
                    )}
                  </div>
                </div>

                {manifestPending ? (
                  <div className='py-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5'>
                    <IconLoader2 className='h-4 w-4 animate-spin' /> Đang tải
                    bảng kê chuyến xe...
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
                      <thead className='bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700'>
                        <tr>
                          <th className='py-1 px-1.5 w-[36px] text-center'>
                            STT
                          </th>
                          <th className='py-1 px-1.5 w-[130px]'>MÃ VẬN ĐƠN</th>
                          <th className='py-1 px-1.5 min-w-[130px]'>
                            ĐIỂM BỐC HÀNG
                          </th>
                          <th className='py-1 px-1.5 min-w-[140px]'>
                            TÊN HÀNG HÓA
                          </th>
                          <th className='py-1 px-1.5 text-right w-[65px]'>
                            SỐ KIỆN
                          </th>
                          <th className='py-1 px-1.5 text-right w-[65px]'>
                            SỐ KG
                          </th>
                          <th className='py-1 px-1.5 text-right w-[65px]'>
                            SỐ M³
                          </th>
                          <th className='py-1 px-1.5 min-w-[150px]'>
                            ĐỊA CHỈ GIAO
                          </th>
                          <th className='py-1 px-1.5 w-[90px]'>TỈNH / TP</th>
                          <th className='py-1 px-1.5 w-[85px] text-center'>
                            CHỨNG TỪ
                          </th>
                          <th className='py-1 px-1.5 min-w-[110px]'>GHI CHÚ</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900'>
                        {rows.map((r, i) => (
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
                              <Badge
                                variant='outline'
                                className='text-[9px] px-1 py-0 h-4'
                              >
                                {r.accompanyingDocs || 'Không có'}
                              </Badge>
                            </td>
                            <td className='py-1 px-1.5 text-slate-500 text-[10px]'>
                              {r.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <WarehouseEditableGrid
                    rows={rows}
                    onChange={setRows}
                    isOutboundMode={false}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            /* BƯỚC 2: XUẤT HÀNG MỚI LÊN XE (OUTBOUND STAGE) */
            <Card className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs py-0'>
              <CardContent className='p-1 space-y-1.5'>
                <div className='flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800'>
                  <div>
                    <span className='text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5'>
                      <IconTruck className='h-3.5 w-3.5 text-blue-600' />
                      <span>
                        Hàng hóa tiếp tục hành trình trên xe {tripGroup.tripCode}{' '}
                        (Xuất từ {currentStopHubName ?? 'kho này'})
                      </span>
                    </span>
                    <p className='text-[10px] text-slate-500 mt-0.5'>
                      Gồm các kiện hàng trung chuyển từ trạm trước và các kiện
                      hàng mới bốc từ Hub lên xe
                    </p>
                  </div>

                  <div className='flex items-center gap-2'>
                    {/* Nút thêm đơn xuất từ kho lên xe */}
                    <Button
                      type='button'
                      size='sm'
                      onClick={() => setIsSelectStoredModalOpen(true)}
                      className='h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold'
                      title='Chọn các đơn hàng lưu kho sẵn có để bốc lên xe đi trạm kế tiếp'
                    >
                      <IconPlus className='h-3 w-3 mr-1' /> Thêm đơn xuất từ kho lên xe
                    </Button>
                  </div>
                </div>

                {/* Bảng tổng hợp hàng xuất tiếp */}
                <div className='border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto'>
                  <table className='w-full text-[10px] text-left'>
                    <thead className='bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700'>
                      <tr>
                        <th className='py-1 px-1.5 w-[36px] text-center'>
                          STT
                        </th>
                        <th className='py-1 px-1.5 w-[130px]'>MÃ VẬN ĐƠN</th>
                        <th className='py-1 px-1.5 w-[110px]'>NGUỒN HÀNG</th>
                        <th className='py-1 px-1.5 min-w-[140px]'>
                          TÊN HÀNG HÓA
                        </th>
                        <th className='py-1 px-1.5 text-right w-[65px]'>
                          SỐ KIỆN
                        </th>
                        <th className='py-1 px-1.5 text-right w-[65px]'>
                          SỐ KG
                        </th>
                        <th className='py-1 px-1.5 text-right w-[65px]'>
                          SỐ M³
                        </th>
                        <th className='py-1 px-1.5 min-w-[140px]'>
                          KHO ĐÍCH / NƠI GIAO
                        </th>
                        <th className='py-1 px-1.5 min-w-[120px]'>GHI CHÚ</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900'>
                      {outboundBreakdown.allOutboundLines.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className='py-3 text-center text-slate-400'
                          >
                            Chưa có đơn hàng nào xuất tiếp trên chuyến xe này.
                            Bấm{' '}
                            <strong>"Thêm đơn xuất từ kho lên xe"</strong> để
                            bốc thêm hàng.
                          </td>
                        </tr>
                      ) : (
                        outboundBreakdown.allOutboundLines.map((l: any, i) => {
                          const isNewlyLoadedHere =
                            l.originHubId === manifest?.currentHubId;
                          return (
                            <tr
                              key={l.id || i}
                              className={
                                isNewlyLoadedHere
                                  ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }
                            >
                              <td className='py-1 px-1.5 text-center font-bold text-slate-500'>
                                {String(i + 1).padStart(2, '0')}
                              </td>
                              <td className='py-1 px-1.5 font-mono font-bold text-blue-700 dark:text-blue-300'>
                                {l.orderCode}
                              </td>
                              <td className='py-1 px-1.5'>
                                {isNewlyLoadedHere ? (
                                  <Badge className='bg-emerald-600 text-white text-[9px] px-1 py-0 h-4'>
                                    Bốc từ kho này
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant='outline'
                                    className='bg-slate-100 text-slate-700 border-slate-300 text-[9px] px-1 py-0 h-4'
                                  >
                                    Trung chuyển đi tiếp
                                  </Badge>
                                )}
                              </td>
                              <td className='py-1 px-1.5 font-medium text-slate-900 dark:text-white'>
                                {l.goodsDescription || '—'}
                              </td>
                              <td className='py-1 px-1.5 text-right font-bold text-slate-800 dark:text-slate-200'>
                                {l.inTransitQuantity ||
                                  l.expectedQuantity ||
                                  l.totalQuantity ||
                                  1}
                              </td>
                              <td className='py-1 px-1.5 text-right text-slate-700 dark:text-slate-300'>
                                {formatWeight(
                                  l.totalWeight || l.weightAllocated
                                )}
                              </td>
                              <td className='py-1 px-1.5 text-right text-slate-700 dark:text-slate-300'>
                                {formatVolume(
                                  l.totalVolume || l.volumeAllocated
                                )}
                              </td>
                              <td className='py-1 px-1.5 text-slate-700 dark:text-slate-300 font-semibold'>
                                {l.destinationHub ||
                                  l.deliveryAddress ||
                                  'Chưa xác định'}
                              </td>
                              <td className='py-1 px-1.5 text-slate-500 text-[10px]'>
                                {l.notes || '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Actions */}
        <div className='sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0'>
          {/* Summary Metric */}
          {currentStep === 1 ? (
            isTallyMode ? (
              <div className='flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300'>
                <span>
                  Dỡ tại kho:{' '}
                  <strong className='text-slate-900 dark:text-white'>
                    {tallySummary.selected}
                  </strong>{' '}
                  / {manifest?.lines.length ?? 0} dòng
                </span>
                <span>&bull;</span>
                <span>
                  Thực nhận:{' '}
                  <strong className='text-blue-600 font-bold'>
                    {tallySummary.actual}
                  </strong>{' '}
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
                  Tổng số đơn:{' '}
                  <strong className='text-slate-900 dark:text-white'>
                    {rows.length}
                  </strong>
                </span>
                <span>&bull;</span>
                <span>
                  Tổng kiện:{' '}
                  <strong className='text-blue-600 font-bold'>
                    {totals.totalQty}
                  </strong>{' '}
                  kiện
                </span>
                <span>&bull;</span>
                <span>
                  Tổng tải:{' '}
                  <strong className='text-slate-800 dark:text-slate-200'>
                    {formatWeight(totals.totalWeight)}
                  </strong>{' '}
                  kg
                </span>
              </div>
            )
          ) : (
            <div className='flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300'>
              <span>
                Tổng đơn đi tiếp:{' '}
                <strong className='text-slate-900 dark:text-white'>
                  {outboundBreakdown.allOutboundLines.length}
                </strong>
              </span>
              <span>&bull;</span>
              <span>
                Xuất mới từ kho:{' '}
                <strong className='text-blue-600 font-bold'>
                  {outboundBreakdown.hubOutboundLines.length}
                </strong>{' '}
                đơn
              </span>
              <span>&bull;</span>
              <span>
                Trung chuyển tiếp:{' '}
                <strong className='text-slate-700 dark:text-slate-300'>
                  {outboundBreakdown.transitLines.length}
                </strong>{' '}
                đơn
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className='flex items-center gap-2'>
            {currentStep === 1 ? (
              <>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={onClose}
                  disabled={isSaving || isConfirming}
                  className='h-7 text-xs font-semibold border-slate-300'
                >
                  Đóng
                </Button>

                {!effectiveReadOnly && !manifestPending && isTallyMode && (
                  <Button
                    type='button'
                    onClick={handleConfirmTally}
                    disabled={isConfirming || tallySummary.selected === 0}
                    className='h-7 bg-[#0F3D62] hover:bg-[#0c314f] text-white px-2.5 font-bold shadow-xs text-xs'
                    title='Xác nhận nhập kho các dòng hàng đã chọn dỡ tại kho này'
                  >
                    {isConfirming ? (
                      <>
                        <IconLoader2 className='mr-1 h-3.5 w-3.5 animate-spin' />{' '}
                        Đang nhập kho...
                      </>
                    ) : (
                      <>
                        <IconCircleCheck className='mr-1 h-3.5 w-3.5 text-emerald-400' />{' '}
                        Xác nhận nhập kho ({tallySummary.selected} dòng)
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
                      className='h-7 text-xs font-semibold border-slate-300 dark:border-slate-700 text-slate-700 hover:text-blue-700'
                    >
                      {isSaving ? (
                        <>
                          <IconLoader2 className='mr-1 h-3.5 w-3.5 animate-spin' />{' '}
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <IconDeviceFloppy className='mr-1 h-3.5 w-3.5 text-blue-600' />{' '}
                          Lưu thay đổi
                        </>
                      )}
                    </Button>

                    <Button
                      type='button'
                      onClick={handleConfirmInbound}
                      disabled={isSaving || isConfirming || rows.length === 0}
                      className='h-7 bg-[#0F3D62] hover:bg-[#0c314f] text-white px-2.5 font-bold shadow-xs text-xs'
                    >
                      {isConfirming ? (
                        <>
                          <IconLoader2 className='mr-1 h-3.5 w-3.5 animate-spin' />{' '}
                          Đang nhập kho...
                        </>
                      ) : (
                        <>
                          <IconCircleCheck className='mr-1 h-3.5 w-3.5 text-emerald-400' />{' '}
                          Xác nhận nhập kho
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Primary forward transition to Step 2 */}
                <Button
                  type='button'
                  onClick={() => setCurrentStep(2)}
                  className='h-7 bg-blue-600 hover:bg-blue-700 text-white px-2.5 font-bold shadow-xs text-xs'
                >
                  <IconArrowRight className='mr-1 h-3.5 w-3.5' /> Tiếp theo: Xuất
                  hàng mới vào trip
                </Button>

                {/* Skip option */}
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleSkipAndFinish}
                  className='h-7 text-xs font-semibold border-slate-300 text-slate-600 hover:text-slate-900'
                  title='Hoàn tất trạm và cho xe tiếp tục hành trình mà không xuất thêm hàng'
                >
                  Bỏ qua xuất mới & Hoàn tất
                </Button>
              </>
            ) : (
              /* STEP 2 ACTIONS */
              <>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentStep(1)}
                  className='h-7 text-xs font-semibold border-slate-300'
                >
                  <IconArrowLeft className='mr-1 h-3.5 w-3.5' /> Quay lại Bước 1
                </Button>

                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={handleSkipOutboundAndFinish}
                  className='h-7 text-xs text-slate-600 hover:text-slate-900'
                >
                  Bỏ qua bước này (Không xuất thêm)
                </Button>

                <Button
                  type='button'
                  onClick={handleConfirmOutboundStep}
                  className='h-7 bg-[#0F3D62] hover:bg-[#0c314f] text-white px-2.5 font-bold shadow-xs text-xs'
                >
                  <IconDeviceFloppy className='mr-1 h-3.5 w-3.5 text-blue-400' />{' '}
                  Xác nhận xuất hàng lên trip
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Append Order Modal (Roadside Inbound) */}
        {isAppendModalOpen && tripGroup && (
          <WarehouseAppendOrderModal
            isOpen={isAppendModalOpen}
            onClose={() => setIsAppendModalOpen(false)}
            tripCode={tripGroup.tripCode}
            licensePlate={licensePlate || tripGroup.licensePlate}
            mode={appendModalMode}
            downstreamHubs={manifest?.stops.map((s) => ({
              id: s.hubId,
              name: s.hubName,
            }))}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: tripManifestKeys.all,
              });
              queryClient.invalidateQueries({
                queryKey: ['warehouse', 'inbound-trips'],
              });
              queryClient.invalidateQueries({
                queryKey: ['warehouse', 'available-outbound-orders'],
              });
              onSuccess?.();
            }}
          />
        )}

        {/* Select Stored Orders Modal (Outbound from Warehouse) */}
        {isSelectStoredModalOpen && tripGroup && (
          <WarehouseSelectStoredOrdersModal
            isOpen={isSelectStoredModalOpen}
            onClose={() => setIsSelectStoredModalOpen(false)}
            tripCode={tripGroup.tripCode}
            licensePlate={licensePlate || tripGroup.licensePlate}
            hubId={manifest?.currentHubId || user?.hubId || user?.hub?.id}
            downstreamHubs={manifest?.stops.map((s) => ({
              id: s.hubId,
              name: s.hubName,
            }))}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: tripManifestKeys.all,
              });
              queryClient.invalidateQueries({
                queryKey: ['warehouse', 'inbound-trips'],
              });
              queryClient.invalidateQueries({
                queryKey: ['warehouse', 'available-outbound-orders'],
              });
              queryClient.invalidateQueries({
                queryKey: ['warehouse', 'orders'],
              });
              queryClient.invalidateQueries({
                queryKey: ['warehouse', 'kpi'],
              });
              onSuccess?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
