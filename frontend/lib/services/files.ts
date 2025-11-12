import { api } from '@/lib/api-client';
import { FileItem, PaginatedResponse, FileVisibility } from '@/types/api';

export interface ListFilesParams {
  page?: number;
  limit?: number;
  status?: string;
  visibility?: FileVisibility;
  ownerId?: string;
  parentId?: string | null;
  search?: string;
}

export interface RequestUploadPayload {
  path: string;
  mimeType?: string;
  size?: number;
  isFolder: boolean;
  checksum?: string;
  parentId?: string;
}

export interface RegisterFilePayload {
  name: string;
  path: string;
  isFolder: boolean;
  size?: number;
  mimeType?: string;
  checksum?: string;
  parentId?: string;
  visibility?: FileVisibility;
}

export interface ApproveFilePayload {
  visibility?: FileVisibility;
  destinationPath?: string;
  moderationNotes?: string;
}

export interface RejectFilePayload {
  reason?: string;
}

export interface PresignedUrlResponse {
  url: string;
  bucket: string;
  key: string;
  expiresIn: number;
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

export const filesService = {
  list: (params: ListFilesParams) => {
    const queryString = toQueryString(params);
    return api.get<PaginatedResponse<FileItem>>(
      `/files${queryString ? `?${queryString}` : ''}`,
    );
  },
  requestUploadUrl: (payload: RequestUploadPayload) =>
    api.post<PresignedUrlResponse | null>('/files/upload-url', payload),
  registerFile: (payload: RegisterFilePayload) =>
    api.post<FileItem>('/files', payload),
  updateFile: (fileId: string, payload: Partial<RegisterFilePayload>) =>
    api.patch<FileItem>(`/files/${fileId}`, payload),
  approveFile: (fileId: string, payload: ApproveFilePayload) =>
    api.patch<FileItem>(`/files/${fileId}/approve`, payload),
  rejectFile: (fileId: string, payload: RejectFilePayload) =>
    api.patch<FileItem>(`/files/${fileId}/reject`, payload),
  deleteFile: (fileId: string) =>
    api.delete<{ success: boolean }>(`/files/${fileId}`),
  downloadUrl: (fileId: string) =>
    api.get<PresignedUrlResponse>(`/files/${fileId}/download-url`),
};

