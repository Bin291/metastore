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
  userFullName?: string | null;
  userPhone?: string | null;
  invitationResponseDate?: string | null;
  invitationResponseStatus?: 'pending' | 'approved' | 'rejected' | null;
  rejectionReason?: string | null;
  metadata?: {
    temporaryUsername?: string;
    temporaryPassword?: string;
    [key: string]: unknown;
  } | null;
}

export interface CreateInvitePayload {
  email?: string;
  role: 'user' | 'admin';
  expiresAt?: string;
  maxUses?: number;
}

export interface AcceptInvitePayload {
  email: string;
  userFullName: string;
  userPhone: string;
}

export interface ApproveInvitePayload {
  password: string;
  username?: string;
  message?: string;
}

export interface RejectInvitePayload {
  reason?: string;
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
  getByToken: (token: string) =>
    api.get<Invite>(`/invites/${token}`),
  accept: (token: string, payload: AcceptInvitePayload) =>
    api.post<Invite, AcceptInvitePayload>(`/invites/${token}/accept`, payload),
  approve: (inviteId: string, payload: ApproveInvitePayload) =>
    api.patch<Invite, ApproveInvitePayload>(`/invites/${inviteId}/approve`, payload),
  reject: (inviteId: string, payload: RejectInvitePayload) =>
    api.patch<Invite, RejectInvitePayload>(`/invites/${inviteId}/reject`, payload),
};

