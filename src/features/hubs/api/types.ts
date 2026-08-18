export interface HubVehicle {
  id: number;
  plateNumber: string;
  model?: string | null;
  type?: string | null;
  status?: string | null;
}

export interface Hub {
  id: number;
  code: string;
  name: string;
  city: string;
  address?: string | null;
  contactPhone?: string | null;
  managerName?: string | null;
  isActive: boolean;
  vehicles?: HubVehicle[];
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type PaginatedHubsResponse = PaginatedResult<Hub>;

export interface QueryHubParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sort?: string;
}

export type HubFilters = QueryHubParams;

export interface CreateHubPayload {
  code: string;
  name: string;
  city: string;
  address?: string;
  contactPhone?: string;
  managerName?: string;
  isActive?: boolean;
}

export interface UpdateHubPayload extends Partial<CreateHubPayload> {}

export interface HubMetrics {
  total: number;
  active: number;
  inactive: number;
  totalVehicles: number;
}

export interface DeleteHubResponse {
  success: boolean;
  message: string;
}
