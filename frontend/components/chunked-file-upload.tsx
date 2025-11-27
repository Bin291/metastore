"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FiUpload } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFileUpload } from "@/lib/hooks/use-file-upload";

export function ChunkedFileUpload({
  currentFolderId,
  visibility = "private",
}: {
  currentFolderId: string | null;
  visibility?: "private" | "public";
}) {
  const queryClient = useQueryClient();
  const { uploadFile } = useFileUpload();
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Upload files in parallel (up to 2 at a time to avoid overwhelming the browser)
    const batchSize = 2;
    for (let i = 0; i < fileArray.length; i += batchSize) {
      const batch = fileArray.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map((file) =>
          uploadFile(file, {
            path: file.name,
            visibility,
            parentId: currentFolderId || undefined,
          })
        )
      );

      // Refresh file list after each batch
      queryClient.invalidateQueries({ queryKey: ["files"] });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${
        isDragActive
          ? "border-indigo-500 bg-indigo-500/10"
          : "border-zinc-700 hover:border-zinc-600"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="p-8 text-center">
        <FiUpload className="h-12 w-12 mx-auto mb-4 text-zinc-400" />
        <h3 className="text-lg font-semibold text-white mb-2">
          Upload Files
        </h3>
        <p className="text-sm text-zinc-400 mb-4">
          Drag and drop files here, or click to browse
        </p>
        
        <input
          type="file"
          multiple
          className="hidden"
          id="file-upload-chunked"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        
        <label htmlFor="file-upload-chunked">
          <Button variant="default" size="lg" type="button">
            Choose Files
          </Button>
        </label>

        <p className="text-xs text-zinc-500 mt-4">
          Large files will be uploaded in chunks for better reliability
        </p>
      </div>
    </Card>
  );
}
