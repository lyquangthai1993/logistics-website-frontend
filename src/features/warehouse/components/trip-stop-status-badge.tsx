'use client';

import { Badge } from '@/components/ui/badge';
import { TRIP_STOP_STATUS_LABEL, type TripStopStatus } from '../api/trip-manifest';

const PENDING_LIKE = new Set(['PENDING', 'DRAFT', 'WAITING', 'PENDING_INBOUND', 'IN_TRANSIT']);

/** Normalizes any legacy trip / order status into the 2 hub-scoped trip labels. */
export function toTripStopStatus(status?: string | null): TripStopStatus {
  if (!status) return 'PENDING';
  return PENDING_LIKE.has(status.toUpperCase()) ? 'PENDING' : 'COMPLETED';
}

interface TripStopStatusBadgeProps {
  status?: string | null;
  className?: string;
}

/** Trip status as seen by the current warehouse: only "Chờ xử lý" or "Đã xử lý". */
export function TripStopStatusBadge({ status, className = '' }: TripStopStatusBadgeProps) {
  const normalized = toTripStopStatus(status);
  const tone =
    normalized === 'PENDING'
      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
      : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300';
  return (
    <Badge variant='outline' className={`text-[10px] h-5 px-1.5 font-bold ${tone} ${className}`}>
      {TRIP_STOP_STATUS_LABEL[normalized]}
    </Badge>
  );
}
