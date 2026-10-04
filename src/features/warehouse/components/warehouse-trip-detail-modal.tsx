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
  IconDeviceFloppy
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { tokenManager } from '@/lib/token-manager';
import { showApiErrorToast } from '@/lib/api-error';
import { useAuthStore } from '@/stores/use-auth-store';
import { WarehouseEditableGrid, WarehouseRowItem } from './warehouse-editable-grid';
import { renderWarehouseOrderStatusBadge } from './warehouse-tables/columns';
import { formatWeight, formatVolume } from '@/lib/format';

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

  // Auto-resolve read-only mode based on business status (LƯU KHO, Đã xuất kho, etc. cannot be modified)
  const effectiveReadOnly = useMemo(() => {
    if (readOnly || mode === 'OUTBOUND') return true;
    if (!tripGroup) return true;

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
  }, [readOnly, mode, tripGroup]);

  const [receiveDate, setReceiveDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [rows, setRows] = useState<WarehouseRowItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className='max-w-[96vw] xl:max-w-7xl w-full p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-[92vh] flex flex-col'
      >
        {/* Header Bar */}
        <div className='bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0'>
          <div>
            <div className='flex items-center gap-2'>
              <span className='text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800'>
                CHUYẾN XE {tripGroup.tripCode}
              </span>
              <Badge
                variant='outline'
                className={
                  tripGroup.isTransfer
                    ? 'bg-purple-50 text-purple-700 border-purple-300 font-bold text-[10px]'
                    : 'bg-blue-50 text-blue-700 border-blue-300 font-bold text-[10px]'
                }
              >
                {tripGroup.isTransfer ? 'Luân chuyển nội bộ' : 'Khách gửi trực tiếp'}
              </Badge>
              {renderWarehouseOrderStatusBadge(tripGroup.status)}
            </div>
            <h2 className='text-base font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2'>
              <IconBuildingWarehouse className='h-4 w-4 text-[#0F3D62] dark:text-blue-400' />
              <span>
                {effectiveReadOnly
                  ? `Chi tiết chuyến xe ${mode === 'OUTBOUND' ? 'xuất kho' : ''} (Xem thông tin)`
                  : 'Chi tiết chuyến xe & Kiểm đếm hàng hóa'}
              </span>
            </h2>
          </div>

          <div className='flex items-center gap-2'>
            {onOpenReceipt && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => onOpenReceipt(tripGroup)}
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
              <span>
                Chuyến xe đã ở trạng thái{' '}
                <strong>
                  {tripGroup.status === 'INBOUND' || tripGroup.status === 'STORED'
                    ? 'LƯU KHO'
                    : tripGroup.status || 'Chỉ xem'}
                </strong>
                . Dữ liệu đã chốt sổ cái tồn kho, chỉ hỗ trợ xem thông tin và in phiếu.
              </span>
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
                  <span>Bảng kê chi tiết các dòng hàng trên chuyến xe</span>
                </span>
                <span className='text-[11px] text-gray-500'>{rows.length} đơn hàng trên xe</span>
              </div>

              {effectiveReadOnly ? (
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
                          <td colSpan={11} className='py-6 text-center text-slate-400'>
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
        <div className='bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0'>
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

            {!effectiveReadOnly && (
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
                  className='h-8 bg-[#0F3D62] hover:bg-[#0c314f] text-white px-4 font-bold shadow-xs text-xs'
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
      </DialogContent>
    </Dialog>
  );
}
