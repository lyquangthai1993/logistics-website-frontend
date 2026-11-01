import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/lib/api-error';
import { useAuthStore } from '@/stores/use-auth-store';
import type {
  User,
  UserFilters,
  UsersResponse,
  CreateUserPayload,
  UpdateUserPayload
} from './types';

export interface LoginAsResponse {
  token: string;
  refreshToken: string;
  tokenExpires: number;
  user: User;
}

function getSuperAdminAuthHeaders(): Record<string, string> | undefined {
  if (typeof window === 'undefined') return undefined;
  const impersonatorToken = useAuthStore.getState()?.impersonator?.accessToken;
  if (impersonatorToken) {
    return { Authorization: `Bearer ${impersonatorToken}` };
  }
  return undefined;
}

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

  const headers = getSuperAdminAuthHeaders();
  const res = await apiClient.get<ApiResponse<User[]>>('/api/v1/users', {
    params,
    ...(headers ? { headers } : {})
  });
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

export async function loginAsUser(userId: number | string): Promise<LoginAsResponse> {
  const headers = getSuperAdminAuthHeaders();
  const res = await apiClient.post<any>(
    `/api/v1/auth/login-as/${userId}`,
    {},
    headers ? { headers } : undefined
  );
  const payload = res.data?.data ?? res.data ?? {};
  return {
    token: payload.token || payload.access_token,
    refreshToken: payload.refreshToken || payload.refresh_token,
    tokenExpires: payload.tokenExpires,
    user: payload.user
  };
}
