"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { filesService } from "@/lib/services/files";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FiImage, FiFile, FiVideo, FiMusic, FiFileText, FiLock, FiGlobe, FiGrid, FiList, FiLayout, FiMoreVertical, FiEye, FiDownload, FiTrash2, FiCheckSquare, FiSquare } from "react-icons/fi";
import { FilePreview } from "@/components/file-preview";
import { ShareDialog } from "@/components/share-dialog";
import { FileItem } from "@/types/api";
import { useFileUpload } from "@/lib/hooks/use-file-upload";

type ViewMode = "grid" | "list" | "mixed";
type GroupMode = "grouped" | "all";

export default function DashboardPage() {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "private" | "public">("all");
  const [groupMode, setGroupMode] = useState<GroupMode>("grouped");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { uploadFile } = useFileUpload();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load viewMode from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gallery-view-mode');
      return (saved as ViewMode) || 'grid';
    }
    return 'grid';
  });

  // Save viewMode to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gallery-view-mode', viewMode);
    }
  }, [viewMode]);
  
  // Load all files to show in gallery
  const filesQuery = useQuery({
    queryKey: ["files", { page: 1, limit: 100 }],
    queryFn: () => filesService.list({ page: 1, limit: 100, status: "approved" }),
  });

  // Filter files by visibility
  const filteredFiles = useMemo(() => {
    const allFiles = filesQuery.data?.data ?? [];
    // Filter out files with missing essential data
    const validFiles = allFiles.filter(file => file && file.visibility);
    if (visibilityFilter === "all") return validFiles;
    return validFiles.filter(file => file.visibility === visibilityFilter);
  }, [filesQuery.data, visibilityFilter]);

  // Separate images and other files from filtered results
  const images = useMemo(() => 
    filteredFiles.filter(file => 
      !file.isFolder && file.mimeType?.startsWith("image/")
    ),
    [filteredFiles]
  );

  const videos = useMemo(() => 
    filteredFiles.filter(file => 
      !file.isFolder && file.mimeType?.startsWith("video/")
    ),
    [filteredFiles]
  );

  const otherFiles = useMemo(() => 
    filteredFiles.filter(file => 
      !file.isFolder && 
      !file.mimeType?.startsWith("image/") && 
      !file.mimeType?.startsWith("video/") &&
      file.mimeType
    ),
    [filteredFiles]
  );

  // Load image previews
  useEffect(() => {
    images.forEach(async (file) => {
      if (!imagePreviews[file.id]) {
        try {
          const result = await filesService.downloadUrl(file.id);
          setImagePreviews(prev => ({ ...prev, [file.id]: result.url }));
        } catch (error) {
          console.error('Failed to load image preview:', error);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  // Load video previews
  useEffect(() => {
    videos.forEach(async (file) => {
      if (!imagePreviews[file.id]) {
        try {
          const result = await filesService.downloadUrl(file.id);
          setImagePreviews(prev => ({ ...prev, [file.id]: result.url }));
        } catch (error) {
          console.error('Failed to load video preview:', error);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) setOpenMenuId(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

  const getFileIcon = (file: FileItem) => {
    if (file.mimeType?.includes("video")) return <FiVideo className="h-12 w-12 text-red-400" />;
    if (file.mimeType?.includes("audio")) return <FiMusic className="h-12 w-12 text-purple-400" />;
    if (file.mimeType?.includes("text") || file.mimeType?.includes("pdf")) 
      return <FiFileText className="h-12 w-12 text-green-400" />;
    return <FiFile className="h-12 w-12 text-zinc-400" />;
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => filesService.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setSelectedFiles(new Set());
    },
  });

  // Update visibility mutation
  const updateVisibilityMutation = useMutation({
    mutationFn: ({ fileId, visibility }: { fileId: string; visibility: "private" | "public" }) =>
      filesService.updateFile(fileId, { visibility }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  // Download file
  const handleDownload = async (fileId: string) => {
    try {
      const url = filesService.directDownloadUrl(fileId);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Failed to download:", error);
    }
  };

  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  // Select all files
  const selectAll = () => {
    const allFileIds = new Set([...images, ...videos, ...otherFiles].map(f => f.id));
    setSelectedFiles(allFileIds);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  // Delete selected files
  const deleteSelected = async () => {
    if (confirm(`Delete ${selectedFiles.size} file(s)?`)) {
      for (const fileId of selectedFiles) {
        await deleteMutation.mutateAsync(fileId);
      }
    }
  };

  // Drag & drop upload (default private)
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

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i] as File & { webkitRelativePath?: string };
        const path =
          file.webkitRelativePath && file.webkitRelativePath.length > 0
            ? file.webkitRelativePath
            : file.name;

        await uploadFile(file, {
          path,
          visibility: "private",
          parentId: undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["files"] });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // All files combined (for ungrouped view)
  const allFiles = useMemo(() => 
    [...images, ...videos, ...otherFiles],
    [images, videos, otherFiles]
  );

  // Render file item with checkbox and menu
  const renderFileItem = (file: FileItem, view: "grid" | "list") => {
    const isSelected = selectedFiles.has(file.id);
    const isVideo = file.mimeType?.startsWith("video/");
    
    if (view === "grid") {
      return (
        <div
          key={file.id}
          className="group relative aspect-square overflow-hidden rounded transition-all hover:shadow-lg"
        >
          {/* Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFileSelection(file.id);
            }}
            className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isSelected ? (
              <FiCheckSquare className="h-5 w-5 text-indigo-400" />
            ) : (
              <FiSquare className="h-5 w-5 text-white/80" />
            )}
          </button>

          {/* Menu Button */}
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === file.id ? null : file.id);
              }}
              className="p-1 bg-black/50 rounded hover:bg-black/70 transition-colors"
            >
              <FiMoreVertical className="h-4 w-4 text-white" />
            </button>

            {/* Dropdown Menu */}
            {openMenuId === file.id && (
              <div className="absolute right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg min-w-[150px] py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewFile(file);
                    setOpenMenuId(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-2"
                >
                  <FiEye className="h-4 w-4" />
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareFile(file);
                    setOpenMenuId(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-2"
                >
                  <FiGlobe className="h-4 w-4" />
                  Share
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file.id);
                    setOpenMenuId(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-2"
                >
                  <FiDownload className="h-4 w-4" />
                  Download
                </button>
                <div className="border-t border-zinc-800 my-1"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newVisibility = file.visibility === "public" ? "private" : "public";
                    updateVisibilityMutation.mutate({ fileId: file.id, visibility: newVisibility });
                    setOpenMenuId(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-2"
                >
                  {file.visibility === "public" ? (
                    <>
                      <FiLock className="h-4 w-4" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <FiGlobe className="h-4 w-4" />
                      Make Public
                    </>
                  )}
                </button>
                <div className="border-t border-zinc-800 my-1"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${file.name}?`)) {
                      deleteMutation.mutate(file.id);
                    }
                    setOpenMenuId(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 flex items-center gap-2"
                >
                  <FiTrash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Image/Video Preview */}
          <button
            onClick={() => setPreviewFile(file)}
            className={`w-full h-full ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          >
            {imagePreviews[file.id] ? (
              isVideo ? (
                <video
                  src={imagePreviews[file.id]}
                  className="h-full w-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={imagePreviews[file.id]}
                  alt={file.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                {isVideo ? (
                  <FiVideo className="h-12 w-12 text-zinc-600 animate-pulse" />
                ) : (
                  <FiImage className="h-12 w-12 text-zinc-600 animate-pulse" />
                )}
              </div>
            )}

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all pointer-events-none">
              <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs font-medium text-white truncate">
                  {file.name}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge
                    variant={file.visibility === "public" ? "info" : "default"}
                    className="text-[10px] px-1 py-0 flex items-center gap-1"
                  >
                    {file.visibility === "public" ? (
                      <><FiGlobe className="h-2.5 w-2.5" /> Public</>
                    ) : (
                      <><FiLock className="h-2.5 w-2.5" /> Private</>
                    )}
                  </Badge>
                </div>
              </div>
            </div>
          </button>
        </div>
      );
    } else {
      // List view
      return (
        <div
          key={file.id}
          className={`group flex items-center gap-3 p-2 rounded hover:bg-zinc-900/50 transition-all ${isSelected ? 'bg-zinc-900/50 ring-1 ring-indigo-500' : ''}`}
        >
          {/* Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFileSelection(file.id);
            }}
          >
            {isSelected ? (
              <FiCheckSquare className="h-5 w-5 text-indigo-400" />
            ) : (
              <FiSquare className="h-5 w-5 text-zinc-600" />
            )}
          </button>

          {/* Thumbnail */}
          <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-zinc-900">
            {imagePreviews[file.id] ? (
              <img
                src={imagePreviews[file.id]}
                alt={file.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {getFileIcon(file)}
              </div>
            )}
          </div>

          {/* File Info */}
          <button
            onClick={() => setPreviewFile(file)}
            className="flex-1 text-left"
          >
            <p className="text-sm font-medium text-white truncate">
              {file.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={file.visibility === "public" ? "info" : "default"}
                className="text-[10px] px-1.5 py-0 flex items-center gap-1"
              >
                {file.visibility === "public" ? (
                  <><FiGlobe className="h-2.5 w-2.5" /> Public</>
                ) : (
                  <><FiLock className="h-2.5 w-2.5" /> Private</>
                )}
              </Badge>
            </div>
          </button>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === file.id ? null : file.id);
              }}
              className="p-2 hover:bg-zinc-800 rounded transition-colors"
            >
              <FiMoreVertical className="h-4 w-4 text-zinc-400" />
            </button>

            {openMenuId === file.id && (
              <div className="absolute right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg min-w-[150px] py-1 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewFile(file);
                    setOpenMenuId(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-2"
                >
                  <FiEye className="h-4 w-4" />
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file.id);
                    setOpenMenuId(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-2"
                >
                  <FiDownload className="h-4 w-4" />
                  Download
                </button>
                <div className="border-t border-zinc-800 my-1"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newVisibility = file.visibility === "public" ? "private" : "public";
                    updateVisibilityMutation.mutate({ fileId: file.id, visibility: newVisibility });
                    setOpenMenuId(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-2"
                >
                  {file.visibility === "public" ? (
                    <>
                      <FiLock className="h-4 w-4" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <FiGlobe className="h-4 w-4" />
                      Make Public
                    </>
                  )}
                </button>
                <div className="border-t border-zinc-800 my-1"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${file.name}?`)) {
                      deleteMutation.mutate(file.id);
                    }
                    setOpenMenuId(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 flex items-center gap-2"
                >
                  <FiTrash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div
      className="relative max-w-7xl mx-auto space-y-6 px-4"
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-30 rounded-2xl border-2 border-dashed border-indigo-500 bg-indigo-500/10" />
      )}

      {/* Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <FiGrid className="h-5 w-5 text-zinc-400" />
          <h2 className="text-xl font-semibold text-white">Gallery</h2>
          {selectedFiles.size > 0 && (
            <Badge variant="info" className="ml-2">
              {selectedFiles.size} selected
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* Selection Actions */}
          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
              >
                Deselect All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deleteSelected}
                className="text-red-400 hover:text-red-300"
              >
                <FiTrash2 className="h-4 w-4 mr-1" />
                Delete ({selectedFiles.size})
              </Button>
            </div>
          )}

          {selectedFiles.size === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
            >
              Select All
            </Button>
          )}

          {/* Group Mode Toggle */}
          <div className="flex items-center gap-1 border border-zinc-800 rounded-md p-1">
            <Button
              variant={groupMode === "grouped" ? "default" : "ghost"}
              size="sm"
              onClick={() => setGroupMode("grouped")}
              className="h-7 px-3 text-xs"
            >
              Grouped
            </Button>
            <Button
              variant={groupMode === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setGroupMode("all")}
              className="h-7 px-3 text-xs"
            >
              All Files
            </Button>
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center gap-1 border border-zinc-800 rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-7 px-2"
            >
              <FiGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-7 px-2"
            >
              <FiList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "mixed" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("mixed")}
              className="h-7 px-2"
            >
              <FiLayout className="h-4 w-4" />
            </Button>
          </div>

          {/* Visibility Filter */}
          <div className="flex items-center gap-2">
            <Button
              variant={visibilityFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setVisibilityFilter("all")}
              className="gap-2"
            >
              <FiGrid className="h-4 w-4" />
              All
            </Button>
            <Button
              variant={visibilityFilter === "private" ? "default" : "outline"}
              size="sm"
              onClick={() => setVisibilityFilter("private")}
              className="gap-2"
            >
              <FiLock className="h-4 w-4" />
              Private
            </Button>
            <Button
              variant={visibilityFilter === "public" ? "default" : "outline"}
              size="sm"
              onClick={() => setVisibilityFilter("public")}
              className="gap-2"
            >
              <FiGlobe className="h-4 w-4" />
              Public
            </Button>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      {groupMode === "grouped" && images.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <FiImage className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">
              Photos ({images.length})
            </h3>
          </div>
          
          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {images.map((file) => renderFileItem(file, "grid"))}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <div className="space-y-1">
              {images.map((file) => renderFileItem(file, "list"))}
            </div>
          )}

          {/* Mixed View (Pixabay Masonry style) */}
          {viewMode === "mixed" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {images.map((file) => renderFileItem(file, "grid"))}
            </div>
          )}
        </section>
      )}

      {/* Videos Section */}
      {groupMode === "grouped" && videos.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <FiVideo className="h-5 w-5 text-red-400" />
            <h3 className="text-lg font-semibold text-white">
              Videos ({videos.length})
            </h3>
          </div>
          
          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {videos.map((file) => renderFileItem(file, "grid"))}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <div className="space-y-1">
              {videos.map((file) => renderFileItem(file, "list"))}
            </div>
          )}

          {/* Mixed View - use grid for videos */}
          {viewMode === "mixed" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {videos.map((file) => renderFileItem(file, "grid"))}
            </div>
          )}
        </section>
      )}

      {/* Other Files Section */}
      {groupMode === "grouped" && otherFiles.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <FiFile className="h-5 w-5 text-zinc-400" />
            <h3 className="text-lg font-semibold text-white">
              Other Files ({otherFiles.length})
            </h3>
          </div>
          
          {/* List View for other files */}
          <div className="space-y-1">
            {otherFiles.map((file) => renderFileItem(file, "list"))}
          </div>
        </section>
      )}

      {/* All Files View (Ungrouped) */}
      {groupMode === "all" && allFiles.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <FiGrid className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">
              All Files ({allFiles.length})
            </h3>
          </div>
          
          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {allFiles.map((file) => renderFileItem(file, "grid"))}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <div className="space-y-1">
              {allFiles.map((file) => renderFileItem(file, "list"))}
            </div>
          )}

          {/* Mixed View */}
          {viewMode === "mixed" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {allFiles.map((file) => renderFileItem(file, "grid"))}
            </div>
          )}
        </section>
      )}

      {/* Empty State */}
      {filesQuery.isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {!filesQuery.isLoading && allFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <FiImage className="h-16 w-16 text-zinc-600 mb-4" />
          <p className="text-lg font-medium text-white mb-2">No files yet</p>
          <p className="text-sm text-zinc-500 text-center max-w-md">
            Start uploading files from the Files tab to see them here in your gallery.
          </p>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

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

