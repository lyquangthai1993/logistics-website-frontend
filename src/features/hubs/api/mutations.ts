import { mutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { createHub, updateHub, toggleActiveHub, deleteHub } from './service';
import { hubKeys } from './queries';
import type { CreateHubPayload, UpdateHubPayload } from './types';

export const createHubMutation = mutationOptions({
  mutationFn: (payload: CreateHubPayload) => createHub(payload),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: hubKeys.all });
  }
});

export const updateHubMutation = mutationOptions({
  mutationFn: ({ id, payload }: { id: number; payload: UpdateHubPayload }) =>
    updateHub(id, payload),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: hubKeys.all });
  }
});

export const toggleActiveHubMutation = mutationOptions({
  mutationFn: (id: number) => toggleActiveHub(id),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: hubKeys.all });
  }
});

export const deleteHubMutation = mutationOptions({
  mutationFn: (id: number) => deleteHub(id),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: hubKeys.all });
  }
});

// Reusable custom mutation hooks with built-in cache invalidation
export function useCreateHubMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    ...createHubMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hubKeys.all });
    }
  });
}

export function useUpdateHubMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    ...updateHubMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hubKeys.all });
    }
  });
}

export function useToggleActiveHubMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    ...toggleActiveHubMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hubKeys.all });
    }
  });
}

export function useDeleteHubMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    ...deleteHubMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hubKeys.all });
    }
  });
}
