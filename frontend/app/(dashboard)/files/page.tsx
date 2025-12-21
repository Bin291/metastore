"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiUpload,
  FiFolder,
  FiFolderPlus,
  FiEye,
  FiDownload,
  FiTrash2,
  FiHome,
  FiImage,
  FiVideo,
  FiMusic,
  FiFileText,
  FiFile,
  FiPackage,
  FiChevronRight,
  FiArrowUp,
  FiLock,
  FiGlobe,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";
import { filesService } from "@/lib/services/files";
import { chunkedUploadService } from "@/lib/services/chunked-upload";
import { FileItem } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatRelative } from "@/lib/time";
import { formatFileSize } from "@/lib/utils/format";
import { FilePreview } from "@/components/file-preview";
import { Pagination } from "@/components/ui/pagination";
import { LoadingSpinner } from "@/components/ui/loading";
import { ShareDialog } from "@/components/share-dialog";

// Helper function to get image dimensions
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

export default function FilesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadVisibility, setUploadVisibility] = useState<"private" | "public">("private");
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const limit = 20;

  // Adaptive chunk size: more, smaller chunks as files get larger
  function computeAdaptiveChunkSize(fileSize: number) {
    const minChunk = 2 * 1024 * 1024; // 2MB
    const maxChunk = 8 * 1024 * 1024; // 8MB
    const targetChunks = 100;
    const rawSize = Math.max(minChunk, Math.min(maxChunk, Math.floor(fileSize / targetChunks)));
    return rawSize;
  }

  const filesQuery = useQuery({
    queryKey: ["files", { page: currentPage, limit, search, parentId: currentFolderId }],
    queryFn: () =>
      filesService.list({
        page: currentPage,
        limit,
        search: search || undefined,
        parentId: currentFolderId !== null ? currentFolderId : undefined,
        status: "approved",
      }),
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const tempId = Math.random().toString(36);
      setUploadProgress((prev) => ({ ...prev, [tempId]: 0 }));

      try {
        const path = file.name;
        
        // Get image dimensions if it's an image file (not GIF to avoid issues)
        let metadata: Record<string, any> = {};
        if (file.type.startsWith('image/') && !file.type.includes('gif')) {
          try {
            const dimensions = await getImageDimensions(file);
            metadata = {
              width: dimensions.width,
              height: dimensions.height,
            };
          } catch (error) {
            console.warn('Failed to get image dimensions:', error);
          }
        }

        const isMedia = file.type.startsWith("video/") || file.type.startsWith("audio/");
        const isLargeMedia = isMedia && file.size >= 20 * 1024 * 1024; // 20MB+

        if (isLargeMedia) {
          const chunkSize = computeAdaptiveChunkSize(file.size);
          await chunkedUploadService.uploadFile(file, {
            path,
            visibility: uploadVisibility,
            parentId: currentFolderId || undefined,
            chunkSize,
            onProgress: (progress) => {
              setUploadProgress((prev) => ({
                ...prev,
                [tempId]: Math.round(progress.percentage),
              }));
            },
          });

          setUploadProgress((prev) => ({ ...prev, [tempId]: 100 }));
          setTimeout(() => {
            setUploadProgress((prev) => {
              const newProgress = { ...prev };
              delete newProgress[tempId];
              return newProgress;
            });
          }, 500);

          return;
        }
        
        const presigned = await filesService.requestUploadUrl({
          path,
          mimeType: file.type,
          size: file.size,
          isFolder: false,
          parentId: currentFolderId || undefined,
          visibility: uploadVisibility,
        });

        if (!presigned) {
          throw new Error("Unable to create presigned URL");
        }

        setUploadProgress((prev) => ({ ...prev, [tempId]: 30 }));

        const uploadResponse = await fetch(presigned.url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file to storage");
        }

        setUploadProgress((prev) => ({ ...prev, [tempId]: 70 }));

        const result = await filesService.registerFile({
          name: file.name,
          path,
          isFolder: false,
          size: file.size,
          mimeType: file.type,
          parentId: currentFolderId || undefined,
          visibility: uploadVisibility,
        });

        setUploadProgress((prev) => ({ ...prev, [tempId]: 100 }));
        setTimeout(() => {
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[tempId];
            return newProgress;
          });
        }, 500);

        return result;
      } catch (error) {
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[tempId];
          return newProgress;
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });


  // Helper function to create folder structure and return folder map
  const createFolderStructure = async (
    folderPaths: Set<string>
  ): Promise<Map<string, string>> => {
    const folderMap = new Map<string, string>(); // path -> folderId
    const sortedPaths = Array.from(folderPaths).sort();

    // Extract the root folder name (main folder that contains everything)
    const allFolderPaths = new Set<string>();

    for (const fullPath of sortedPaths) {
      const parts = fullPath.split("/");
      // Add all folder paths to the set
      for (let i = 1; i <= parts.length - 1; i++) {
        allFolderPaths.add(parts.slice(0, i).join("/"));
      }
    }

    const sortedFolderPaths = Array.from(allFolderPaths).sort((a, b) => {
      // Sort by depth (fewer slashes first)
      const depthA = (a.match(/\//g) || []).length;
      const depthB = (b.match(/\//g) || []).length;
      return depthA - depthB;
    });

    // Create folders in order from root to leaf
    for (const folderPath of sortedFolderPaths) {
      if (folderMap.has(folderPath)) continue;

      const parts = folderPath.split("/");
      const folderName = parts[parts.length - 1];

      // Find parent folder ID
      let parentId: string | undefined = currentFolderId || undefined;
      if (parts.length > 1) {
        const parentPath = parts.slice(0, -1).join("/");
        parentId = folderMap.get(parentPath) || currentFolderId || undefined;
      }

      try {
        const result = await filesService.registerFile({
          name: folderName,
          path: folderPath,
          isFolder: true,
          parentId: parentId,
        });
        folderMap.set(folderPath, result.id);
      } catch (error) {
        console.error(`Failed to create folder ${folderPath}:`, error);
      }
    }

    return folderMap;
  };

  // Helper function to find parent folder for a file
  const findFileParentId = (
    filePath: string,
    folderMap: Map<string, string>
  ): string | undefined => {
    const parts = filePath.split("/");

    // If file is in root folder
    if (parts.length === 1) {
      return currentFolderId || undefined;
    }

    // Remove the file name to get folder path
    const folderPath = parts.slice(0, -1).join("/");

    return folderMap.get(folderPath) || currentFolderId || undefined;
  };

  const uploadFolderMutation = useMutation({
    mutationFn: async (files: FileList) => {
      // First pass: Collect all unique file paths with folder structure
      const pathsSet = new Set<string>();
      Array.from(files).forEach((file) => {
        const relativePath = (file as any).webkitRelativePath;
        if (relativePath) {
          pathsSet.add(relativePath);
        }
      });

      // Create folders first and get folder IDs
      const folderMap = await createFolderStructure(pathsSet);

      // Second pass: Upload all files
      const uploadPromises = Array.from(files).map(async (file, index) => {
        const fileId = `folder-${index}`;
        setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

        try {
          const relativePath = (file as any).webkitRelativePath;
          const path = relativePath || file.name;

          // determine the correct parent id for this file based on created folders
          const fileParentId = findFileParentId(path, folderMap);
          const presigned = await filesService.requestUploadUrl({
            path,
            mimeType: file.type,
            size: file.size,
            isFolder: false,
            parentId: fileParentId || currentFolderId || undefined,
            visibility: uploadVisibility,
          });

          if (!presigned) {
            throw new Error("Unable to create presigned URL");
          }

          setUploadProgress((prev) => ({ ...prev, [fileId]: 40 }));

          const uploadResponse = await fetch(presigned.url, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload file to storage");
          }

          setUploadProgress((prev) => ({ ...prev, [fileId]: 80 }));

          const result = await filesService.registerFile({
            name: file.name,
            path,
            isFolder: false,
            size: file.size,
            mimeType: file.type,
            parentId: fileParentId,
            visibility: uploadVisibility,
          });

          setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
          setTimeout(() => {
            setUploadProgress((prev) => {
              const newProgress = { ...prev };
              delete newProgress[fileId];
              return newProgress;
            });
          }, 500);

          return result;
        } catch (error) {
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
          throw error;
        }
      });

      return Promise.all(uploadPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setCurrentPage(1);
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      return filesService.registerFile({
        name,
        path: name,
        isFolder: true,
        parentId: currentFolderId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setNewFolderName("");
      setShowCreateFolder(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => filesService.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Add files to queue
    const fileArray = Array.from(files);
    setUploadQueue(prev => [...prev, ...fileArray]);
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFolderChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadFolderMutation.mutateAsync(files);
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  // Process upload queue
  useEffect(() => {
    const processQueue = async () => {
      if (uploadQueue.length === 0 || isUploading) return;
      
      setIsUploading(true);
      const file = uploadQueue[0];
      
      try {
        await uploadFileMutation.mutateAsync(file);
        // Remove processed file from queue
        setUploadQueue(prev => prev.slice(1));
      } catch (error) {
        console.error('Upload failed:', error);
        // Still remove from queue on error
        setUploadQueue(prev => prev.slice(1));
      } finally {
        setIsUploading(false);
      }
    };
    
    processQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadQueue, isUploading]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const firstFile = files[0] as any;
    if (firstFile.webkitRelativePath) {
      await uploadFolderMutation.mutateAsync(files);
    } else {
      for (let i = 0; i < files.length; i++) {
        await uploadFileMutation.mutateAsync(files[i]);
      }
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate(newFolderName.trim());
  };

  const files: FileItem[] = filesQuery.data?.data ?? [];
  // Chỉ lấy các file/folder có parentId trùng với currentFolderId (root là null)
  const visibleItems = files.filter((f) => f.parentId === currentFolderId);
  const folders = visibleItems.filter((f) => f.isFolder);
  const fileItems = visibleItems.filter((f) => !f.isFolder);

  // Prefetch previews for images only (avoid heavy video loads)
  useEffect(() => {
    fileItems.forEach(async (file) => {
      if (file.isFolder) return;
      const isImage = file.mimeType?.startsWith("image/");
      if (!isImage) return;
      if (imagePreviews[file.id]) return;

      try {
        const result = await filesService.downloadUrl(file.id);
        setImagePreviews((prev) => ({ ...prev, [file.id]: result.url }));
      } catch (error) {
        console.error("Failed to load preview:", error);
      }
    });
  }, [fileItems, imagePreviews]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4">
      {/* Upload Drag-Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-8 transition-all ${
          dragActive
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="text-5xl text-indigo-400">
            <FiArrowUp />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white">
              Drag files or folders here
            </h3>
            <p className="text-sm text-zinc-400">
              or use the buttons below to upload
            </p>
          </div>

          {/* Privacy Selector */}
          <div className="w-full max-w-md space-y-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
            <label className="block text-sm font-medium text-white">
              Upload as:
            </label>
            <div className="flex gap-4">
              <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-zinc-600 bg-zinc-900/50 p-3 transition-all hover:border-green-500 hover:bg-green-950/20">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={uploadVisibility === "private"}
                  onChange={(e) => setUploadVisibility(e.target.value as "private" | "public")}
                  className="h-4 w-4 text-green-500 focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-white flex items-center gap-2">
                    <FiLock className="h-4 w-4" /> Private
                  </div>
                  <div className="text-xs text-zinc-400">No approval needed</div>
                </div>
              </label>
              <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-zinc-600 bg-zinc-900/50 p-3 transition-all hover:border-blue-500 hover:bg-blue-950/20">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={uploadVisibility === "public"}
                  onChange={(e) => setUploadVisibility(e.target.value as "private" | "public")}
                  className="h-4 w-4 text-blue-500 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-white flex items-center gap-2">
                    <FiGlobe className="h-4 w-4" /> Public
                  </div>
                  <div className="text-xs text-zinc-400">Needs admin approval</div>
                </div>
              </label>
            </div>
            
            {/* Warning Message */}
            {uploadVisibility === "public" && (
              <div className="rounded-lg border border-yellow-600/30 bg-yellow-950/20 p-3">
                <div className="flex items-start gap-2">
                  <FiAlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs text-yellow-200">
                    <strong>Public files require admin approval.</strong> Your file will be pending until an admin reviews it.
                  </div>
                </div>
              </div>
            )}
            
            {uploadVisibility === "private" && (
              <div className="rounded-lg border border-green-600/30 bg-green-950/20 p-3">
                <div className="flex items-start gap-2">
                  <FiCheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs text-green-200">
                    <strong>Private files are uploaded instantly.</strong> Only you can access them.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadFileMutation.isPending}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <FiUpload className="h-4 w-4" />
              Upload File
            </Button>
            <Button
              onClick={() => folderInputRef.current?.click()}
              disabled={uploadFolderMutation.isPending}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <FiFolder className="h-4 w-4" />
              Upload Folder
            </Button>
            <Button
              onClick={() => setShowCreateFolder(!showCreateFolder)}
              variant="outline"
              className="gap-2"
            >
              <FiFolderPlus className="h-4 w-4" />
              New Folder
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            disabled={uploadFileMutation.isPending}
            hidden
            accept="*"
          />
          <input
            ref={folderInputRef}
            type="file"
            onChange={handleFolderChange}
            disabled={uploadFolderMutation.isPending}
            hidden
            {...({ webkitdirectory: '', directory: '' } as any)}
          />
        </div>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <Card className="space-y-3 border-indigo-600/30 bg-indigo-950/20 p-4">
          <h4 className="font-semibold text-white">Uploading...</h4>
          {Object.entries(uploadProgress).map(([key, progress]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>File upload</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Create Folder Form */}
      {showCreateFolder && (
        <Card className="space-y-3 border-zinc-700 bg-zinc-800/50 p-4">
          <h4 className="font-semibold text-white">Create New Folder</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
              autoFocus
              className="flex-1"
            />
            <Button
              onClick={handleCreateFolder}
              disabled={createFolderMutation.isPending || !newFolderName.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              Create
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateFolder(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Search Bar & Info */}
      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Your Files</h2>
          <p className="text-sm text-zinc-500">
            {files.length} item{files.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Input
          type="search"
          placeholder="Search files..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}
          className="w-full md:w-64"
        />
      </Card>

      {/* Breadcrumb Navigation */}
      <Card className="flex items-center gap-2 p-3">
        <Button
          variant="ghost"
          onClick={() => setCurrentFolderId(null)}
          className="gap-2 text-sm"
        >
          <FiHome className="h-4 w-4" />
          Root
        </Button>
        {/* Hiển thị breadcrumb động */}
        {currentFolderId && (
          <>
            <FiChevronRight className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-300">
              {(() => {
                const currentFolder = files.find(f => f.id === currentFolderId);
                return currentFolder ? currentFolder.name : "Current Folder";
              })()}
            </span>
          </>
        )}
      </Card>

      {/* Files Grid */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        {filesQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : files.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            No files yet. Upload files or create folders to get started.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-indigo-500/70 hover:shadow-lg hover:shadow-indigo-500/10"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="flex items-center justify-center rounded-lg bg-indigo-500/10 p-2 text-indigo-300 transition-colors hover:bg-indigo-500/20"
                  >
                    <FiFolder className="h-6 w-6" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="truncate text-sm font-semibold text-white hover:text-indigo-300"
                        onClick={() => setCurrentFolderId(folder.id)}
                      >
                        {folder.name}
                      </button>
                      <Badge
                        variant={folder.visibility === "public" ? "info" : "default"}
                        className="text-[10px] px-2 py-0.5"
                      >
                        {folder.visibility === "public" ? "Public" : "Private"}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500">{formatRelative(folder.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 text-red-400 hover:bg-red-950/40 hover:text-red-200 p-0"
                      onClick={() => {
                        if (confirm("Delete this folder?")) {
                          deleteMutation.mutate(folder.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      title="Delete"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            ))}

            {fileItems.map((file) => {
              const icon = file.mimeType?.includes("image")
                ? <FiImage className="h-6 w-6 text-blue-400" />
                : file.mimeType?.includes("video")
                  ? <FiVideo className="h-6 w-6 text-red-400" />
                  : file.mimeType?.includes("audio")
                    ? <FiMusic className="h-6 w-6 text-purple-400" />
                    : file.mimeType?.includes("pdf")
                      ? <FiFile className="h-6 w-6 text-orange-400" />
                      : file.mimeType?.includes("text")
                        ? <FiFileText className="h-6 w-6 text-green-400" />
                        : file.mimeType?.includes("zip")
                          ? <FiPackage className="h-6 w-6 text-yellow-400" />
                          : <FiFile className="h-6 w-6 text-zinc-400" />;

              return (
                <div
                  key={file.id}
                  className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-indigo-500/70 hover:shadow-lg hover:shadow-indigo-500/10"
                >
                  <div className="mb-3 overflow-hidden rounded-lg bg-zinc-800">
                    {imagePreviews[file.id] ? (
                      <img
                        src={imagePreviews[file.id]}
                        alt={file.name}
                        className="h-32 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center">
                        {icon}
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{file.name}</p>
                      <p className="truncate text-xs text-zinc-500">{file.path}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                        <Badge
                          variant={file.visibility === "public" ? "info" : "default"}
                          className="text-[10px] px-2 py-0.5"
                        >
                          {file.visibility === "public" ? "Public" : "Private"}
                        </Badge>
                        <Badge
                          variant={
                            file.status === "approved"
                              ? "success"
                              : file.status === "pending"
                              ? "warning"
                              : "danger"
                          }
                          className="text-[10px] px-2 py-0.5"
                        >
                          {file.status}
                        </Badge>
                        <span>· {formatFileSize(file.size)}</span>
                        <span>· {formatRelative(file.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 text-blue-400 hover:bg-blue-950/40 hover:text-blue-200 p-0"
                      onClick={() => setPreviewFile(file)}
                      title="Preview"
                    >
                      <FiEye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 text-indigo-400 hover:bg-indigo-950/40 hover:text-indigo-200 p-0"
                      onClick={() => setShareFile(file)}
                      title="Share"
                    >
                      <FiGlobe className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 text-green-400 hover:bg-green-950/40 hover:text-green-200 p-0"
                      onClick={() => {
                        const url = filesService.directDownloadUrl(file.id);
                        window.open(url, "_blank", "noopener,noreferrer");
                      }}
                      title="Download"
                    >
                      <FiDownload className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 text-red-400 hover:bg-red-950/40 hover:text-red-200 p-0"
                      onClick={() => {
                        if (confirm("Delete this file?")) {
                          deleteMutation.mutate(file.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      title="Delete"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filesQuery.data && filesQuery.data.meta.total > limit && (
        <div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filesQuery.data.meta.total / limit)}
            onPageChange={setCurrentPage}
            totalItems={filesQuery.data.meta.total}
            itemsPerPage={limit}
          />
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Share Dialog */}
      {shareFile && (
        <ShareDialog
          fileId={shareFile.id}
          fileName={shareFile.name}
          onClose={() => setShareFile(null)}
        />
      )}
    </div>
  );
}

