import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-error';

/** Per-hub trip stop status: PENDING = Chờ xử lý, COMPLETED = Đã xử lý */
export type TripStopStatus = 'PENDING' | 'COMPLETED';
export type TripStopType = 'ORIGIN' | 'TRANSIT' | 'DESTINATION';

export interface TripStop {
  hubId: number;
  hubName: string;
  stopSequence: number;
  stopType: TripStopType;
  status: TripStopStatus;
  processedAt: string | null;
}

export interface TripManifestLine {
  id: number;
  orderCode: string;
  status: string;
  goodsDescription?: string | null;
  totalQuantity?: number | null;
  totalWeight: number;
  totalVolume: number;
  inboundQuantity?: number | null;
  outboundQuantity?: number | null;
  remainingQuantity?: number | null;
  originHub?: string | null;
  originHubId?: number | null;
  destinationHub?: string | null;
  destinationHubId?: number | null;
  destinationHubEntity?: {
    id: number;
    name: string;
    code?: string | null;
    level?: number;
    city?: string | null;
  } | null;
  deliveryMode?: 'DIRECT_CUSTOMER' | 'HUB_L1' | 'XE_BO' | string;
  originalDeliveryAddress?: string;
  province?: string | null;
  accompanyingDocs?: string | null;
  notes?: string | null;
  pickupAddress: string;
  deliveryAddress: string;
  tripId: number;
  weightAllocated: number;
  volumeAllocated: number;
  /** Quantity loaded on this trip (or contract quantity for legacy trips) */
  expectedQuantity: number;
  /** Quantity still on the truck for this order */
  inTransitQuantity: number;
  /** Quantity already received at the viewer hub from this trip */
  receivedQuantity: number;
  isForCurrentHub: boolean;
  isReceivedHere: boolean;
  isContractLocked: boolean;
  hubStatus: string;
  hubStock: number | null;
}

export interface TripManifest {
  tripCode: string;
  licensePlate: string;
  driverName: string;
  pickupDate: string | null;
  isTransfer: boolean;
  stops: TripStop[];
  currentHubId: number | null;
  currentHubStatus: TripStopStatus | null;
  lines: TripManifestLine[];
}

export const TRIP_STOP_STATUS_LABEL: Record<TripStopStatus, string> = {
  PENDING: 'Chờ xử lý',
  COMPLETED: 'Đã xử lý'
};

/** Codes rendered by the boards for groups without a persisted trip code */
export function isManifestTripCode(code?: string | null): code is string {
  return !!code && code !== '—' && code.trim().length > 0;
}

export async function getTripManifest(tripCode: string): Promise<TripManifest> {
  const res = await apiClient.get<ApiResponse<TripManifest>>(
    `/api/v1/warehouse/trips/${encodeURIComponent(tripCode)}/manifest`
  );
  return res.data.data;
}

export const tripManifestKeys = {
  all: ['warehouse', 'trip-manifest'] as const,
  detail: (tripCode: string) => [...tripManifestKeys.all, tripCode] as const
};

export function useTripManifestQuery(tripCode: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: tripManifestKeys.detail(tripCode ?? ''),
    queryFn: () => getTripManifest(tripCode as string),
    enabled: enabled && isManifestTripCode(tripCode),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export interface AvailableOutboundOrdersResponse {
  tripCode: string;
  currentHubId: number | null;
  currentHubName: string;
  downstreamHubs: Array<{ id: number; name: string }>;
  orders: any[];
}

export async function getAvailableOutboundOrders(
  tripCode: string,
  hubId?: number | null
): Promise<AvailableOutboundOrdersResponse> {
  const queryParam = hubId ? `?hubId=${hubId}` : '';
  const res = await apiClient.get<ApiResponse<AvailableOutboundOrdersResponse>>(
    `/api/v1/warehouse/trips/${encodeURIComponent(tripCode)}/available-outbound-orders${queryParam}`
  );
  return res.data.data;
}

export function useAvailableOutboundOrdersQuery(
  tripCode: string | null | undefined,
  hubId?: number | null,
  enabled = true
) {
  return useQuery({
    queryKey: ['warehouse', 'available-outbound-orders', tripCode, hubId],
    queryFn: () => getAvailableOutboundOrders(tripCode as string, hubId),
    enabled: enabled && isManifestTripCode(tripCode),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export async function updateTransitStep(
  tripCode: string,
  payload: { step: 'INBOUND' | 'OUTBOUND'; action: 'CONFIRM' | 'SKIP' }
) {
  const res = await apiClient.post<ApiResponse<any>>(
    `/api/v1/warehouse/trips/${encodeURIComponent(tripCode)}/transit-step`,
    payload
  );
  return res.data.data;
}

export interface AppendStoredOrdersPayload {
  orderIds: number[];
  destinationHubId?: number;
  hubId?: number;
  notes?: string;
}

export async function appendStoredOrdersToTrip(
  tripCode: string,
  payload: AppendStoredOrdersPayload
) {
  const res = await apiClient.post<ApiResponse<any>>(
    `/api/v1/warehouse/trips/${encodeURIComponent(tripCode)}/append-stored-orders`,
    payload
  );
  return res.data.data;
}

export interface UpdateTripOrderDestinationPayload {
  deliveryMode: 'DIRECT_CUSTOMER' | 'HUB_L1' | 'XE_BO';
  destinationHubId?: number | null;
  deliveryAddress?: string | null;
  notes?: string;
}

export async function updateTripOrderDestination(
  tripCode: string,
  orderId: number,
  payload: UpdateTripOrderDestinationPayload
) {
  const res = await apiClient.patch<ApiResponse<any>>(
    `/api/v1/warehouse/trips/${encodeURIComponent(tripCode)}/orders/${orderId}/destination`,
    payload
  );
  return res.data.data;
}

