import { api } from '@/lib/api-client';
import {
  PaginatedResponse,
  ShareLink,
  SharePermission,
} from '@/types/api';

export interface CreateShareLinkPayload {
  resourceId: string;
  permission: SharePermission;
  expiresAt?: string;
  password?: string;
}

export interface ListShareLinksParams {
  page?: number;
  limit?: number;
  ownerId?: string;
  active?: boolean;
}

export interface ToggleShareLinkPayload {
  active: boolean;
}

export interface AccessShareLinkPayload {
  password?: string;
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

export const shareLinksService = {
  create: (payload: CreateShareLinkPayload) =>
    api.post<ShareLink>('/share-links', payload),
  list: (params: ListShareLinksParams) => {
    const query = toQueryString(params);
    return api.get<PaginatedResponse<ShareLink>>(
      `/share-links${query ? `?${query}` : ''}`,
    );
  },
  toggle: (linkId: string, payload: ToggleShareLinkPayload) =>
    api.patch<ShareLink>(`/share-links/${linkId}/toggle`, payload),
  access: (token: string, payload: AccessShareLinkPayload) =>
    api.post<ShareLink>(`/share-links/token/${token}/access`, payload),
};

