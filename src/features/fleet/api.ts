import { apiClient } from '@/lib/api-client';

export interface Vehicle {
  id: number;
  licensePlate: string;
  model?: string | null;
  type: string;
  maxWeight: number;
  maxVolume: number;
  currentHub?: string | null;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
  assignedDriverId?: number | null;
  isExternal?: boolean;
  externalProvider?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Driver {
  id: number;
  fullName: string;
  phone: string;
  licenseNumber?: string | null;
  licenseClass: string;
  experienceYears: number;
  status: 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVehiclePayload {
  licensePlate: string;
  model?: string;
  type: string;
  maxWeight: number;
  maxVolume: number;
  currentHub?: string;
  status?: string;
  assignedDriverId?: number;
  isExternal?: boolean;
  externalProvider?: string;
}

export interface CreateDriverPayload {
  fullName: string;
  phone: string;
  licenseNumber?: string;
  licenseClass: string;
  experienceYears?: number;
  status?: string;
}

export const fleetApi = {
  // Vehicles
  getVehicles: async (): Promise<Vehicle[]> => {
    const res = await apiClient.get('/api/v1/vehicles');
    return res.data;
  },
  createVehicle: async (payload: CreateVehiclePayload): Promise<Vehicle> => {
    const res = await apiClient.post('/api/v1/vehicles', payload);
    return res.data;
  },
  updateVehicle: async (id: number, payload: Partial<CreateVehiclePayload>): Promise<Vehicle> => {
    const res = await apiClient.patch(`/api/v1/vehicles/${id}`, payload);
    return res.data;
  },
  deleteVehicle: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/vehicles/${id}`);
  },

  // Drivers
  getDrivers: async (): Promise<Driver[]> => {
    const res = await apiClient.get('/api/v1/drivers');
    return res.data;
  },
  createDriver: async (payload: CreateDriverPayload): Promise<Driver> => {
    const res = await apiClient.post('/api/v1/drivers', payload);
    return res.data;
  },
  updateDriver: async (id: number, payload: Partial<CreateDriverPayload>): Promise<Driver> => {
    const res = await apiClient.patch(`/api/v1/drivers/${id}`, payload);
    return res.data;
  },
  deleteDriver: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/drivers/${id}`);
  }
};
