import { queryOptions } from '@tanstack/react-query';
import { fleetApi } from './service';
import type { VehicleFilters, DriverFilters } from './types';

export const fleetKeys = {
  all: ['fleet'] as const,
  allVehicles: ['fleet', 'vehicles'] as const,
  vehiclesList: (filters: VehicleFilters) => [...fleetKeys.allVehicles, 'list', filters] as const,
  rawVehicles: () => [...fleetKeys.allVehicles, 'raw'] as const,
  vehicleDetail: (id: number) => [...fleetKeys.allVehicles, 'detail', id] as const,

  allDrivers: ['fleet', 'drivers'] as const,
  driversList: (filters: DriverFilters) => [...fleetKeys.allDrivers, 'list', filters] as const,
  rawDrivers: () => [...fleetKeys.allDrivers, 'raw'] as const,
  driverDetail: (id: number) => [...fleetKeys.allDrivers, 'detail', id] as const
};

export const vehiclesQueryOptions = (filters: VehicleFilters) =>
  queryOptions({
    queryKey: fleetKeys.vehiclesList(filters),
    queryFn: () => fleetApi.getPaginatedVehicles(filters)
  });

export const rawVehiclesQueryOptions = () =>
  queryOptions({
    queryKey: fleetKeys.rawVehicles(),
    queryFn: () => fleetApi.getVehicles()
  });

export const driversQueryOptions = (filters: DriverFilters) =>
  queryOptions({
    queryKey: fleetKeys.driversList(filters),
    queryFn: () => fleetApi.getPaginatedDrivers(filters)
  });

export const rawDriversQueryOptions = () =>
  queryOptions({
    queryKey: fleetKeys.rawDrivers(),
    queryFn: () => fleetApi.getDrivers()
  });
