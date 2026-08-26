import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/lib/api-error';
import type {
  Order,
  OrderFilters,
  PaginatedOrdersResponse,
  CreateOrderPayload,
  UpdateOrderPayload,
  OrderStats,
  GenerateCodeResponse
} from './types';

export async function getOrders(filters: OrderFilters = {}): Promise<PaginatedOrdersResponse> {
  const res = await apiClient.get<ApiResponse<Order[]>>('/api/v1/orders', { params: filters });
  return {
    data: res.data.data,
    meta: (res.data.meta as PaginatedOrdersResponse['meta']) || {
      total: res.data.data?.length || 0,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  };
}

export async function getOrderStats(fromDate?: string, toDate?: string): Promise<OrderStats> {
  const res = await apiClient.get<ApiResponse<OrderStats>>('/api/v1/orders/stats', {
    params: { fromDate, toDate }
  });
  return res.data.data;
}

export async function getOrderById(id: number | string): Promise<Order> {
  const res = await apiClient.get<ApiResponse<Order>>(`/api/v1/orders/${id}`);
  return res.data.data;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await apiClient.post<ApiResponse<Order>>('/api/v1/orders', payload);
  return res.data.data;
}

export async function updateOrder(id: number, payload: UpdateOrderPayload): Promise<Order> {
  const res = await apiClient.patch<ApiResponse<Order>>(`/api/v1/orders/${id}`, payload);
  return res.data.data;
}

export async function submitOrder(id: number): Promise<Order> {
  const res = await apiClient.patch<ApiResponse<Order>>(`/api/v1/orders/${id}/submit`);
  return res.data.data;
}

export async function markNoVehicle(id: number, reason?: string): Promise<Order> {
  const res = await apiClient.patch<ApiResponse<Order>>(`/api/v1/orders/${id}/no-vehicle`, {
    reason
  });
  return res.data.data;
}

export async function deleteOrder(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/orders/${id}`);
}

export async function generateOrderCode(prefix?: string): Promise<GenerateCodeResponse> {
  const res = await apiClient.get<ApiResponse<GenerateCodeResponse>>(
    '/api/v1/orders/generate-code',
    {
      params: prefix ? { prefix } : undefined
    }
  );
  return res.data.data;
}

/**
 * Backward compatibility object matching the legacy ordersApi interface
 */
export const ordersApi = {
  getOrders,
  getOrderStats,
  getOrder: getOrderById,
  getOrderById,
  createOrder,
  updateOrder,
  submitOrder,
  markNoVehicle,
  deleteOrder,
  generateOrderCode
};
