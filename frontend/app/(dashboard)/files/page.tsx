"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { filesService } from "@/lib/services/files";
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

export default function FilesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const filesQuery = useQuery({
    queryKey: ["files", { page: currentPage, limit, search, parentId: currentFolderId }],
    queryFn: () =>
      filesService.list({
        page: currentPage,
        limit,
        search: search || undefined,
        parentId: currentFolderId || null,
      }),
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const path = file.name;
      const presigned = await filesService.requestUploadUrl({
        path,
        mimeType: file.type,
        size: file.size,
        isFolder: false,
        parentId: currentFolderId || undefined,
      });

      if (!presigned) {
        throw new Error("Unable to create presigned URL");
      }

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

      return filesService.registerFile({
        name: file.name,
        path,
        isFolder: false,
        size: file.size,
        mimeType: file.type,
        parentId: currentFolderId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const uploadFolderMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const uploadPromises = Array.from(files).map(async (file) => {
        const path = (file as any).webkitRelativePath || file.name;
        const presigned = await filesService.requestUploadUrl({
          path,
          mimeType: file.type,
          size: file.size,
          isFolder: false,
          parentId: currentFolderId || undefined,
        });

        if (!presigned) {
          throw new Error("Unable to create presigned URL");
        }

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

        return filesService.registerFile({
          name: file.name,
          path,
          isFolder: false,
          size: file.size,
          mimeType: file.type,
          parentId: currentFolderId || undefined,
        });
      });

      return Promise.all(uploadPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setCurrentPage(1); // Reset to first page after upload
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

  const downloadMutation = useMutation({
    mutationFn: (fileId: string) => filesService.downloadUrl(fileId),
  });

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFileMutation.mutateAsync(file);
    event.target.value = "";
  };

  const handleFolderChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadFolderMutation.mutateAsync(files);
    event.target.value = "";
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate(newFolderName.trim());
  };

  const files: FileItem[] = filesQuery.data?.data ?? [];
  const folders = files.filter((f) => f.isFolder);
  const fileItems = files.filter((f) => !f.isFolder);

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Your Files</h2>
          <p className="text-sm text-zinc-500">
            Upload files, create folders, and manage your storage.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="search"
            placeholder="Search files..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="w-full sm:w-64"
          />
          <div className="flex gap-2">
            <Input
              type="file"
              onChange={handleFileChange}
              disabled={uploadFileMutation.isPending}
              className="w-full sm:w-auto"
            />
            <Input
              type="file"
              webkitdirectory=""
              directory=""
              onChange={handleFolderChange}
              disabled={uploadFolderMutation.isPending}
              className="w-full sm:w-auto"
              title="Upload Folder"
            />
            <Button
              variant="outline"
              onClick={() => setShowCreateFolder(!showCreateFolder)}
            >
              New Folder
            </Button>
          </div>
        </div>
      </Card>

      {showCreateFolder && (
        <Card className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
            />
            <Button
              onClick={handleCreateFolder}
              disabled={createFolderMutation.isPending || !newFolderName.trim()}
            >
              Create
            </Button>
            <Button
              variant="ghost"
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

      {currentFolderId && (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setCurrentFolderId(null)}
              className="text-xs"
            >
              ← Back to Root
            </Button>
          </div>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-800">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Type
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 md:table-cell">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Status
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 md:table-cell">
                Visibility
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 lg:table-cell">
                Created
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 bg-zinc-950">
            {folders.map((folder) => (
              <tr key={folder.id} className="hover:bg-zinc-900/50">
                <td className="px-4 py-3 text-sm text-zinc-200">
                  <button
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="flex items-center gap-2 font-medium text-white hover:text-indigo-400"
                  >
                    <span>📁</span>
                    {folder.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">Folder</td>
                <td className="hidden px-4 py-3 text-sm text-zinc-400 md:table-cell">-</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      folder.status === "approved"
                        ? "success"
                        : folder.status === "pending"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {folder.status}
                  </Badge>
                </td>
                <td className="hidden px-4 py-3 text-sm capitalize text-zinc-400 md:table-cell">
                  {folder.visibility}
                </td>
                <td className="hidden px-4 py-3 text-sm text-zinc-400 lg:table-cell">
                  {formatRelative(folder.createdAt)}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button
                    variant="ghost"
                    className="text-xs text-red-400 hover:text-red-200"
                    onClick={() => {
                      if (confirm("Delete this folder?")) {
                        deleteMutation.mutate(folder.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {fileItems.map((file) => (
              <tr key={file.id} className="hover:bg-zinc-900/50">
                <td className="px-4 py-3 text-sm text-zinc-200">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-xs text-zinc-500">{file.path}</p>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">
                  {file.mimeType || "File"}
                </td>
                <td className="hidden px-4 py-3 text-sm text-zinc-400 md:table-cell">
                  {formatFileSize(file.size)}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      file.status === "approved"
                        ? "success"
                        : file.status === "pending"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {file.status}
                  </Badge>
                </td>
                <td className="hidden px-4 py-3 text-sm capitalize text-zinc-400 md:table-cell">
                  {file.visibility}
                </td>
                <td className="hidden px-4 py-3 text-sm text-zinc-400 lg:table-cell">
                  {formatRelative(file.createdAt)}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button
                    variant="ghost"
                    className="text-xs text-zinc-400"
                    onClick={() => setPreviewFile(file)}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-xs text-zinc-400"
                    onClick={async () => {
                      const result = await downloadMutation.mutateAsync(
                        file.id
                      );
                      window.open(result.url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-xs text-red-400 hover:text-red-200"
                    onClick={() => {
                      if (confirm("Delete this file?")) {
                        deleteMutation.mutate(file.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filesQuery.isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}
        {files.length === 0 && !filesQuery.isLoading && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            No files or folders yet. Upload files or create a folder to get
            started.
          </p>
        )}
      </div>

      {filesQuery.data && filesQuery.data.meta.total > limit && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filesQuery.data.meta.total / limit)}
          onPageChange={setCurrentPage}
          totalItems={filesQuery.data.meta.total}
          itemsPerPage={limit}
        />
      )}

      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
