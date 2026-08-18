import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createTrip,
  createSplitTrips,
  confirmTrip,
  updateTrip,
  deleteTrip
} from './service';
import { tripKeys } from './queries';
import { orderKeys } from '@/features/orders/api/queries';
import { fleetKeys } from '@/features/fleet/api/queries';
import { ordersApi } from '@/features/orders/api/service';
import type { CreateTripPayload, CreateSplitTripsPayload, UpdateTripPayload } from './types';

export function useCreateTripMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTripPayload) => createTrip(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tripKeys.all }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
        queryClient.invalidateQueries({ queryKey: fleetKeys.all })
      ]);
    }
  });
}

export function useCreateSplitTripsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSplitTripsPayload) => createSplitTrips(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tripKeys.all }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
        queryClient.invalidateQueries({ queryKey: fleetKeys.all })
      ]);
    }
  });
}

export function useConfirmTripMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => confirmTrip(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tripKeys.all }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all })
      ]);
    }
  });
}

export function useUpdateTripMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<UpdateTripPayload> }) =>
      updateTrip(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
    }
  });
}

export function useDeleteTripMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTrip(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tripKeys.all }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all })
      ]);
    }
  });
}

export function useNoVehicleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason?: string }) =>
      ordersApi.markNoVehicle(orderId, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
        queryClient.invalidateQueries({ queryKey: tripKeys.all })
      ]);
    }
  });
}
