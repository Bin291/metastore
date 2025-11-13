"use client";

import { useState } from "react";
import { FileItem } from "@/types/api";
import { filesService } from "@/lib/services/files";
import { useMutation } from "@tanstack/react-query";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

interface FilePreviewProps {
  file: FileItem;
  onClose: () => void;
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const downloadMutation = useMutation({
    mutationFn: () => filesService.downloadUrl(file.id),
    onSuccess: (result) => {
      setPreviewUrl(result.url);
    },
    onError: (error) => {
      setPreviewError(error instanceof Error ? error.message : "Failed to load preview");
    },
  });

  const handleLoadPreview = () => {
    if (file.isFolder) {
      setPreviewError("Cannot preview folders");
      return;
    }

    if (!file.mimeType) {
      setPreviewError("Unknown file type");
      return;
    }

    // Preview images
    if (file.mimeType.startsWith("image/")) {
      downloadMutation.mutate();
      return;
    }

    // Preview text files
    if (
      file.mimeType.startsWith("text/") ||
      file.mimeType === "application/json" ||
      file.mimeType === "application/javascript"
    ) {
      downloadMutation.mutate();
      return;
    }

    setPreviewError("Preview not available for this file type");
  };

  const canPreview = file.mimeType && (
    file.mimeType.startsWith("image/") ||
    file.mimeType.startsWith("text/") ||
    file.mimeType === "application/json" ||
    file.mimeType === "application/javascript"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{file.name}</h3>
            <p className="text-sm text-zinc-400">{file.mimeType || "Unknown type"}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-zinc-950">
          {!previewUrl && !previewError && (
            <div className="flex flex-col items-center justify-center h-full">
              {canPreview ? (
                <>
                  <p className="text-zinc-400 mb-4">Click to preview</p>
                  <Button onClick={handleLoadPreview} disabled={downloadMutation.isPending}>
                    {downloadMutation.isPending ? "Loading..." : "Load Preview"}
                  </Button>
                </>
              ) : (
                <p className="text-zinc-400">Preview not available for this file type</p>
              )}
            </div>
          )}

          {previewError && (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-red-400 mb-4">{previewError}</p>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {previewUrl && file.mimeType?.startsWith("image/") && (
            <div className="flex items-center justify-center">
              <img
                src={previewUrl}
                alt={file.name}
                className="max-w-full max-h-[70vh] object-contain"
                onError={() => setPreviewError("Failed to load image")}
              />
            </div>
          )}

          {previewUrl && (
            file.mimeType?.startsWith("text/") ||
            file.mimeType === "application/json" ||
            file.mimeType === "application/javascript"
          ) && (
            <div className="bg-zinc-900 rounded p-4">
              <iframe
                src={previewUrl}
                className="w-full h-[70vh] border-0"
                title={file.name}
                onError={() => setPreviewError("Failed to load file content")}
              />
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 p-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const result = await downloadMutation.mutateAsync();
              window.open(result.url, "_blank", "noopener,noreferrer");
            }}
          >
            Download
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

