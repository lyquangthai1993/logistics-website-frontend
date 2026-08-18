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
  originHub?: string | null;
  destinationHub?: string | null;
  totalQuantity?: number | null;
  totalWeight: number;
  totalVolume: number;
  goodsDescription?: string | null;
  isExternalVehicleNeeded: boolean;
  externalNote?: string | null;
  createdByUserId?: number | null;
  notes?: string | null;
  trips?: Trip[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
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
  originHub?: string;
  destinationHub?: string;
  totalQuantity?: number | null;
  totalWeight: number;
  totalVolume: number;
  goodsDescription?: string;
  isExternalVehicleNeeded?: boolean;
  externalNote?: string;
  notes?: string;
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
