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

export interface CreateUserPayload {
  username: string;
  password: string;
  email: string;
  phone?: string;
  role: 'admin' | 'user';
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
  create: (payload: CreateUserPayload) =>
    api.post<User, CreateUserPayload>('/users/invite', payload),
  updateRole: (userId: string, role: 'admin' | 'user') =>
    api.patch<User, { role: 'admin' | 'user' }>(`/users/${userId}/role`, {
      role,
    }),
  updateStatus: (userId: string, status: 'active' | 'suspended') =>
    api.patch<User, { status: 'active' | 'suspended' }>(
      `/users/${userId}/status`,
      { status },
    ),
  updateProfile: (data: {
    username?: string;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  }) => api.patch<User, typeof data>('/users/me', data),
  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) => api.post<{ success: boolean; message: string }, typeof data>('/users/me/change-password', data),
  getAvatarUploadUrl: (data: {
    fileName: string;
    contentType: string;
    fileSize: number;
  }) => api.post<{ uploadUrl: string; key: string; expiresIn: number }, typeof data>('/users/me/avatar/upload-url', data),
  getAvatarUrl: () => api.get<{ url: string | null }>('/users/me/avatar/url'),
  getAvatarDirectUrl: () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    return `${baseUrl}/users/me/avatar`;
  },
};

