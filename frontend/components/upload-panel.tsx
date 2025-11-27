"use client";

import { useState } from "react";
import { FiChevronUp, FiChevronDown, FiX, FiUpload } from "react-icons/fi";
import { useUploadContext } from "@/lib/contexts/upload-context";
import { Progress } from "./ui/progress";

export function UploadPanel() {
  const { uploads } = useUploadContext();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  const uploadList = Array.from(uploads.entries());
  const activeUploads = uploadList.filter(([, upload]) => 
    upload.status === 'uploading' || upload.status === 'processing'
  );
  const completedUploads = uploadList.filter(([, upload]) => upload.status === 'completed');
  const failedUploads = uploadList.filter(([, upload]) => upload.status === 'failed');

  // Don't show if no uploads
  if (uploadList.length === 0 || isClosed) {
    return null;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds <= 0) return '--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>;
      case 'processing':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>;
      case 'completed':
        return <span className="text-green-500">✓</span>;
      case 'failed':
        return <span className="text-red-500">✗</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <FiUpload className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-white">
            {activeUploads.length > 0 ? (
              <>Uploading {activeUploads.length} file{activeUploads.length > 1 ? 's' : ''}</>
            ) : completedUploads.length > 0 ? (
              <>Upload complete ({completedUploads.length})</>
            ) : (
              <>Upload failed ({failedUploads.length})</>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            {isMinimized ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsClosed(true)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Upload List */}
      {!isMinimized && (
        <div className="max-h-96 overflow-y-auto">
          {uploadList.map(([key, upload]) => (
            <div
              key={key}
              className="px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">
                  {getStatusIcon(upload.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white truncate">
                      {upload.fileName}
                    </p>
                  </div>

                  {upload.status === 'uploading' && (
                    <>
                      <Progress value={upload.percentage} className="h-1 mb-2" />
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>
                          {formatBytes(upload.uploadedSize)} / {formatBytes(upload.totalSize)}
                        </span>
                        <span className="flex items-center gap-2">
                          <span>{formatSpeed(upload.speed)}</span>
                          <span>·</span>
                          <span>{formatTime(upload.eta)} left</span>
                        </span>
                      </div>
                    </>
                  )}

                  {upload.status === 'processing' && (
                    <>
                      <Progress value={100} className="h-1 mb-2" />
                      <p className="text-xs text-yellow-400">
                        {upload.processingMessage || 'Processing...'}
                      </p>
                    </>
                  )}

                  {upload.status === 'completed' && (
                    <p className="text-xs text-green-400">
                      {formatBytes(upload.totalSize)} - Upload complete
                    </p>
                  )}

                  {upload.status === 'failed' && (
                    <p className="text-xs text-red-400">
                      {upload.error || 'Upload failed'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Summary (when minimized) */}
      {isMinimized && activeUploads.length > 0 && (
        <div className="px-4 py-2 bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Progress 
                value={
                  activeUploads.reduce((sum, [, u]) => sum + u.percentage, 0) / activeUploads.length
                } 
                className="h-1" 
              />
            </div>
            <span className="text-xs text-zinc-400">
              {Math.round(activeUploads.reduce((sum, [, u]) => sum + u.percentage, 0) / activeUploads.length)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
