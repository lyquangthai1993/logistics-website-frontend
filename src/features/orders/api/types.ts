import type { Trip } from '@/features/trips/api';

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_FLEET'
  | 'ASSIGNED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'NO_VEHICLE'
  | 'CANCELLED';

export interface Order {
  id: number;
  orderCode: string;
  status: OrderStatus;
  route?: string | null;
  // Legacy string fields (kept for display/backward compat)
  originHub?: string | null;
  destinationHub?: string | null;
  // Phase 1 FK fields — set when hub is selected via dropdown
  originHubId?: number | null;
  destinationHubId?: number | null;
  totalQuantity?: number | null;
  totalWeight: number;
  totalVolume: number;
  goodsDescription?: string | null;
  isExternalVehicleNeeded: boolean;
  externalNote?: string | null;
  createdByUserId?: number | null;
  notes?: string | null;
  province?: string | null;
  accompanyingDocs?: string | null;
  trips?: Trip[];
  // Operational quantities (ledger-driven, never part of the Master Contract)
  inboundQuantity?: number | null;
  outboundQuantity?: number | null;
  remainingQuantity?: number | null;
  // Current physical location of the cargo
  currentHubId?: number | null;
  currentTripCode?: string | null;
  currentHubEntity?: { id: number; name: string; code?: string | null } | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** Ledger invoice types: INBOUND=PNK, TRANSFER=PXK, OUTBOUND=PGH, ADJUSTMENT=DCH */
export type LedgerEntryType = 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'ADJUSTMENT';

export interface OrderLedgerEntry {
  id: number;
  type: LedgerEntryType | string;
  invoiceCode: string | null;
  hubId: number | null;
  hubName: string | null;
  tripCode: string | null;
  licensePlate: string | null;
  driverName: string | null;
  quantity: number;
  expectedQuantity: number | null;
  discrepancyQuantity: number;
  discrepancyReason: string | null;
  remainingQuantity: number;
  weight: number;
  volume: number;
  destination: string | null;
  notes: string | null;
  performedByUserId: number | null;
  performedByName: string | null;
  createdAt: string;
}

export interface AdminOverrideOrderPayload {
  auditReason: string;
  totalQuantity?: number;
  totalWeight?: number;
  totalVolume?: number;
  goodsDescription?: string;
  originHubId?: number;
  destinationHubId?: number;
}

/** Order statuses where the Master Contract is still editable */
export const CONTRACT_EDITABLE_STATUSES = ['DRAFT'] as const;

export function isContractLocked(status?: string | null): boolean {
  return !!status && !(CONTRACT_EDITABLE_STATUSES as readonly string[]).includes(status);
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type PaginatedResponse<T> = PaginatedResult<T>;
export type PaginatedOrdersResponse = PaginatedResult<Order>;

export interface CreateOrderPayload {
  orderCode: string;
  route?: string;
  // String fields kept for backward compat (used for display/filter)
  originHub?: string;
  destinationHub?: string;
  // FK fields — Phase 1: send both string + id for full targeted notification routing
  originHubId?: number;
  destinationHubId?: number;
  totalQuantity?: number | null;
  totalWeight: number;
  totalVolume: number;
  goodsDescription?: string;
  isExternalVehicleNeeded?: boolean;
  externalNote?: string;
  notes?: string;
  province?: string;
  accompanyingDocs?: string;
}

export type UpdateOrderPayload = Partial<CreateOrderPayload>;

export interface OrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  originHub?: string;
  destinationHub?: string;
  fromDate?: string;
  toDate?: string;
  sort?: string;
}

export type QueryOrderParams = OrderFilters;

export interface OrderStats {
  total: number;
  pending: number;
  assigned: number;
  inTransit: number;
  delivered: number;
  noVehicle: number;
  cancelled: number;
  fromDate: string;
  toDate: string;
}

export interface GenerateCodeResponse {
  orderCode: string;
}

export interface DeleteOrderResponse {
  success?: boolean;
  message?: string;
}
