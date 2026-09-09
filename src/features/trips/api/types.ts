import { Vehicle, Driver } from '@/features/fleet/api/types';

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
  notes?: string | null;
  externalNote?: string | null;
  isExternalVehicleNeeded: boolean;
}

export interface Trip {
  id: number;
  orderId: number;
  licensePlate?: string | null;
  driverName?: string | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripPayload {
  orderId: number;
  licensePlate?: string;
  driverName?: string;
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
    licensePlate?: string;
    driverName?: string;
    pickupDate?: string;
    pickupTime?: string;
    estimatedDeliveryDate?: string;
    weightAllocated: number;
    volumeAllocated: number;
    notes?: string;
  }>;
}

export interface UpdateTripPayload {
  licensePlate?: string;
  driverName?: string;
  status?: TripStatus;
  pickupDate?: string;
  pickupTime?: string;
  estimatedDeliveryDate?: string;
  weightAllocated?: number;
  volumeAllocated?: number;
  sequenceNumber?: number;
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

export interface QueryTripParams {
  status?: string;
  orderId?: string;
  hub?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sort?: string;
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

export interface SplitRow {
  licensePlate?: string;
  driverName?: string;
  vehicleId: number | '';
  driverId: number | '';
  weightAllocated: number | '';
  volumeAllocated: number | '';
  pickupDate: string;
  pickupTime: string;
  estimatedDeliveryDate: string;
  notes: string;
}
