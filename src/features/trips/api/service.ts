import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/lib/api-error';
import type {
  Trip,
  TripStats,
  CreateTripPayload,
  CreateSplitTripsPayload,
  UpdateTripPayload,
  QueryTripParams,
  PaginatedResponse
} from './types';

export async function getTrips(params?: QueryTripParams): Promise<PaginatedResponse<Trip>> {
  const res = await apiClient.get<ApiResponse<Trip[]>>('/api/v1/trips', { params });
  return {
    data: res.data.data,
    meta: (res.data.meta as PaginatedResponse<Trip>['meta']) || {
      total: res.data.data?.length || 0,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  };
}

export async function getTripStats(fromDate?: string, toDate?: string): Promise<TripStats> {
  const res = await apiClient.get<ApiResponse<TripStats>>('/api/v1/trips/stats', {
    params: { fromDate, toDate }
  });
  return res.data.data;
}

export async function getTrip(id: number): Promise<Trip> {
  const res = await apiClient.get<ApiResponse<Trip>>(`/api/v1/trips/${id}`);
  return res.data.data;
}

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
  const res = await apiClient.post<ApiResponse<Trip>>('/api/v1/trips', payload);
  return res.data.data;
}

export async function createSplitTrips(payload: CreateSplitTripsPayload): Promise<Trip[]> {
  const res = await apiClient.post<ApiResponse<Trip[]>>('/api/v1/trips/split', payload);
  return res.data.data;
}

export async function confirmTrip(id: number): Promise<Trip> {
  const res = await apiClient.patch<ApiResponse<Trip>>(`/api/v1/trips/${id}/confirm`);
  return res.data.data;
}

export async function updateTrip(id: number, payload: Partial<UpdateTripPayload>): Promise<Trip> {
  const res = await apiClient.patch<ApiResponse<Trip>>(`/api/v1/trips/${id}`, payload);
  return res.data.data;
}

export async function deleteTrip(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/trips/${id}`);
}

export const tripsApi = {
  getTrips,
  getTripStats,
  getTrip,
  createTrip,
  createSplitTrips,
  confirmTrip,
  updateTrip,
  deleteTrip
};
