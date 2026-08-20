import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/lib/api-error';
import type {
  User,
  UserFilters,
  UsersResponse,
  CreateUserPayload,
  UpdateUserPayload
} from './types';

export async function getUsers(filters: UserFilters = {}): Promise<UsersResponse> {
  const params: Record<string, string | number | boolean | undefined> = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 10
  };

  if (filters.roles) {
    const roleId = Number(filters.roles);
    if (!isNaN(roleId) && roleId > 0) {
      params.filters = JSON.stringify({ roles: [{ id: roleId }] });
    }
  }

  if (filters.sort) {
    params.sort = filters.sort;
  }

  const res = await apiClient.get<ApiResponse<User[]>>('/api/v1/users', { params });
  const usersList = res.data.data ?? [];
  const hasNextPage = res.data.meta?.hasNextPage ?? false;

  return {
    data: usersList,
    hasNextPage,
    total_users: usersList.length,
    users: usersList
  };
}

export async function getUserById(id: number): Promise<User> {
  const res = await apiClient.get<ApiResponse<User>>(`/api/v1/users/${id}`);
  return res.data.data;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const res = await apiClient.post<ApiResponse<User>>('/api/v1/users', payload);
  return res.data.data;
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
  const res = await apiClient.patch<ApiResponse<User>>(`/api/v1/users/${id}`, payload);
  return res.data.data;
}

export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/users/${id}`);
}
