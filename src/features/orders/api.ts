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
  totalWeight: number;
  totalVolume: number;
  goodsDescription?: string;
  isExternalVehicleNeeded?: boolean;
  externalNote?: string;
  notes?: string;
}

export interface QueryOrderParams {
  status?: string;
  search?: string;
  originHub?: string;
  destinationHub?: string;
}

export const ordersApi = {
  getOrders: async (params?: QueryOrderParams): Promise<Order[]> => {
    const res = await apiClient.get('/api/v1/orders', { params });
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
  }
};
