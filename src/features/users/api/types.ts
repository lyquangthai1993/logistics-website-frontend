export interface Role {
  id: number;
  name?: string;
  displayName?: string | null;
  description?: string | null;
}

export interface Status {
  id: number;
  name?: string;
}

export interface UserPhoto {
  id: string | number;
  path: string;
}

export interface User {
  id: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  username?: string | null;
  provider?: string;
  socialId?: string | null;
  role?: Role | null;
  status?: Status | null;
  photo?: UserPhoto | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  username?: string | null;
  role?: { id: number } | null;
  status?: { id: number } | null;
  photo?: { id: string | number } | null;
  provider?: string;
}

export interface UpdateUserPayload extends Partial<CreateUserPayload> {}

export interface UsersQueryParams {
  page?: number;
  limit?: number;
  roles?: string;
  search?: string;
  sort?: string;
}

export type UserFilters = UsersQueryParams;

export interface UsersResponse {
  data: User[];
  hasNextPage: boolean;
  total_users?: number;
  users?: User[];
}

export interface UserMutationPayload extends CreateUserPayload {}
