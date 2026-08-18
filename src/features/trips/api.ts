import { apiClient } from '@/lib/api-client';
import { Vehicle, Driver } from '../fleet/api';

export type TripStatus = 'PENDING' | 'CONFIRMED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface TripOrderSummary {
  id: number;
  orderCode: string;
  status: string;
  route?: string | null;
  originHub?: string | null;
  destinationHub?: string | null;
  totalWeight: number;
  totalVolume: number;
  goodsDescription?: string | null;
  isExternalVehicleNeeded: boolean;
}

export interface Trip {
  id: number;
  orderId: number;
  vehicleId?: number | null;
  driverId?: number | null;
  status: TripStatus;
  pickupDate?: string | null;
  pickupTime?: string | null;
  estimatedDeliveryDate?: string | null;
  weightAllocated: number;
  volumeAllocated: number;
  sequenceNumber: number;
  assignedByUserId?: number | null;
  notes?: string | null;
  order?: TripOrderSummary;
  vehicle?: Vehicle;
  driver?: Driver;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripPayload {
  orderId: number;
  vehicleId?: number;
  driverId?: number;
  pickupDate?: string;
  pickupTime?: string;
  estimatedDeliveryDate?: string;
  weightAllocated: number;
  volumeAllocated: number;
  sequenceNumber?: number;
  notes?: string;
}

export interface CreateSplitTripsPayload {
  orderId: number;
  trips: Array<{
    vehicleId?: number;
    driverId?: number;
    pickupDate?: string;
    pickupTime?: string;
    estimatedDeliveryDate?: string;
    weightAllocated: number;
    volumeAllocated: number;
    notes?: string;
  }>;
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

export interface QueryTripParams {
  status?: string;
  orderId?: string;
  hub?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface TripStats {
  tripsTotal: number;
  tripsPending: number;
  tripsConfirmed: number;
  tripsInTransit: number;
  tripsCompleted: number;
  tripsCancelled: number;
  ordersAwaitingFleet: number;
  ordersNoVehicle: number;
  fromDate: string;
  toDate: string;
}

export const tripsApi = {
  getTrips: async (params?: QueryTripParams): Promise<PaginatedResponse<Trip>> => {
    const res = await apiClient.get('/api/v1/trips', { params });
    return res.data;
  },

  getTripStats: async (fromDate?: string, toDate?: string): Promise<TripStats> => {
    const res = await apiClient.get('/api/v1/trips/stats', {
      params: { fromDate, toDate },
    });
    return res.data;
  },

  getTrip: async (id: number): Promise<Trip> => {
    const res = await apiClient.get(`/api/v1/trips/${id}`);
    return res.data;
  },

  createTrip: async (payload: CreateTripPayload): Promise<Trip> => {
    const res = await apiClient.post('/api/v1/trips', payload);
    return res.data;
  },

  createSplitTrips: async (payload: CreateSplitTripsPayload): Promise<Trip[]> => {
    const res = await apiClient.post('/api/v1/trips/split', payload);
    return res.data;
  },

  confirmTrip: async (id: number): Promise<Trip> => {
    const res = await apiClient.patch(`/api/v1/trips/${id}/confirm`);
    return res.data;
  },

  updateTrip: async (id: number, payload: Partial<CreateTripPayload>): Promise<Trip> => {
    const res = await apiClient.patch(`/api/v1/trips/${id}`, payload);
    return res.data;
  },

  deleteTrip: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/trips/${id}`);
  }
};

