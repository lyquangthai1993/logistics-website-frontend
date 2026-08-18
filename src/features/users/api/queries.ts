import { queryOptions } from '@tanstack/react-query';
import { getUsers, getUserById } from './service';
import type { User, UserFilters } from './types';

export type { User };

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters = {}) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const
};

export const usersQueryOptions = (filters: UserFilters = {}) =>
  queryOptions({
    queryKey: userKeys.list(filters),
    queryFn: () => getUsers(filters)
  });

export const userDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: userKeys.detail(id),
    queryFn: () => getUserById(id),
    enabled: !!id
  });
