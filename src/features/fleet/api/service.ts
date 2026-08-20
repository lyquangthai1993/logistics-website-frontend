import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/lib/api-error';
import type {
  Vehicle,
  Driver,
  CreateVehiclePayload,
  CreateDriverPayload,
  VehicleFilters,
  DriverFilters,
  VehiclesResponse,
  DriversResponse
} from './types';

/**
 * Default sorting comparator: newest first (createdAt DESC, tie-break by id DESC)
 */
function defaultNewestSort<T extends { id: number; createdAt?: string }>(items: T[]): T[] {
  return items.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

/**
 * Sorts array based on TanStack Table sorting JSON or falls back to default newest sort
 */
function applyCustomSort<T extends { id: number; createdAt?: string }>(
  items: T[],
  sortJson?: string | null,
  nestedFieldResolver?: (item: T, fieldId: string) => any
): T[] {
  if (!sortJson) {
    return defaultNewestSort(items);
  }

  try {
    const sorting = JSON.parse(sortJson);
    if (Array.isArray(sorting) && sorting.length > 0) {
      const { id, desc } = sorting[0];
      return items.sort((a: any, b: any) => {
        let valA = nestedFieldResolver ? nestedFieldResolver(a, id) : a[id];
        let valB = nestedFieldResolver ? nestedFieldResolver(b, id) : b[id];

        valA = valA ?? '';
        valB = valB ?? '';

        // Numeric comparison
        if (typeof valA === 'number' && typeof valB === 'number') {
          if (valA !== valB) return desc ? valB - valA : valA - valB;
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        }

        // Date comparison
        if (id === 'createdAt' || id === 'updatedAt') {
          const timeA = valA ? new Date(valA).getTime() : 0;
          const timeB = valB ? new Date(valB).getTime() : 0;
          if (timeA !== timeB) return desc ? timeB - timeA : timeA - timeB;
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        }

        // Vietnamese string comparison with numeric awareness
        const strA = String(valA);
        const strB = String(valB);
        const cmp = strA.localeCompare(strB, 'vi', { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) return desc ? -cmp : cmp;

        // Stable secondary tie-break: id DESC
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
    }
  } catch {
    // Ignore JSON parse error, fallback to default
  }

  return defaultNewestSort(items);
}

export const fleetApi = {
  // Vehicles
  getVehicles: async (): Promise<Vehicle[]> => {
    const res = await apiClient.get<ApiResponse<Vehicle[]>>('/api/v1/vehicles');
    return res.data.data ?? [];
  },

  getPaginatedVehicles: async (filters: VehicleFilters): Promise<VehiclesResponse> => {
    const res = await apiClient.get<ApiResponse<Vehicle[]>>('/api/v1/vehicles');
    const all = res.data.data ?? [];

    let filtered = [...all];

    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (v) =>
          v.licensePlate.toLowerCase().includes(q) ||
          (v.model && v.model.toLowerCase().includes(q)) ||
          (v.hub?.name && v.hub.name.toLowerCase().includes(q)) ||
          (v.currentHub && v.currentHub.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      const statuses = filters.status.split(',').map((s) => s.trim());
      filtered = filtered.filter((v) => statuses.includes(v.status));
    }

    // Type filter
    if (filters.type && filters.type !== 'ALL') {
      const types = filters.type.split(',').map((t) => t.trim());
      filtered = filtered.filter((v) => types.includes(v.type));
    }

    // Sort resolution (default: newest first)
    filtered = applyCustomSort(filtered, filters.sort, (item, fieldId) => {
      if (fieldId === 'currentHub') {
        return item.hub?.name || item.currentHub || '';
      }
      return item[fieldId as keyof Vehicle];
    });

    const total = filtered.length;
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      vehicles: paginated,
      total_vehicles: total,
      all_vehicles: all
    };
  },

  createVehicle: async (payload: CreateVehiclePayload): Promise<Vehicle> => {
    const res = await apiClient.post<ApiResponse<Vehicle>>('/api/v1/vehicles', payload);
    return res.data.data;
  },

  updateVehicle: async (id: number, payload: Partial<CreateVehiclePayload>): Promise<Vehicle> => {
    const res = await apiClient.patch<ApiResponse<Vehicle>>(`/api/v1/vehicles/${id}`, payload);
    return res.data.data;
  },

  deleteVehicle: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/vehicles/${id}`);
  },

  // Drivers
  getDrivers: async (): Promise<Driver[]> => {
    const res = await apiClient.get<ApiResponse<Driver[]>>('/api/v1/drivers');
    return res.data.data ?? [];
  },

  getPaginatedDrivers: async (filters: DriverFilters): Promise<DriversResponse> => {
    const res = await apiClient.get<ApiResponse<Driver[]>>('/api/v1/drivers');
    const all = res.data.data ?? [];

    let filtered = [...all];

    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.phone.toLowerCase().includes(q) ||
          (d.licenseNumber && d.licenseNumber.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      const statuses = filters.status.split(',').map((s) => s.trim());
      filtered = filtered.filter((d) => statuses.includes(d.status));
    }

    // License class filter
    if (filters.licenseClass && filters.licenseClass !== 'ALL') {
      const classes = filters.licenseClass.split(',').map((c) => c.trim());
      filtered = filtered.filter((d) => classes.includes(d.licenseClass));
    }

    // Sort resolution (default: newest first)
    filtered = applyCustomSort(filtered, filters.sort, (item, fieldId) => {
      return item[fieldId as keyof Driver];
    });

    const total = filtered.length;
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      drivers: paginated,
      total_drivers: total,
      all_drivers: all
    };
  },

  createDriver: async (payload: CreateDriverPayload): Promise<Driver> => {
    const res = await apiClient.post<ApiResponse<Driver>>('/api/v1/drivers', payload);
    return res.data.data;
  },

  updateDriver: async (id: number, payload: Partial<CreateDriverPayload>): Promise<Driver> => {
    const res = await apiClient.patch<ApiResponse<Driver>>(`/api/v1/drivers/${id}`, payload);
    return res.data.data;
  },

  deleteDriver: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/drivers/${id}`);
  }
};
