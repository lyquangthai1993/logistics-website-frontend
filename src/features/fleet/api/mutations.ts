import { fleetApi } from './service';
import { fleetKeys } from './queries';
import { getQueryClient } from '@/lib/query-client';
import type { CreateVehiclePayload, CreateDriverPayload } from './types';

export const createVehicleMutation = {
  mutationFn: (data: CreateVehiclePayload) => fleetApi.createVehicle(data),
  onSuccess: () => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: fleetKeys.allVehicles });
    qc.invalidateQueries({ queryKey: fleetKeys.all });
  }
};

export const updateVehicleMutation = {
  mutationFn: ({ id, data }: { id: number; data: Partial<CreateVehiclePayload> }) =>
    fleetApi.updateVehicle(id, data),
  onSuccess: () => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: fleetKeys.allVehicles });
    qc.invalidateQueries({ queryKey: fleetKeys.all });
  }
};

export const deleteVehicleMutation = {
  mutationFn: (id: number) => fleetApi.deleteVehicle(id),
  onSuccess: () => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: fleetKeys.allVehicles });
    qc.invalidateQueries({ queryKey: fleetKeys.all });
  }
};

export const createDriverMutation = {
  mutationFn: (data: CreateDriverPayload) => fleetApi.createDriver(data),
  onSuccess: () => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: fleetKeys.allDrivers });
    qc.invalidateQueries({ queryKey: fleetKeys.all });
  }
};

export const updateDriverMutation = {
  mutationFn: ({ id, data }: { id: number; data: Partial<CreateDriverPayload> }) =>
    fleetApi.updateDriver(id, data),
  onSuccess: () => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: fleetKeys.allDrivers });
    qc.invalidateQueries({ queryKey: fleetKeys.all });
  }
};

export const deleteDriverMutation = {
  mutationFn: (id: number) => fleetApi.deleteDriver(id),
  onSuccess: () => {
    const qc = getQueryClient();
    qc.invalidateQueries({ queryKey: fleetKeys.allDrivers });
    qc.invalidateQueries({ queryKey: fleetKeys.all });
  }
};
