export type UserRole = 'admin' | 'staff' | 'user';
export type UserStatus = 'active' | 'disabled' | 'pending';
export type SubscriptionPlan = 'free' | 'plus' | 'pro';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
  bucketPrefix: string;
  profileMetadata?: Record<string, unknown> | null;
  lastLoginAt?: string | null;
  subscriptionPlan?: SubscriptionPlan;
  storageQuotaBytes?: string;
  storageUsedBytes?: string;
  subscriptionExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FileStatus = 'pending' | 'approved' | 'rejected';
export type FileVisibility = 'private' | 'public';
export type BucketType = 'private' | 'public' | 'pending' | 'rejected' | 'sandbox';

export interface FileItem {
  id: string;
  name: string;
  path: string;
  storageKey: string;
  isFolder: boolean;
  size: string;
  mimeType?: string | null;
  status: FileStatus;
  bucketType: BucketType;
  visibility: FileVisibility;
  ownerId: string;
  parentId?: string | null;
  metadata?: Record<string, unknown> | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
}

export type SharePermission = 'view' | 'full';
export type ShareResourceType = 'file' | 'folder';

export interface ShareResource {
  id: string;
  name: string;
  mimeType?: string | null;
  isFolder: boolean;
  size: string;
  visibility: FileVisibility;
}

export interface ShareLink {
  id: string;
  token: string;
  resourceId: string;
  resourceType: ShareResourceType;
  permission: SharePermission;
  active: boolean;
  expiresAt?: string | null;
  lastAccessedAt?: string | null;
  accessCount: number;
  createdAt: string;
  resource?: ShareResource;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

