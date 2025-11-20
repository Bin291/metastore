"use client";

import { useState, useEffect } from "react";
import { FileItem } from "@/types/api";
import { filesService } from "@/lib/services/files";
import { useMutation } from "@tanstack/react-query";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { FiZoomIn, FiZoomOut, FiMaximize2 } from "react-icons/fi";
import { CustomVideoPlayer } from "./custom-video-player";
import { CustomAudioPlayer } from "./custom-audio-player";

interface FilePreviewProps {
  file: FileItem;
  onClose: () => void;
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const downloadMutation = useMutation({
    mutationFn: () => filesService.downloadUrl(file.id),
    onSuccess: (result) => {
      setPreviewUrl(result.url);
    },
    onError: (error) => {
      setPreviewError(error instanceof Error ? error.message : "Failed to load preview");
    },
  });

  // Auto-load preview when component mounts
  useEffect(() => {
    if (file.isFolder) {
      setPreviewError("Cannot preview folders");
      return;
    }

    if (!file.mimeType) {
      setPreviewError("Unknown file type");
      return;
    }

    // Auto-preview images, videos, audio
    if (
      file.mimeType.startsWith("image/") ||
      file.mimeType.startsWith("video/") ||
      file.mimeType.startsWith("audio/")
    ) {
      downloadMutation.mutate();
      return;
    }

    // Auto-preview text files
    if (
      file.mimeType.startsWith("text/") ||
      file.mimeType === "application/json" ||
      file.mimeType === "application/javascript"
    ) {
      downloadMutation.mutate();
      return;
    }

    setPreviewError("Preview not available for this file type");
  }, [file.id, file.isFolder, file.mimeType]);

  const canPreview = file.mimeType && (
    file.mimeType.startsWith("image/") ||
    file.mimeType.startsWith("video/") ||
    file.mimeType.startsWith("audio/") ||
    file.mimeType.startsWith("text/") ||
    file.mimeType === "application/json" ||
    file.mimeType === "application/javascript"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-2 sm:p-4">
      <Card className="w-full max-w-7xl max-h-[98vh] overflow-hidden flex flex-col">
        {/* Header - Compact */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 flex-shrink-0">
          <div className="flex-1 min-w-0 mr-2">
            <h3 className="text-base font-semibold text-white truncate">{file.name}</h3>
            <p className="text-xs text-zinc-400">{file.mimeType || "Unknown type"}</p>
          </div>
          {file.mimeType?.startsWith("image/") && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                disabled={zoom <= 0.5}
                className="h-7 w-7 p-0"
              >
                <FiZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-zinc-400 min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                disabled={zoom >= 3}
                className="h-7 w-7 p-0"
              >
                <FiZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(1)}
                className="h-7 w-7 p-0"
              >
                <FiMaximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <Button variant="ghost" onClick={onClose} className="h-7 w-7 p-0 text-lg">
            ✕
          </Button>
        </div>

        {/* Content - Fill available space */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-zinc-950 p-2">
          {downloadMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-3"></div>
              <p className="text-zinc-400 text-sm">Loading preview...</p>
            </div>
          )}

          {previewError && !downloadMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-red-400 mb-3 text-sm">{previewError}</p>
              <Button variant="outline" onClick={onClose} size="sm">
                Close
              </Button>
            </div>
          )}

          {previewUrl && file.mimeType?.startsWith("image/") && (
            <div className="w-full h-full overflow-auto flex items-center justify-center">
              <img
                src={previewUrl}
                alt={file.name}
                className="object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom})`,
                  maxWidth: zoom === 1 ? '100%' : 'none',
                  maxHeight: zoom === 1 ? '100%' : 'none',
                }}
                onError={() => setPreviewError("Failed to load image")}
              />
            </div>
          )}

          {previewUrl && file.mimeType?.startsWith("video/") && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="w-full" style={{ maxWidth: '1280px', aspectRatio: '16/9' }}>
                <CustomVideoPlayer src={previewUrl} className="w-full h-full" />
              </div>
            </div>
          )}

          {previewUrl && file.mimeType?.startsWith("audio/") && (
            <div className="w-full h-full flex items-center justify-center">
              <CustomAudioPlayer src={previewUrl} filename={file.name} className="w-full max-w-2xl" />
            </div>
          )}

          {previewUrl && (
            file.mimeType?.startsWith("text/") ||
            file.mimeType === "application/json" ||
            file.mimeType === "application/javascript"
          ) && (
            <div className="bg-zinc-900 rounded w-full h-full">
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title={file.name}
                onError={() => setPreviewError("Failed to load file content")}
              />
            </div>
          )}
        </div>

        {/* Footer - Compact */}
        <div className="border-t border-zinc-800 px-3 py-2 flex justify-end gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (previewUrl) {
                window.open(previewUrl, "_blank", "noopener,noreferrer");
              } else {
                const result = await downloadMutation.mutateAsync();
                window.open(result.url, "_blank", "noopener,noreferrer");
              }
            }}
            disabled={downloadMutation.isPending}
          >
            Download
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

