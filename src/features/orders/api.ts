import { apiClient } from '@/lib/api-client';
import { Trip } from '../trips/api';

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
}

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

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface QueryOrderParams {
  status?: string;
  search?: string;
  originHub?: string;
  destinationHub?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

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

export const ordersApi = {
  getOrders: async (params?: QueryOrderParams): Promise<PaginatedResponse<Order>> => {
    const res = await apiClient.get('/api/v1/orders', { params });
    return res.data;
  },

  getOrderStats: async (fromDate?: string, toDate?: string): Promise<OrderStats> => {
    const res = await apiClient.get('/api/v1/orders/stats', {
      params: { fromDate, toDate },
    });
    return res.data;
  },

  getOrder: async (id: number): Promise<Order> => {
    const res = await apiClient.get(`/api/v1/orders/${id}`);
    return res.data;
  },

  createOrder: async (payload: CreateOrderPayload): Promise<Order> => {
    const res = await apiClient.post('/api/v1/orders', payload);
    return res.data;
  },

  updateOrder: async (id: number, payload: Partial<CreateOrderPayload>): Promise<Order> => {
    const res = await apiClient.patch(`/api/v1/orders/${id}`, payload);
    return res.data;
  },

  submitOrder: async (id: number): Promise<Order> => {
    const res = await apiClient.patch(`/api/v1/orders/${id}/submit`);
    return res.data;
  },

  markNoVehicle: async (id: number, reason?: string): Promise<Order> => {
    const res = await apiClient.patch(`/api/v1/orders/${id}/no-vehicle`, { reason });
    return res.data;
  },

  deleteOrder: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/orders/${id}`);
  },

  generateOrderCode: async (prefix?: string): Promise<{ orderCode: string }> => {
    const res = await apiClient.get('/api/v1/orders/generate-code', {
      params: prefix ? { prefix } : undefined,
    });
    return res.data;
  },
};
