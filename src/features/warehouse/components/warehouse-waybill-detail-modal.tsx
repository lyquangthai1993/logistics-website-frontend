'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  IconBuildingWarehouse,
  IconTruck,
  IconPrinter,
  IconCopy,
  IconCheck,
  IconPackage,
  IconX,
  IconCircleCheck,
  IconHistory,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { PalletLabelA4Modal, PalletLabelData } from './pallet-label-a4-modal';
import { tokenManager } from '@/lib/token-manager';
import { IconShieldLock, IconTrash, IconRotate, IconAlertTriangle, IconLoader2, IconPencil } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';

export interface OrderInventoryTransaction {
  id: number;
  orderId: number;
  type: 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'ADJUSTMENT' | string;
  quantity: number;
  remainingQuantity: number;
  weight?: number;
  volume?: number;
  licensePlate?: string | null;
  driverName?: string | null;
  destination?: string | null;
  performedByUserId?: number | null;
  notes?: string | null;
  createdAt: string | Date;
}

export interface WaybillDetailData {
  id: number;
  orderCode: string;
  senderName?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  province?: string | null;
  accompanyingDocs?: string | null;
  deliveryMode?: 'DIRECT_CUSTOMER' | 'HUB_L1' | 'XE_BO' | string;
  destinationHub?: string;
  destinationHubId?: number | null;
  destinationHubEntity?: { id?: number; name?: string; code?: string; level?: number; city?: string | null };
  originalDestination?: string;
  originHub?: string;
  originHubId?: number | null;
  originHubEntity?: { id?: number; name?: string; code?: string };
  /** Warehouse currently holding the goods (null while on a vehicle). */
  currentHubEntity?: { id?: number; name?: string; code?: string } | null;
  /** Current active trip code carrying this cargo */
  currentTripCode?: string | null;
  route?: string;
  goodsDescription?: string;
  totalQuantity?: number;
  inboundQuantity?: number;
  outboundQuantity?: number;
  remainingQuantity?: number;
  totalWeight?: number;
  totalVolume?: number;
  notes?: string;
  externalNote?: string;
  status: string;
  inboundType?: 'CUSTOMER' | 'TRANSFER' | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  vehicleLicensePlate?: string;
  driverName?: string;
  createdBy?: {
    fullName?: string;
    hub?: { name?: string };
  };
  trips?: any[];
  trip?: {
    id?: number;
    licensePlate?: string;
    driverName?: string;
    driverPhone?: string;
  };
  inventoryTransactions?: OrderInventoryTransaction[];
}

interface WarehouseWaybillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  waybill: WaybillDetailData | null;
  onStartTally?: (waybill: WaybillDetailData) => void;
  onPrintLabel?: (waybill: WaybillDetailData) => void;
  onSuccess?: () => void;
}

function getWaybillStatusBadge(status: string) {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'INBOUND':
    case 'STORED':
    case 'LUU_KHO':
    case 'IN_WAREHOUSE':
      return (
        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold border-0 text-xs px-3 py-1 shadow-xs">
          LƯU KHO
        </Badge>
      );
    case 'DRAFT':
      return (
        <Badge className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold border-0 text-xs px-3 py-1 shadow-xs">
          ĐƠN NHÁP
        </Badge>
      );
    case 'PENDING':
    case 'PENDING_INBOUND':
    case 'WAITING':
      return (
        <Badge className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold border-0 text-xs px-3 py-1 shadow-xs">
          CHỜ NHẬP KHO
        </Badge>
      );
    case 'COMPLETED_INBOUND':
    case 'OUT_FOR_DELIVERY':
      return (
        <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold border-0 text-xs px-3 py-1 shadow-xs">
          ĐÃ XUẤT KHO
        </Badge>
      );
    case 'DELIVERED':
    case 'COMPLETED':
    case 'COMPLETED_OUTBOUND':
      return (
        <Badge className="bg-green-600 hover:bg-green-700 text-white font-bold border-0 text-xs px-3 py-1 shadow-xs">
          ĐÃ HOÀN THÀNH
        </Badge>
      );
    case 'IN_TRANSIT':
      return (
        <Badge className="bg-sky-500 hover:bg-sky-600 text-white font-bold border-0 text-xs px-3 py-1 shadow-xs">
          ĐANG VẬN CHUYỂN
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-500 text-white font-bold border-0 text-xs px-3 py-1">
          {status}
        </Badge>
      );
  }
}

export function WarehouseWaybillDetailModal({
  isOpen,
  onClose,
  waybill,
  onPrintLabel,
  onSuccess,
}: WarehouseWaybillDetailModalProps) {
  const user = useAuthStore((state) => state.user);
  const [copied, setCopied] = useState(false);
  const [previewLabelData, setPreviewLabelData] = useState<PalletLabelData | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Server state containing all transactions (including soft-deleted) & reactive order balance
  const [serverData, setServerData] = useState<{
    userRole?: string | null;
    order?: {
      id: number;
      orderCode: string;
      totalQuantity: number;
      inboundQuantity: number;
      outboundQuantity: number;
      remainingQuantity: number;
      status: string;
    };
    transactions?: any[];
  } | null>(null);

  const isSuperAdmin = Boolean(
    user?.role === 'SUPER_ADMIN' ||
      Number((user?.role as any)?.id) === 1 ||
      String((user?.role as any)?.name || user?.role || '')
        .toUpperCase()
        .replace(/\s+/g, '_') === 'SUPER_ADMIN' ||
      String((user?.role as any)?.name || user?.role || '').toUpperCase() === 'ADMIN' ||
      serverData?.userRole === 'SUPER_ADMIN',
  );

  // Inline quantity edit state for Super Admin (click pencil icon on transaction line)
  const [editingTx, setEditingTx] = useState<{
    id: number;
    quantity: string;
    reason: string;
    isSaving: boolean;
  } | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // Super Admin Action Modal (Delete / Restore)
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'DELETE' | 'RESTORE';
    tx: any | null;
    reason: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    type: 'DELETE',
    tx: null,
    reason: '',
    isSubmitting: false,
  });

  const reloadData = useCallback(async () => {
    if (!waybill?.orderCode) return;
    const token = tokenManager.getAccessToken();
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    try {
      setIsLoadingTransactions(true);
      // 1. Fetch transactions & dynamic balances
      const txRes = await fetch(
        `/api/v1/warehouse/orders/${encodeURIComponent(waybill.orderCode)}/transactions`,
        { headers },
      );
      if (txRes.ok) {
        const txData = await txRes.json();
        setServerData(txData?.data ?? txData);
      }

      // 2. Fetch activity logs
      const logRes = await fetch(
        `/api/v1/orders/code/${encodeURIComponent(waybill.orderCode)}/activity-logs`,
        { headers },
      );
      if (logRes.ok) {
        const logData = await logRes.json();
        const logs = logData?.data ?? logData; setActivityLogs(Array.isArray(logs) ? logs : []);
      }
    } catch (err) {
      console.error('Failed to reload waybill data:', err);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [waybill?.orderCode]);

  const handleOpenActionModal = (type: 'DELETE' | 'RESTORE', tx: any) => {
    setActionModal({
      isOpen: true,
      type,
      tx,
      reason:
        type === 'DELETE'
          ? 'Xóa bớt dòng nhập/xuất kho do thao tác thừa hoặc nhập nhầm số lượng'
          : 'Khôi phục dòng giao dịch kho đã xóa trước đó',
      isSubmitting: false,
    });
  };

  const handleExecuteAction = async () => {
    if (!actionModal.tx) return;
    if (!actionModal.reason.trim()) {
      toast.error('Vui lòng nhập lý do điều chỉnh!');
      return;
    }

    setActionModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const token = tokenManager.getAccessToken();
      const isDelete = actionModal.type === 'DELETE';
      const endpoint = isDelete
        ? `/api/v1/warehouse/transactions/${actionModal.tx.id}`
        : `/api/v1/warehouse/transactions/${actionModal.tx.id}/restore`;
      const method = isDelete ? 'DELETE' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: actionModal.reason.trim() }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData?.message || 'Có lỗi xảy ra khi thực hiện thao tác.');
      }

      toast.success(
        isDelete
          ? 'Đã xóa dòng giao dịch và cân bằng tồn kho thành công (ACID)!'
          : 'Đã hoàn tác dòng giao dịch và cân bằng tồn kho thành công (ACID)!'
      );

      setActionModal({
        isOpen: false,
        type: 'DELETE',
        tx: null,
        reason: '',
        isSubmitting: false,
      });

      await reloadData();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Thao tác thất bại.');
      setActionModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleStartEditQuantity = (tx: any) => {
    setEditingTx({
      id: Number(tx.id),
      quantity: String(tx.quantity ?? 1),
      reason: 'Admin điều chỉnh số lượng kiện giao dịch kho',
      isSaving: false,
    });
  };

  const handleCancelEditQuantity = () => {
    if (editingTx?.isSaving) return;
    setEditingTx(null);
  };

  const handleSaveEditQuantity = async (tx: any) => {
    if (!editingTx || editingTx.id !== Number(tx.id)) return;
    const parsedQty = Number(editingTx.quantity);
    if (!Number.isFinite(parsedQty) || parsedQty < 1 || !Number.isInteger(parsedQty)) {
      toast.error('Số lượng kiện điều chỉnh phải là số nguyên lớn hơn hoặc bằng 1!');
      return;
    }
    if (parsedQty === Number(tx.quantity)) {
      setEditingTx(null);
      return;
    }

    setEditingTx((prev) => (prev ? { ...prev, isSaving: true } : null));
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/warehouse/transactions/${tx.id}/quantity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          quantity: parsedQty,
          reason: editingTx.reason.trim() || 'Admin điều chỉnh số lượng kiện giao dịch kho',
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          resData?.message || resData?.errors?.message || 'Không thể điều chỉnh số lượng kiện.',
        );
      }

      toast.success(
        resData?.data?.message ||
          resData?.message ||
          `Đã điều chỉnh số lượng kiện (${tx.quantity} → ${parsedQty} kiện) và cân bằng tồn kho thành công!`,
      );
      setEditingTx(null);
      await reloadData();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Điều chỉnh số lượng kiện thất bại.');
      setEditingTx((prev) => (prev ? { ...prev, isSaving: false } : null));
    }
  };

  useEffect(() => {
    if (isOpen && waybill?.orderCode) {
      setEditingTx(null);
      reloadData();
    } else if (!isOpen) {
      setServerData(null);
      setEditingTx(null);
    }
  }, [isOpen, waybill?.orderCode, reloadData]);

  const formatDateTime = (dateValue?: string | Date) => {
    if (!dateValue) return '--';
    try {
      const d = new Date(dateValue);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateValue);
    }
  };

  // Chronological inventory transactions with computed running balance
  const transactions: (OrderInventoryTransaction & { cumulativeStock?: number })[] = React.useMemo(() => {
    let rawList: OrderInventoryTransaction[] = [];
    if (waybill?.inventoryTransactions && waybill.inventoryTransactions.length > 0) {
      rawList = [...waybill.inventoryTransactions].sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }

    // Graceful fallback for legacy records without transaction rows
    const fallback: OrderInventoryTransaction[] = [];
    const inboundQty = waybill?.inboundQuantity ?? waybill?.totalQuantity ?? 1;
    const remainingQty = waybill?.remainingQuantity ?? waybill?.totalQuantity ?? 1;
    const outboundQty = waybill?.outboundQuantity ?? 0;

    fallback.push({
      id: 1,
      orderId: waybill?.id || 0,
      type: 'INBOUND',
      quantity: inboundQty,
      remainingQuantity: inboundQty,
      weight: waybill?.totalWeight || 0,
      volume: waybill?.totalVolume || 0,
      licensePlate: waybill?.vehicleLicensePlate || null,
      driverName: waybill?.driverName || null,
      destination: waybill?.destinationHub || waybill?.province || 'Kho nhận',
      notes: 'Tiếp nhận nhập kho ban đầu',
      createdAt: waybill?.createdAt || new Date(),
    });

    if (outboundQty > 0) {
      fallback.push({
        id: 2,
        orderId: waybill?.id || 0,
        type: 'OUTBOUND',
        quantity: outboundQty,
        remainingQuantity: remainingQty,
        weight: 0,
        volume: 0,
        licensePlate: null,
        driverName: null,
        destination: waybill?.deliveryAddress || waybill?.destinationHub || 'Giao khách',
        notes: `Đã xuất ${outboundQty} kiện`,
        createdAt: waybill?.updatedAt || new Date(),
      });
    }

    let running = 0;
    const listToProcess = rawList.length > 0 ? rawList : fallback;
    return listToProcess.map((tx) => {
      const isIn = tx.type === 'INBOUND';
      const q = Number(tx.quantity) || 0;
      if (isIn) {
        running += q;
      } else {
        running = Math.max(0, running - q);
      }
      return {
        ...tx,
        cumulativeStock: running,
      };
    });
  }, [waybill]);

  const effectiveInboundQty =
    serverData?.order?.inboundQuantity ??
    waybill?.inboundQuantity ??
    waybill?.totalQuantity ??
    0;
  const effectiveOutboundQty =
    serverData?.order?.outboundQuantity ?? waybill?.outboundQuantity ?? 0;
  const effectiveRemainingQty =
    serverData?.order?.remainingQuantity ??
    waybill?.remainingQuantity ??
    waybill?.totalQuantity ??
    0;
  const effectiveStatus =
    serverData?.order?.status ?? waybill?.status ?? 'STORED';

  const displayTransactions: any[] = useMemo(() => {
    if (serverData?.transactions && serverData.transactions.length > 0) {
      return serverData.transactions;
    }
    return transactions;
  }, [serverData?.transactions, transactions]);

  if (!waybill) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(waybill.orderCode);
    setCopied(true);
    toast.success('Đã sao chép mã vận đơn!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPreviewLabel = () => {
    if (onPrintLabel) {
      onPrintLabel(waybill);
    } else {
      setPreviewLabelData({
        orderCode: waybill.orderCode,
        goodsDescription: waybill.goodsDescription || 'HÀNG HÓA TIẾP NHẬN',
        totalQuantity: waybill.totalQuantity || 1,
        packagesOnPallet: waybill.totalQuantity || 1,
        palletIndex: 1,
        totalPallets: 1,
        originHub: waybill.pickupAddress || waybill.originHub,
        destinationHub: waybill.deliveryAddress || waybill.destinationHub,
        province: waybill.province || waybill.destinationHubEntity?.city || waybill.destinationHub,
        destinationHubEntity: waybill.destinationHubEntity,
        warehouseName: waybill.currentHubEntity?.name,
        createdAt: waybill.createdAt,
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent showCloseButton={false} className="sm:max-w-[96vw] w-[96vw] max-w-[96vw] p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
          {/* ── Compact Header Bar ── */}
          <div className="bg-[#0F3D62] text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconBuildingWarehouse className="h-5 w-5 text-blue-300" />
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  Chi tiết đơn hàng tiếp nhận kho
                  <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-xs">
                    {waybill.orderCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-all text-xs flex items-center gap-1 font-mono cursor-pointer"
                    title="Sao chép mã"
                  >
                    {copied ? (
                      <IconCheck className="h-3.5 w-3.5 text-emerald-300" />
                    ) : (
                      <IconCopy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getWaybillStatusBadge(waybill.status)}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full"
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Scrollable Body Structured Like Inbound Create Form ── */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
            {/* ── Lịch Sử Hàng Hóa & Biến Động Kho ── */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <IconHistory className="h-5 w-5 text-[#0F3D62] dark:text-blue-400" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    Lịch sử hàng hóa & Biến động kho
                  </h3>
                </div>
                <Badge variant="outline" className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Mã đơn: <span className="font-mono text-[#0F3D62] dark:text-blue-400 ml-1">{waybill.orderCode}</span>
                </Badge>
              </div>

              {/* 1. Bảng Thống Kê Nhập - Xuất - Tồn Chi Tiết (Stat Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tổng Nhập */}
                <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-400 block">
                      Tổng đã nhập
                    </span>
                    <span className="text-xl font-black text-blue-900 dark:text-blue-200 font-mono">
                      {effectiveInboundQty}
                    </span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-300 ml-1">kiện</span>
                  </div>
                  <IconTruck className="h-7 w-7 text-blue-400/80 shrink-0" />
                </div>

                {/* Đã Xuất */}
                <div className="p-3 rounded-lg bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-purple-700 dark:text-purple-400 block">
                      Tổng đã xuất
                    </span>
                    <span className="text-xl font-black text-purple-900 dark:text-purple-200 font-mono">
                      {effectiveOutboundQty}
                    </span>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 ml-1">kiện</span>
                  </div>
                  <IconTruck className="h-7 w-7 text-purple-400/80 shrink-0" />
                </div>

                {/* Tồn Kho Khả Dụng */}
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-300 block">
                      Tồn kho khả dụng
                    </span>
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                      {effectiveRemainingQty}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 ml-1">kiện</span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0">
                    <IconCircleCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* 2. Dòng Thời Gian Lịch Sử Biến Động Hàng Hóa (Transaction Ledger) */}
              <div className="pt-2">
                <div className="space-y-0">
                  {displayTransactions.map((tx: any, idx: number) => {
                    const isDeleted = Boolean(tx.isDeleted || tx.deletedAt);
                    const isInbound = tx.type === 'INBOUND';
                    const isTransfer = tx.type === 'TRANSFER';
                    const outboundOrderNum = displayTransactions
                      .slice(0, idx + 1)
                      .filter((t: any) => t.type !== 'INBOUND' && !t.isDeleted && !t.deletedAt).length;

                    return (
                      <div key={tx.id || idx} className="relative flex items-stretch gap-3">
                        {/* Cột timeline: Vòng tròn số thứ tự và đường line dọc đồng tâm tuyệt đối */}
                        <div className="flex flex-col items-center shrink-0 w-6">
                          <div
                            className={`z-10 flex items-center justify-center shrink-0 h-6 w-6 rounded-full text-white text-[11px] font-black shadow-xs ring-4 ring-white dark:ring-slate-900 ${
                              isDeleted ? 'bg-rose-500 line-through' : 'bg-[#0F3D62]'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div className="w-0.5 bg-slate-200 dark:bg-slate-700 flex-1" />
                        </div>

                        {/* Cột nội dung biến động */}
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-xs font-black ${
                                  isDeleted
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {isInbound
                                  ? 'Tiếp nhận nhập kho ban đầu'
                                  : isTransfer
                                  ? `Xuất luân chuyển liên Hub (Đợt ${outboundOrderNum || 1})`
                                  : `Xuất kho giao hàng (Đợt ${outboundOrderNum || 1})`}
                              </span>

                              {isDeleted ? (
                                <Badge className="text-[10px] font-bold border-0 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  ❌ ĐÃ XÓA / ĐÃ HỦY DÒNG
                                </Badge>
                              ) : (
                                <Badge
                                  className={`text-[10px] font-bold border-0 ${
                                    isInbound
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                                      : isTransfer
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                                  }`}
                                >
                                  {isInbound
                                    ? `+${tx.quantity} kiện`
                                    : `-${tx.quantity} kiện`}
                                </Badge>
                              )}

                              <span className="text-[11px] text-slate-400 font-mono">
                                {formatDateTime(tx.createdAt)}
                              </span>
                            </div>

                            {/* ── Nút CTA Thao Tác Cho SUPER ADMIN ── */}
                            {isSuperAdmin && tx.id && (
                              <div className="flex items-center gap-1.5">
                                {isDeleted ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenActionModal('RESTORE', tx)}
                                    className="h-6 px-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer shadow-2xs"
                                    title="Chỉ Super Admin: Hoàn tác lại dòng giao dịch này và cộng lại tồn kho"
                                  >
                                    <IconRotate className="h-3 w-3 mr-1 text-emerald-600" />
                                    Hoàn tác dòng xóa
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenActionModal('DELETE', tx)}
                                    className="h-6 px-2 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 cursor-pointer shadow-2xs"
                                    title="Chỉ Super Admin: Xóa bớt dòng này và tự động trừ/cân bằng tồn kho"
                                  >
                                    <IconTrash className="h-3 w-3 mr-1 text-rose-600" />
                                    Xóa bớt dòng
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          <div
                            className={`mt-1 text-xs p-2.5 rounded-lg border space-y-1 ${
                              isDeleted
                                ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/80 dark:border-rose-900/60 text-slate-400 dark:text-slate-500'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {isInbound ? 'Số lượng nhập: ' : 'Số lượng xuất: '}
                                </span>
                                {isSuperAdmin && !isDeleted && tx.id && editingTx?.id === Number(tx.id) ? (
                                  <div className="inline-flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-md border border-blue-300 dark:border-blue-700 shadow-2xs">
                                    <Input
                                      type="number"
                                      min={1}
                                      step={1}
                                      data-testid={`input-edit-tx-qty-${tx.id}`}
                                      value={editingTx.quantity}
                                      onChange={(e) =>
                                        setEditingTx((prev) =>
                                          prev ? { ...prev, quantity: e.target.value } : null,
                                        )
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSaveEditQuantity(tx);
                                        } else if (e.key === 'Escape') {
                                          e.preventDefault();
                                          handleCancelEditQuantity();
                                        }
                                      }}
                                      disabled={editingTx.isSaving}
                                      className="h-7 w-20 px-2 text-xs font-mono font-black text-blue-700 dark:text-blue-300 text-center"
                                      autoFocus
                                    />
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                      kiện
                                    </span>
                                    <Textarea
                                      rows={2}
                                      data-testid={`input-edit-tx-reason-${tx.id}`}
                                      value={editingTx.reason}
                                      onChange={(e) =>
                                        setEditingTx((prev) =>
                                          prev ? { ...prev, reason: e.target.value } : null,
                                        )
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleSaveEditQuantity(tx);
                                        } else if (e.key === 'Escape') {
                                          e.preventDefault();
                                          handleCancelEditQuantity();
                                        }
                                      }}
                                      disabled={editingTx.isSaving}
                                      placeholder="Nhập lý do điều chỉnh..."
                                      className="min-h-10.5 w-52 sm:w-64 px-2 py-1 text-[11px] resize-y"
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      data-testid={`btn-save-tx-qty-${tx.id}`}
                                      onClick={() => handleSaveEditQuantity(tx)}
                                      disabled={editingTx.isSaving}
                                      className="h-7 px-2.5 text-[11px] font-bold bg-[#0F3D62] hover:bg-[#0c314f] text-white cursor-pointer"
                                    >
                                      {editingTx.isSaving ? (
                                        <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <>
                                          <IconCheck className="h-3.5 w-3.5 mr-1" />
                                          Lưu
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      data-testid={`btn-cancel-tx-qty-${tx.id}`}
                                      onClick={handleCancelEditQuantity}
                                      disabled={editingTx.isSaving}
                                      className="h-7 px-2 text-[11px] cursor-pointer"
                                    >
                                      <IconX className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <span
                                      data-testid={`tx-qty-display-${tx.id}`}
                                      className={`font-black font-mono ${
                                        isDeleted
                                          ? 'line-through text-slate-400'
                                          : isInbound
                                          ? 'text-blue-700 dark:text-blue-400'
                                          : 'text-purple-700 dark:text-purple-400'
                                      }`}
                                    >
                                      {isInbound ? `+${tx.quantity}` : `-${tx.quantity}`} kiện
                                    </span>
                                    {isSuperAdmin && !isDeleted && tx.id && (
                                      <button
                                        type="button"
                                        data-testid={`btn-edit-tx-qty-${tx.id}`}
                                        onClick={() => handleStartEditQuantity(tx)}
                                        className="inline-flex items-center justify-center h-5 w-5 rounded border border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100 hover:border-blue-300 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 cursor-pointer transition-colors"
                                        title="Chỉ Super Admin: Click để điều chỉnh số lượng kiện của dòng giao dịch này"
                                      >
                                        <IconPencil className="h-3 w-3" />
                                      </button>
                                    )}
                                  </>
                                )}
                                {(tx.weight || tx.volume) ? (
                                  <span className="text-slate-500 ml-1 font-mono text-[11px]">
                                    ({tx.weight ? `${Number(tx.weight).toLocaleString('vi-VN')} kg` : ''}
                                    {tx.weight && tx.volume ? ' · ' : ''}
                                    {tx.volume ? `${tx.volume} CBM` : ''})
                                  </span>
                                ) : null}
                              </div>

                              {!isDeleted && (
                                <div className="text-[11px] font-bold">
                                  <span className="text-slate-500">Tồn sau thao tác: </span>
                                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                                    {tx.cumulativeStock ?? tx.remainingQuantity} kiện
                                  </span>
                                </div>
                              )}
                            </div>

                            {(tx.licensePlate || tx.driverName) && (
                              <div className="text-[11px]">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {isInbound ? 'Xe chở vào: ' : 'Xe vận chuyển: '}
                                </span>
                                <span className="font-mono font-bold text-[#0F3D62] dark:text-blue-400">
                                  {tx.licensePlate || '--'}
                                </span>
                                {tx.driverName && (
                                  <span className="ml-1 text-slate-500">
                                    (Tài xế: {tx.driverName})
                                  </span>
                                )}
                              </div>
                            )}

                            {tx.hubName && (
                              <div className="text-[11px]">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Hub thao tác: </span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{tx.hubName}</span>
                              </div>
                            )}

                            {tx.destination && (
                              <div className="text-[11px]">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  Đích đến:{' '}
                                </span>
                                <span>{tx.destination}</span>
                              </div>
                            )}

                            {tx.notes && (
                              <div className="text-[11px] text-slate-500 italic">
                                <span>Ghi chú: {tx.notes}</span>
                              </div>
                            )}

                            {isDeleted && tx.deletedAt && (
                              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold pt-0.5">
                                Đã xóa vào lúc: {formatDateTime(tx.deletedAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Trạng thái tồn kho / vận chuyển hiện tại */}
                  {(() => {
                    const currentWarehouseName =
                      waybill.currentHubEntity?.name ||
                      waybill.originHubEntity?.name ||
                      (waybill.originHub &&
                      !waybill.originHub.toUpperCase().includes('TÂY NINH') &&
                      waybill.originHub !== waybill.pickupAddress
                        ? waybill.originHub
                        : '') ||
                      'Kho lưu trữ';

                    const latestOutboundTx = displayTransactions.find(
                      (tx: any) =>
                        !tx.isDeleted &&
                        !tx.deletedAt &&
                        (tx.type === 'TRANSFER' || tx.type === 'OUTBOUND'),
                    );
                    const activeTrip = waybill.trip || waybill.trips?.[0];
                    const vehiclePlate = (
                      waybill.vehicleLicensePlate ||
                      latestOutboundTx?.licensePlate ||
                      activeTrip?.licensePlate ||
                      '—'
                    ).trim();
                    const tripCode = (
                      waybill.currentTripCode ||
                      activeTrip?.tripCode ||
                      (activeTrip?.id ? `TRIP-${activeTrip.id}` : '') ||
                      '—'
                    ).trim();
                    const destName =
                      waybill.originalDestination ||
                      waybill.destinationHubEntity?.name ||
                      waybill.destinationHub ||
                      latestOutboundTx?.destination ||
                      '';

                    const isFullyDispatched =
                      effectiveRemainingQty === 0 && effectiveOutboundQty > 0;
                    const isPartialDispatched =
                      effectiveOutboundQty > 0 && effectiveRemainingQty > 0;
                    const isInTransit =
                      effectiveStatus === 'IN_TRANSIT' ||
                      effectiveStatus === 'DISPATCHED' ||
                      isFullyDispatched;

                    if (isInTransit) {
                      return (
                        <div className="relative flex items-start gap-3">
                          <div className="flex flex-col items-center shrink-0 w-6">
                            <div className="z-10 flex items-center justify-center shrink-0 h-6 w-6 rounded-full bg-blue-600 text-white shadow-xs ring-4 ring-white dark:ring-slate-900">
                              <IconTruck className="h-3.5 w-3.5" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs">
                            <span className="font-bold text-blue-900 dark:text-blue-300">
                              Đang trên xe <strong className="font-mono text-[#0F3D62] dark:text-blue-200 uppercase">{vehiclePlate}</strong>, chuyến xe <strong className="font-mono text-[#0F3D62] dark:text-blue-200">{tripCode}</strong>
                              {destName ? ` · Đang vận chuyển đến ${destName}` : ''}
                            </span>
                            <span className="font-mono font-black text-blue-700 dark:text-blue-400">
                              {effectiveOutboundQty} kiện trên xe
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (isPartialDispatched) {
                      return (
                        <div className="relative flex items-start gap-3">
                          <div className="flex flex-col items-center shrink-0 w-6">
                            <div className="z-10 flex items-center justify-center shrink-0 h-6 w-6 rounded-full bg-amber-500 text-white shadow-xs ring-4 ring-white dark:ring-slate-900">
                              <IconTruck className="h-3.5 w-3.5" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs">
                            <span className="font-bold text-amber-900 dark:text-amber-300">
                              Đang xuất từng phần · Còn tồn {effectiveRemainingQty} kiện tại {currentWarehouseName} · Đã xuất {effectiveOutboundQty} kiện trên xe {vehiclePlate} ({tripCode})
                            </span>
                            <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                              Tồn: {effectiveRemainingQty} kiện
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="relative flex items-start gap-3">
                        <div className="flex flex-col items-center shrink-0 w-6">
                          <div className="z-10 flex items-center justify-center shrink-0 h-6 w-6 rounded-full bg-emerald-600 text-white shadow-xs ring-4 ring-white dark:ring-slate-900">
                            <IconCheck className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">
                            Đang lưu kho an toàn tại {currentWarehouseName} · Tồn khả dụng sẵn sàng xuất
                          </span>
                          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                            {effectiveRemainingQty} kiện
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* ── Nhật Ký Thao Tác & Sửa Đổi Của Người Dùng (Audit Logs) ── */}
            {activityLogs.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <IconShieldLock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                      Nhật ký thao tác & Thay đổi dữ liệu
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-slate-500 font-mono">
                    {activityLogs.length} thao tác ghi nhận
                  </Badge>
                </div>

                <div className="space-y-2">
                  {activityLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-[10px] font-bold border-0 ${
                              log.action === 'TRIP_ROLLBACK'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                                : log.action === 'DATA_RECONCILED'
                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                : log.action === 'TRANSACTION_DELETED'
                                ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                                : log.action === 'TRANSACTION_RESTORED'
                                ? 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300'
                                : log.action === 'TRANSACTION_UPDATED'
                                ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300'
                                : log.action === 'DRAFT_CANCELLED'
                                ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {log.action}
                          </Badge>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {log.actorName || log.actorUsername || (log.actorEmail ? log.actorEmail.split('@')[0] : 'Hệ thống')}
                          </span>
                          {log.actorRole && (
                            <span className="text-[10px] text-slate-400 font-mono">({log.actorRole})</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>

                      {log.reason && (
                        <div className="text-slate-600 dark:text-slate-400">
                          <span className="font-semibold">Lý do: </span>
                          <span>{log.reason}</span>
                        </div>
                      )}

                      {log.oldValues && log.newValues && (
                        <div className="font-mono text-[11px] text-slate-500 bg-white dark:bg-slate-900/60 p-1.5 rounded border border-slate-200 dark:border-slate-800 flex flex-wrap gap-x-4">
                          {log.newValues.transactionType && (
                            <span className="text-slate-700 dark:text-slate-300">
                              Giao dịch:{' '}
                              <strong className="font-mono">
                                {log.newValues.transactionType} (
                                {log.newValues.oldQuantity !== undefined &&
                                log.newValues.oldQuantity !== log.newValues.quantity
                                  ? `${log.newValues.oldQuantity} → ${log.newValues.quantity}`
                                  : `${log.newValues.quantity}`}{' '}
                                kiện)
                              </strong>
                            </span>
                          )}
                          {log.oldValues.inboundQuantity !== undefined && (
                            <span>
                              Nhập: <span className="line-through">{log.oldValues.inboundQuantity ?? '--'}</span> → <strong className="text-blue-600">{log.newValues.inboundQuantity ?? '--'}</strong>
                            </span>
                          )}
                          {log.oldValues.outboundQuantity !== undefined && log.oldValues.outboundQuantity !== log.newValues.outboundQuantity && (
                            <span>
                              Xuất: <span className="line-through">{log.oldValues.outboundQuantity ?? '--'}</span> → <strong className="text-purple-600">{log.newValues.outboundQuantity ?? '--'}</strong>
                            </span>
                          )}
                          {log.oldValues.remainingQuantity !== undefined && (
                            <span>
                              Tồn: <span className="line-through">{log.oldValues.remainingQuantity ?? '--'}</span> → <strong className="text-emerald-600">{log.newValues.remainingQuantity ?? '--'}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Bảng Danh Mục Hàng Hóa Vận Đơn (Read-only Table) ── */}
            <div className="bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <IconPackage className="h-4 w-4 text-[#0F3D62] dark:text-blue-400" />
                  <span>Danh mục hàng hóa vận đơn</span>
                </h4>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Tổng số lượng: <span className="font-bold text-[#0F3D62] dark:text-blue-400 font-mono">{serverData?.order?.totalQuantity ?? effectiveInboundQty ?? waybill.totalQuantity ?? 1}</span> · <span className="font-bold font-mono">{(waybill.totalWeight ?? 0).toLocaleString('vi-VN')}</span> kg · <span className="font-bold font-mono">{waybill.totalVolume ?? 0}</span> CBM
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 w-12.5 text-center">STT</th>
                      <th className="py-2.5 px-3 w-37.5">MÃ VẬN ĐƠN</th>
                      <th className="py-2.5 px-3">ĐỊA CHỈ NHẬN HÀNG</th>
                      <th className="py-2.5 px-3">TÊN HÀNG HÓA</th>
                      <th className="py-2.5 px-3 text-right w-22.5">SỐ LƯỢNG</th>
                      <th className="py-2.5 px-3 text-right w-25">SỐ KG</th>
                      <th className="py-2.5 px-3 text-right w-22.5">CBM</th>
                      <th className="py-2.5 px-3">ĐỊA CHỈ GIAO HÀNG</th>
                      <th className="py-2.5 px-3">TỈNH / TP</th>
                      <th className="py-2.5 px-3 text-center w-30">CHỨNG TỪ</th>
                      <th className="py-2.5 px-3 text-center w-30">HÌNH THỨC GIAO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">01</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {waybill.orderCode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {waybill.pickupAddress || waybill.originHub || 'Kho gửi'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {waybill.goodsDescription || 'Hàng hóa tổng quan'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {serverData?.order?.totalQuantity ?? effectiveInboundQty ?? waybill.totalQuantity ?? 1}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {(waybill.totalWeight ?? 0).toLocaleString('vi-VN')} kg
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {waybill.totalVolume ?? 0} CBM
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {waybill.originalDestination ||
                          waybill.destinationHub ||
                          waybill.deliveryAddress ||
                          'Điểm đích'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {waybill.province ? (
                          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 font-bold text-[11px]">
                            {waybill.province}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {waybill.accompanyingDocs && waybill.accompanyingDocs.toUpperCase() !== 'KHÔNG CÓ' ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 font-bold text-[10px]">
                            {waybill.accompanyingDocs}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[10px]">
                            {waybill.accompanyingDocs || 'Không có'}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 dark:bg-slate-800">
                          {waybill.destinationHubEntity?.level === 2 ||
                          waybill.deliveryMode === 'XE_BO' ||
                          /xe\s*bo/i.test(waybill.destinationHub ?? '')
                            ? 'Xe bo'
                            : waybill.deliveryMode === 'HUB_L1' ||
                                waybill.destinationHubEntity?.level === 1 ||
                                !!waybill.destinationHubId
                              ? 'Hub Cấp 1'
                              : 'Giao thẳng'}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {waybill.notes && (
                <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg p-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold">Ghi chú vận đơn:</span> {waybill.notes}
                </div>
              )}
            </div>
          </div>

          {/* ── Dialog Footer (Clean Close & Print Actions) ── */}
          <div className="p-3.5 px-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Trạng thái vận đơn: {getWaybillStatusBadge(effectiveStatus)}
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenPreviewLabel}
                className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-slate-800 h-8"
              >
                <IconPrinter className="mr-1.5 h-4 w-4" /> In tem Pallet A4
              </Button>
              <Button
                type="button"
                onClick={onClose}
                className="bg-[#0F3D62] hover:bg-[#0c314f] text-white text-xs font-bold px-4 h-8"
              >
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Xác Nhận Xóa / Hoàn Tác Giao Dịch Kho (Chỉ Super Admin) ── */}
      <Dialog
        open={actionModal.isOpen}
        onOpenChange={(open) => {
          if (!open && !actionModal.isSubmitting) {
            setActionModal((prev) => ({ ...prev, isOpen: false }));
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl">
          <div
            className={`p-4 text-white flex items-center gap-3 ${
              actionModal.type === 'DELETE' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
          >
            {actionModal.type === 'DELETE' ? (
              <IconTrash className="h-6 w-6 shrink-0" />
            ) : (
              <IconRotate className="h-6 w-6 shrink-0" />
            )}
            <div>
              <h3 className="font-bold text-base">
                {actionModal.type === 'DELETE'
                  ? 'Xác nhận xóa dòng giao dịch kho'
                  : 'Xác nhận hoàn tác dòng giao dịch kho'}
              </h3>
              <p className="text-xs text-white/80">
                Thao tác quản trị cấp cao · Bảo vệ bởi ACID và tự động cân bằng tồn kho
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3 text-xs">
            {actionModal.tx && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Mã vận đơn:</span>
                  <span className="font-bold text-[#0F3D62] dark:text-blue-400">
                    {waybill.orderCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Loại biến động:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {actionModal.tx.type === 'INBOUND'
                      ? 'NHẬP KHO BAN ĐẦU'
                      : actionModal.tx.type === 'TRANSFER'
                      ? 'XUẤT LUÂN CHUYỂN'
                      : 'XUẤT GIAO HÀNG'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Số lượng kiện:</span>
                  <span className="font-black text-rose-600 dark:text-rose-400">
                    {actionModal.tx.quantity} kiện
                  </span>
                </div>
                {actionModal.tx.licensePlate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Biển số xe:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {actionModal.tx.licensePlate}
                    </span>
                  </div>
                )}
                {actionModal.tx.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Thời điểm tạo:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatDateTime(actionModal.tx.createdAt)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Lý do điều chỉnh <span className="text-rose-500">*</span>
              </label>
              <Textarea
                rows={3}
                data-testid="textarea-action-reason"
                value={actionModal.reason}
                onChange={(e) =>
                  setActionModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Nhập lý do điều chỉnh tồn kho (bắt buộc)..."
                className="text-xs min-h-18 resize-y"
                disabled={actionModal.isSubmitting}
                autoFocus
              />
              <p className="text-[11px] text-slate-400 italic">
                Lý do này sẽ được ghi vào nhật ký kiểm toán (Order Activity Log) không thể chỉnh sửa.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setActionModal((prev) => ({ ...prev, isOpen: false }))
              }
              disabled={actionModal.isSubmitting}
              className="text-xs h-8"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExecuteAction}
              disabled={actionModal.isSubmitting || !actionModal.reason.trim()}
              className={`text-xs h-8 font-bold text-white ${
                actionModal.type === 'DELETE'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {actionModal.isSubmitting ? (
                <>
                  <IconLoader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Đang xử lý ACID...
                </>
              ) : actionModal.type === 'DELETE' ? (
                'Xác nhận xóa dòng'
              ) : (
                'Xác nhận hoàn tác dòng'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pallet Label Preview Modal */}
      {previewLabelData && (
        <PalletLabelA4Modal
          isOpen={Boolean(previewLabelData)}
          onClose={() => setPreviewLabelData(null)}
          data={previewLabelData}
        />
      )}
    </>
  );
}
