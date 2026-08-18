import type { Hub } from '@/features/hubs/api';

export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
export type DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY';

export interface Vehicle {
  id: number;
  licensePlate: string;
  model?: string | null;
  type: string;
  maxWeight: number;
  maxVolume: number;
  currentHub?: string | null;
  hubId?: number | null;
  hub?: Hub | null;
  status: VehicleStatus;
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
  status: DriverStatus;
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
  hubId?: number | null;
  status?: VehicleStatus | string;
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
  status?: DriverStatus | string;
}

export interface VehicleFilters {
  page?: number;
  limit?: number;
  search?: string | null;
  status?: string | null;
  type?: string | null;
  sort?: string | null;
}

export interface DriverFilters {
  page?: number;
  limit?: number;
  search?: string | null;
  status?: string | null;
  licenseClass?: string | null;
  sort?: string | null;
}

export interface VehiclesResponse {
  vehicles: Vehicle[];
  total_vehicles: number;
  all_vehicles?: Vehicle[];
}

export interface DriversResponse {
  drivers: Driver[];
  total_drivers: number;
  all_drivers?: Driver[];
}
