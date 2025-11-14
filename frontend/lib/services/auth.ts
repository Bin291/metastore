import { api } from '@/lib/api-client';
import { User } from '@/types/api';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AcceptInvitePayload {
  token: string;
  username: string;
  password: string;
}

export const authService = {
  login: (payload: LoginPayload) => api.post<User, LoginPayload>('/auth/login', payload),
  logout: () => api.post<{ success: boolean }, void>('/auth/logout'),
  acceptInvite: (payload: AcceptInvitePayload) =>
    api.post<User, AcceptInvitePayload>('/auth/accept-invite', payload),
  refresh: () => api.post<User, void>('/auth/refresh'),
};

