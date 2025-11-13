import { api } from '@/lib/api-client';
import { PaginatedResponse } from '@/types/api';

export interface User {
  id: string;
  username: string;
  email?: string | null;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'suspended';
}

function toQueryString(params: Record<string, unknown>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    query.set(key, String(value));
  });
  return query.toString();
}

export const usersService = {
  list: (params: ListUsersParams) => {
    const query = toQueryString(params as Record<string, unknown>);
    return api.get<PaginatedResponse<User>>(
      `/users${query ? `?${query}` : ''}`,
    );
  },
  updateRole: (userId: string, role: 'admin' | 'user') =>
    api.patch<User, { role: 'admin' | 'user' }>(`/users/${userId}/role`, {
      role,
    }),
  updateStatus: (userId: string, status: 'active' | 'suspended') =>
    api.patch<User, { status: 'active' | 'suspended' }>(
      `/users/${userId}/status`,
      { status },
    ),
};

