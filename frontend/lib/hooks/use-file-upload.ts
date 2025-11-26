"use client";

import { useCallback } from "react";
import { chunkedUploadService } from "../services/chunked-upload";
import { useUploadContext } from "../contexts/upload-context";

export function useFileUpload() {
  const { updateUpload } = useUploadContext();

  const uploadFile = useCallback(
    async (
      file: File,
      options: {
        path?: string;
        visibility?: 'private' | 'public';
        parentId?: string;
      } = {}
    ) => {
      const uploadKey = `${file.name}-${Date.now()}`;

      try {
        const fileId = await chunkedUploadService.uploadFile(file, {
          ...options,
          onProgress: (progress) => {
            updateUpload(uploadKey, progress);
          },
        });

        return fileId;
      } catch (error) {
        console.error('Upload failed:', error);
        throw error;
      }
    },
    [updateUpload]
  );

  return { uploadFile };
}
