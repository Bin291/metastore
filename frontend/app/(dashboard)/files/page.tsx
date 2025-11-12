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

export default function FilesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const filesQuery = useQuery({
    queryKey: ["files", { page: 1, limit: 20, search }],
    queryFn: () =>
      filesService.list({
        page: 1,
        limit: 20,
        search: search || undefined,
      }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const path = file.name;
      const presigned = await filesService.requestUploadUrl({
        path,
        mimeType: file.type,
        size: file.size,
        isFolder: false,
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
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadMutation.mutateAsync(file);
    event.target.value = "";
  };

  const downloadMutation = useMutation({
    mutationFn: (fileId: string) => filesService.downloadUrl(fileId),
  });

  const files: FileItem[] = filesQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Your Files</h2>
          <p className="text-sm text-zinc-500">
            Upload files and track their approval status.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="search"
            placeholder="Search files..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full sm:w-64"
          />
          <Input
            type="file"
            onChange={handleFileChange}
            disabled={uploadMutation.isPending}
            className="w-full sm:w-auto"
          />
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-800">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Name
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
            {files.map((file) => (
              <tr key={file.id}>
                <td className="px-4 py-3 text-sm text-zinc-200">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-xs text-zinc-500">{file.path}</p>
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
                <td className="px-4 py-3 text-right">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {files.length === 0 && !filesQuery.isLoading && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            No files uploaded yet. Use the upload button above to add your first
            file.
          </p>
        )}
      </div>
    </div>
  );
}

