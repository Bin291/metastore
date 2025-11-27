"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { UploadProgress } from "@/lib/services/chunked-upload";

interface UploadContextType {
  uploads: Map<string, UploadProgress>;
  addUpload: (key: string, progress: UploadProgress) => void;
  updateUpload: (key: string, progress: UploadProgress) => void;
  removeUpload: (key: string) => void;
  clearCompleted: () => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());

  const addUpload = useCallback((key: string, progress: UploadProgress) => {
    setUploads(prev => new Map(prev).set(key, progress));
  }, []);

  const updateUpload = useCallback((key: string, progress: UploadProgress) => {
    setUploads(prev => {
      const next = new Map(prev);
      next.set(key, progress);
      return next;
    });
  }, []);

  const removeUpload = useCallback((key: string) => {
    setUploads(prev => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads(prev => {
      const next = new Map(prev);
      Array.from(next.entries()).forEach(([key, upload]) => {
        if (upload.status === 'completed') {
          next.delete(key);
        }
      });
      return next;
    });
  }, []);

  return (
    <UploadContext.Provider value={{ uploads, addUpload, updateUpload, removeUpload, clearCompleted }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUploadContext() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUploadContext must be used within UploadProvider");
  }
  return context;
}
