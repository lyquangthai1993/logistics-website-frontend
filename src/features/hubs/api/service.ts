import { apiClient } from '@/lib/api-client';
import type {
  Hub,
  HubFilters,
  PaginatedHubsResponse,
  CreateHubPayload,
  UpdateHubPayload,
  DeleteHubResponse
} from './types';

export async function getHubs(filters: HubFilters = {}): Promise<PaginatedHubsResponse> {
  const res = await apiClient.get('/api/v1/hubs', { params: filters });
  return res.data;
}

export async function getActiveHubs(): Promise<Hub[]> {
  const res = await apiClient.get('/api/v1/hubs/active');
  return res.data;
}

export async function getHubById(id: number): Promise<Hub> {
  const res = await apiClient.get(`/api/v1/hubs/${id}`);
  return res.data;
}

export async function createHub(payload: CreateHubPayload): Promise<Hub> {
  const res = await apiClient.post('/api/v1/hubs', payload);
  return res.data;
}

export async function updateHub(id: number, payload: UpdateHubPayload): Promise<Hub> {
  const res = await apiClient.patch(`/api/v1/hubs/${id}`, payload);
  return res.data;
}

export async function toggleActiveHub(id: number): Promise<Hub> {
  const res = await apiClient.patch(`/api/v1/hubs/${id}/toggle-active`);
  return res.data;
}

export async function deleteHub(id: number): Promise<DeleteHubResponse> {
  const res = await apiClient.delete(`/api/v1/hubs/${id}`);
  return res.data;
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
