import { api } from '@/lib/api-client';
import { PaginatedResponse } from '@/types/api';

export type InviteStatus = 'pending' | 'used' | 'expired' | 'revoked';

export interface Invite {
  id: string;
  token: string;
  email: string;
  role: 'user' | 'admin';
  status: InviteStatus;
  expiresAt?: string | null;
  maxUses?: number | null;
  uses: number;
  createdAt: string;
}

export interface CreateInvitePayload {
  email: string;
  role: 'user' | 'admin';
  expiresAt?: string;
  maxUses?: number;
}

export interface ListInvitesParams {
  page?: number;
  limit?: number;
  status?: InviteStatus;
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

export const invitesService = {
  create: (payload: CreateInvitePayload) =>
    api.post<Invite, CreateInvitePayload>('/invites', payload),
  list: (params: ListInvitesParams) => {
    const query = toQueryString(params as Record<string, unknown>);
    return api.get<PaginatedResponse<Invite>>(
      `/invites${query ? `?${query}` : ''}`,
    );
  },
  revoke: (inviteId: string) =>
    api.patch<Invite, void>(`/invites/${inviteId}/revoke`, undefined),
};
