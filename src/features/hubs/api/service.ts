import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/lib/api-error';
import type {
  Hub,
  HubFilters,
  PaginatedHubsResponse,
  CreateHubPayload,
  UpdateHubPayload,
  DeleteHubResponse
} from './types';

export async function getHubs(filters: HubFilters = {}): Promise<PaginatedHubsResponse> {
  const res = await apiClient.get<ApiResponse<Hub[]>>('/api/v1/hubs', { params: filters });
  return {
    data: res.data.data,
    meta: (res.data.meta as PaginatedHubsResponse['meta']) || {
      total: res.data.data?.length || 0,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  };
}

export async function getActiveHubs(): Promise<Hub[]> {
  const res = await apiClient.get<ApiResponse<Hub[]>>('/api/v1/hubs/active');
  return res.data.data ?? [];
}

export async function getHubById(id: number): Promise<Hub> {
  const res = await apiClient.get<ApiResponse<Hub>>(`/api/v1/hubs/${id}`);
  return res.data.data;
}

export async function createHub(payload: CreateHubPayload): Promise<Hub> {
  const res = await apiClient.post<ApiResponse<Hub>>('/api/v1/hubs', payload);
  return res.data.data;
}

export async function updateHub(id: number, payload: UpdateHubPayload): Promise<Hub> {
  const res = await apiClient.patch<ApiResponse<Hub>>(`/api/v1/hubs/${id}`, payload);
  return res.data.data;
}

export async function toggleActiveHub(id: number): Promise<Hub> {
  const res = await apiClient.patch<ApiResponse<Hub>>(`/api/v1/hubs/${id}/toggle-active`);
  return res.data.data;
}

export async function deleteHub(id: number): Promise<DeleteHubResponse> {
  const res = await apiClient.delete<ApiResponse<DeleteHubResponse>>(`/api/v1/hubs/${id}`);
  return res.data.data ?? (res.data as any);
}

/**
 * Backward compatibility object matching the legacy hubsApi interface
 */
export const hubsApi = {
  getHubs,
  getActiveHubs,
  getHub: getHubById,
  getHubById,
  createHub,
  updateHub,
  toggleActive: toggleActiveHub,
  toggleActiveHub,
  deleteHub
};
