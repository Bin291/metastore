"use client";

import { useState, useCallback, useRef } from "react";
import { chunkedUploadService, type UploadProgress } from "@/lib/services/chunked-upload";

export function useChunkedUpload() {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const uploadKeysRef = useRef<Map<File, string>>(new Map());

  const handleProgress = useCallback((uploadKey: string, progress: UploadProgress) => {
    setUploads(prev => {
      const next = new Map(prev);
      next.set(uploadKey, progress);
      return next;
    });
  }, []);

  const uploadFile = useCallback(async (
    file: File,
    options: {
      path?: string;
      visibility?: 'private' | 'public';
      parentId?: string;
    } = {}
  ): Promise<string> => {
    const uploadKey = `${file.name}-${Date.now()}`;
    uploadKeysRef.current.set(file, uploadKey);

    try {
      const fileId = await chunkedUploadService.uploadFile(file, {
        ...options,
        onProgress: (progress) => handleProgress(uploadKey, progress),
      });

      // Keep completed uploads for a bit before removing
      setTimeout(() => {
        setUploads(prev => {
          const next = new Map(prev);
          next.delete(uploadKey);
          return next;
        });
        uploadKeysRef.current.delete(file);
      }, 5000);

      return fileId;
    } catch (error) {
      // Keep failed uploads visible
      throw error;
    }
  }, [handleProgress]);

  const cancelUpload = useCallback((uploadKey: string) => {
    chunkedUploadService.cancelUpload(uploadKey);
    setUploads(prev => {
      const next = new Map(prev);
      const progress = next.get(uploadKey);
      if (progress) {
        next.set(uploadKey, { ...progress, status: 'cancelled' });
      }
      return next;
    });

    // Remove cancelled upload after a delay
    setTimeout(() => {
      setUploads(prev => {
        const next = new Map(prev);
        next.delete(uploadKey);
        return next;
      });
    }, 2000);
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads((prev) => {
      const next = new Map(prev);
      for (const [key, progress] of next.entries()) {
        if (progress.status === 'completed') {
          next.delete(key);
        }
      }
      return next;
    });
  }, []);

  return {
    uploads,
    uploadFile,
    cancelUpload,
    clearCompleted,
  };
}
