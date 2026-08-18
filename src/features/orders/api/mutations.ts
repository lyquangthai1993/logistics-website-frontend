import { mutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import {
  createOrder,
  updateOrder,
  submitOrder,
  markNoVehicle,
  deleteOrder,
  generateOrderCode
} from './service';
import { orderKeys } from './queries';
import type { CreateOrderPayload, UpdateOrderPayload } from './types';

export const createOrderMutation = mutationOptions({
  mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: orderKeys.all });
  }
});

export const updateOrderMutation = mutationOptions({
  mutationFn: ({ id, payload }: { id: number; payload: UpdateOrderPayload }) =>
    updateOrder(id, payload),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: orderKeys.all });
  }
});

export const submitOrderToFleetMutation = mutationOptions({
  mutationFn: (id: number) => submitOrder(id),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: orderKeys.all });
  }
});

export const markNoVehicleMutation = mutationOptions({
  mutationFn: ({ id, reason }: { id: number; reason?: string }) => markNoVehicle(id, reason),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: orderKeys.all });
  }
});

export const deleteOrderMutation = mutationOptions({
  mutationFn: (id: number) => deleteOrder(id),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: orderKeys.all });
  }
});

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    ...createOrderMutation,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
    }
  });
}

export function useUpdateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    ...updateOrderMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
    }
  });
}

export function useSubmitOrderToFleetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    ...submitOrderToFleetMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
    }
  });
}

export function useMarkNoVehicleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    ...markNoVehicleMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
    }
  });
}

export function useDeleteOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    ...deleteOrderMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
    }
  });
}

export function useGenerateOrderCodeMutation() {
  return useMutation({
    mutationFn: (prefix?: string) => generateOrderCode(prefix)
  });
}
