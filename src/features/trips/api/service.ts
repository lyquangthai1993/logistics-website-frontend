import { apiClient } from '@/lib/api-client';
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
  const res = await apiClient.get('/api/v1/trips', { params });
  return res.data;
}

export async function getTripStats(fromDate?: string, toDate?: string): Promise<TripStats> {
  const res = await apiClient.get('/api/v1/trips/stats', {
    params: { fromDate, toDate }
  });
  return res.data;
}

export async function getTrip(id: number): Promise<Trip> {
  const res = await apiClient.get(`/api/v1/trips/${id}`);
  return res.data;
}

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
  const res = await apiClient.post('/api/v1/trips', payload);
  return res.data;
}

export async function createSplitTrips(payload: CreateSplitTripsPayload): Promise<Trip[]> {
  const res = await apiClient.post('/api/v1/trips/split', payload);
  return res.data;
}

export async function confirmTrip(id: number): Promise<Trip> {
  const res = await apiClient.patch(`/api/v1/trips/${id}/confirm`);
  return res.data;
}

export async function updateTrip(id: number, payload: Partial<UpdateTripPayload>): Promise<Trip> {
  const res = await apiClient.patch(`/api/v1/trips/${id}`, payload);
  return res.data;
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
