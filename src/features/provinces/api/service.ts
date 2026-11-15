import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-error';
import type { ProvinceReference } from './types';

export async function getProvinceReferences(): Promise<ProvinceReference[]> {
  const response = await apiClient.get<ApiResponse<ProvinceReference[]>>(
    '/api/v1/province-references'
  );
  return response.data.data ?? [];
}
