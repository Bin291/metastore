"use client";

import { useEffect, useState } from "react";
import { FiFile, FiX, FiCheck, FiAlertCircle, FiLoader } from "react-icons/fi";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { type UploadProgress } from "@/lib/services/chunked-upload";

interface UploadProgressItemProps {
  progress: UploadProgress;
  onCancel?: () => void;
}

export function UploadProgressItem({ progress, onCancel }: UploadProgressItemProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (progress.status === 'uploading') {
      const interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [progress.status]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <FiCheck className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <FiAlertCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
      case 'processing':
        return <FiLoader className="h-4 w-4 text-indigo-500 animate-spin" />;
      default:
        return <FiFile className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'initializing':
        return 'Initializing...';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return progress.processingMessage || 'Processing...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return progress.error || 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return '';
    }
  };

  const showProgress = ['uploading', 'processing'].includes(progress.status);

  return (
    <div className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIcon()}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {/* File name and status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {progress.fileName}
            </p>
            <p className="text-xs text-zinc-400">
              {getStatusText()}
            </p>
          </div>

          {progress.status === 'uploading' && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
            >
              <FiX className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="space-y-1">
            <Progress value={progress.percentage} className="h-1.5" />
            
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                {formatBytes(progress.uploadedSize)} / {formatBytes(progress.totalSize)}
              </span>
              <span className="flex items-center gap-2">
                {progress.status === 'uploading' && progress.speed > 0 && (
                  <>
                    <span>{formatSpeed(progress.speed)}</span>
                    {progress.eta > 0 && (
                      <span>• {formatTime(progress.eta)} remaining</span>
                    )}
                  </>
                )}
                {progress.status === 'uploading' && (
                  <span>• {Math.round(progress.percentage)}%</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Success message */}
        {progress.status === 'completed' && (
          <p className="text-xs text-green-500">
            Upload completed in {formatTime(timeElapsed)}
          </p>
        )}

        {/* Error message */}
        {progress.status === 'failed' && progress.error && (
          <p className="text-xs text-red-500">
            {progress.error}
          </p>
        )}
      </div>
    </div>
  );
}

interface UploadProgressPanelProps {
  uploads: Map<string, UploadProgress>;
  onCancelUpload?: (uploadKey: string) => void;
  onClose?: () => void;
}

export function UploadProgressPanel({ 
  uploads, 
  onCancelUpload,
  onClose 
}: UploadProgressPanelProps) {
  const uploadArray = Array.from(uploads.entries());
  const hasActiveUploads = uploadArray.some(([, p]) => 
    ['initializing', 'uploading', 'processing'].includes(p.status)
  );

  if (uploadArray.length === 0) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-[500px] overflow-hidden flex flex-col shadow-2xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Upload Progress
          </h3>
          <p className="text-xs text-zinc-400">
            {hasActiveUploads 
              ? `${uploadArray.filter(([, p]) => ['uploading', 'processing'].includes(p.status)).length} active`
              : 'All uploads completed'
            }
          </p>
        </div>
        {!hasActiveUploads && onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <FiX className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Upload list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {uploadArray.map(([key, progress]) => (
          <UploadProgressItem
            key={key}
            progress={progress}
            onCancel={onCancelUpload ? () => onCancelUpload(key) : undefined}
          />
        ))}
      </div>
    </Card>
  );
}
