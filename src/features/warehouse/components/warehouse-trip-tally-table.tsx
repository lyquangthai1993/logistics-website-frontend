'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { IconLock, IconAlertTriangle } from '@tabler/icons-react';
import { formatWeight, formatVolume } from '@/lib/format';
import type { TripManifestLine } from '../api/trip-manifest';

export interface TallyLineState {
  checked: boolean;
  actualQuantity: number | '';
  discrepancyReason: string;
}

export type TallyState = Record<number, TallyLineState>;

/** Quantity the hub is expected to unload for this line */
export function expectedForLine(line: TripManifestLine): number {
  return line.inTransitQuantity > 0 ? line.inTransitQuantity : line.expectedQuantity;
}

export function buildInitialTallyState(lines: TripManifestLine[]): TallyState {
  const state: TallyState = {};
  for (const l of lines) {
    state[l.id] = {
      checked: l.isForCurrentHub && !l.isReceivedHere,
      actualQuantity: expectedForLine(l),
      discrepancyReason: ''
    };
  }
  return state;
}

interface WarehouseTripTallyTableProps {
  lines: TripManifestLine[];
  state: TallyState;
  onChange: (next: TallyState) => void;
  hideOtherHubs: boolean;
  onHideOtherHubsChange: (value: boolean) => void;
  readOnly: boolean;
  currentHubName?: string | null;
}

/**
 * Selective inbound tally for a multi-stop trip.
 * Contract columns are read-only; the operator only records the actual unloaded quantity.
 * Unchecked lines stay on the truck for the next hub — they are never removed from the trip.
 */
export function WarehouseTripTallyTable({
  lines,
  state,
  onChange,
  hideOtherHubs,
  onHideOtherHubsChange,
  readOnly,
  currentHubName
}: WarehouseTripTallyTableProps) {
  const visibleLines = useMemo(
    () => (hideOtherHubs ? lines.filter((l) => l.isForCurrentHub) : lines),
    [lines, hideOtherHubs]
  );
  const otherHubCount = lines.length - lines.filter((l) => l.isForCurrentHub).length;

  const selectable = visibleLines.filter((l) => !l.isReceivedHere);
  const allChecked = selectable.length > 0 && selectable.every((l) => state[l.id]?.checked);

  const patch = (id: number, value: Partial<TallyLineState>) => {
    onChange({ ...state, [id]: { ...state[id], ...value } });
  };

  const toggleAll = (checked: boolean) => {
    const next = { ...state };
    for (const l of selectable) next[l.id] = { ...next[l.id], checked };
    onChange(next);
  };

  return (
    <div className='space-y-1.5'>
      <div className='flex flex-wrap items-center justify-between gap-1.5'>
        <label className='flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer'>
          <Switch
            checked={hideOtherHubs}
            onCheckedChange={onHideOtherHubsChange}
            aria-label='Ẩn các dòng không thuộc kho này'
          />
          Ẩn các dòng không thuộc kho này
          {otherHubCount > 0 && (
            <span className='text-slate-400 font-normal'>({otherHubCount} dòng đi kho khác)</span>
          )}
        </label>
        <span className='text-[10px] text-slate-500 flex items-center gap-1'>
          <IconLock className='h-3 w-3' />
          Số liệu hợp đồng gốc chỉ xem, chỉ nhập số kiện thực nhận
        </span>
      </div>

      <div className='border border-slate-200 dark:border-slate-700 rounded-lg overflow-auto max-h-[52vh]'>
        <table className='w-full text-[10px] text-left'>
          <thead className='sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700'>
            <tr>
              <th className='py-1 px-1.5 w-[28px] text-center'>
                {!readOnly && (
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(v) => toggleAll(v === true)}
                    aria-label='Chọn tất cả dòng dỡ tại kho này'
                  />
                )}
              </th>
              <th className='py-1 px-1.5 w-[32px] text-center'>STT</th>
              <th className='py-1 px-1.5 min-w-[120px]'>MÃ VẬN ĐƠN</th>
              <th className='py-1 px-1.5 min-w-[110px]'>KHO NHẬN</th>
              <th className='py-1 px-1.5 min-w-[140px]'>TÊN HÀNG HÓA</th>
              <th className='py-1 px-1.5 text-right w-[60px]'>KIỆN HĐ</th>
              <th className='py-1 px-1.5 text-right w-[60px]'>KG HĐ</th>
              <th className='py-1 px-1.5 text-right w-[60px]'>M³ HĐ</th>
              <th className='py-1 px-1.5 text-right w-[64px]'>DỰ KIẾN DỠ</th>
              <th className='py-1 px-1.5 text-right w-[80px]'>THỰC NHẬN</th>
              <th className='py-1 px-1.5 text-right w-[56px]'>CHÊNH</th>
              <th className='py-1 px-1.5 min-w-[160px]'>LÝ DO CHÊNH LỆCH</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900'>
            {visibleLines.length === 0 ? (
              <tr>
                <td colSpan={12} className='py-1.5 text-center text-slate-400'>
                  Không có dòng hàng nào cần dỡ tại {currentHubName ?? 'kho này'}
                </td>
              </tr>
            ) : (
              visibleLines.map((l, i) => {
                const s = state[l.id];
                const expected = expectedForLine(l);
                const actual = s?.actualQuantity === '' ? 0 : Number(s?.actualQuantity ?? 0);
                const diff = s?.checked ? actual - expected : 0;
                const rowLocked = readOnly || l.isReceivedHere;
                const dim = !l.isForCurrentHub && !s?.checked;
                return (
                  <tr
                    key={l.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      s?.checked ? 'border-l-4 border-l-blue-600' : ''
                    } ${dim ? 'opacity-60' : ''}`}
                  >
                    <td className='py-1 px-1.5 text-center'>
                      {!rowLocked && (
                        <Checkbox
                          checked={!!s?.checked}
                          onCheckedChange={(v) => patch(l.id, { checked: v === true })}
                          aria-label={`Dỡ đơn ${l.orderCode} tại kho này`}
                        />
                      )}
                    </td>
                    <td className='py-1 px-1.5 text-center font-bold text-slate-500'>
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td className='py-1 px-1.5'>
                      <div className='text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300'>
                        {l.orderCode}
                      </div>
                      {l.isReceivedHere && (
                        <Badge
                          variant='outline'
                          className='text-[10px] h-4 px-1 bg-emerald-50 text-emerald-700 border-emerald-200'
                        >
                          Đã nhập {l.receivedQuantity} kiện
                        </Badge>
                      )}
                    </td>
                    <td className='py-1 px-1.5'>
                      <span className='text-slate-700 dark:text-slate-300'>
                        {l.destinationHubEntity?.name ?? l.destinationHub ?? '—'}
                      </span>
                      {!l.isForCurrentHub && (
                        <Badge
                          variant='outline'
                          className={`ml-1 text-[10px] h-4 px-1 ${
                            s?.checked
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'text-slate-500'
                          }`}
                        >
                          {s?.checked ? 'Dỡ ngoài kế hoạch' : 'Đi kho khác'}
                        </Badge>
                      )}
                    </td>
                    <td className='py-1 px-1.5 font-medium text-slate-900 dark:text-white'>
                      {l.goodsDescription || '—'}
                    </td>
                    <td className='py-1 px-1.5 text-right text-slate-700 dark:text-slate-300'>
                      {l.totalQuantity ?? 0}
                    </td>
                    <td className='py-1 px-1.5 text-right text-slate-700 dark:text-slate-300'>
                      {formatWeight(l.totalWeight)}
                    </td>
                    <td className='py-1 px-1.5 text-right text-slate-700 dark:text-slate-300'>
                      {formatVolume(l.totalVolume)}
                    </td>
                    <td className='py-1 px-1.5 text-right font-bold text-slate-800 dark:text-slate-200'>
                      {expected}
                    </td>
                    <td className='py-1 px-1.5 text-right'>
                      {rowLocked || !s?.checked ? (
                        <span className='font-bold text-slate-800 dark:text-slate-200'>
                          {l.isReceivedHere ? l.receivedQuantity : '—'}
                        </span>
                      ) : (
                        <Input
                          type='number'
                          min={1}
                          step={1}
                          value={s.actualQuantity}
                          onChange={(e) =>
                            patch(l.id, {
                              actualQuantity: e.target.value === '' ? '' : Number(e.target.value)
                            })
                          }
                          className='h-7 w-[68px] ml-auto text-right text-[10px] font-bold px-1'
                          aria-label={`Số kiện thực nhận đơn ${l.orderCode}`}
                        />
                      )}
                    </td>
                    <td
                      className={`py-1 px-1.5 text-right font-bold ${
                        diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-amber-600' : 'text-slate-400'
                      }`}
                    >
                      {s?.checked && !rowLocked ? (diff > 0 ? `+${diff}` : diff) : '—'}
                    </td>
                    <td className='py-1 px-1.5'>
                      {s?.checked && !rowLocked && diff !== 0 ? (
                        <div className='flex items-center gap-1'>
                          <IconAlertTriangle className='h-3 w-3 text-rose-500 shrink-0' />
                          <Input
                            value={s.discrepancyReason}
                            onChange={(e) => patch(l.id, { discrepancyReason: e.target.value })}
                            placeholder='VD: Rách bao bì, thiếu 1 kiện'
                            className='h-7 text-[10px] px-1'
                            aria-label={`Lý do chênh lệch đơn ${l.orderCode}`}
                          />
                        </div>
                      ) : (
                        <span className='text-slate-400'>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
