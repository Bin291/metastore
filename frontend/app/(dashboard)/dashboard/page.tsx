"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { filesService } from "@/lib/services/files";
import { shareLinksService } from "@/lib/services/share-links";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/time";

export default function DashboardPage() {
  const filesQuery = useQuery({
    queryKey: ["files", { page: 1, limit: 5 }],
    queryFn: () => filesService.list({ page: 1, limit: 5 }),
  });

  const shareLinksQuery = useQuery({
    queryKey: ["share-links", { page: 1, limit: 5 }],
    queryFn: () => shareLinksService.list({ page: 1, limit: 5 }),
  });

  const stats = useMemo(
    () => ({
      totalFiles: filesQuery.data?.meta.total ?? 0,
      pendingFiles:
        filesQuery.data?.data.filter((file) => file.status === "pending")
          .length ?? 0,
      totalShareLinks: shareLinksQuery.data?.meta.total ?? 0,
    }),
    [filesQuery.data, shareLinksQuery.data]
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <h3 className="text-sm font-medium text-zinc-400">Total Files</h3>
          <p className="mt-2 text-3xl font-semibold text-white">
            {stats.totalFiles}
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-zinc-400">Pending Review</h3>
          <p className="mt-2 text-3xl font-semibold text-white">
            {stats.pendingFiles}
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-zinc-400">Share Links</h3>
          <p className="mt-2 text-3xl font-semibold text-white">
            {stats.totalShareLinks}
          </p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <header className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Recent Files
            </h3>
            <Badge variant="default">Latest 5</Badge>
          </header>
          <div className="space-y-3">
            {filesQuery.isLoading && (
              <p className="text-sm text-zinc-500">Loading files...</p>
            )}
            {filesQuery.data?.data.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{file.name}</p>
                  <p className="text-xs text-zinc-500">
                    {formatRelative(file.createdAt)}
                  </p>
                </div>
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
              </div>
            ))}
            {filesQuery.data?.data.length === 0 && (
              <p className="text-sm text-zinc-500">
                No files uploaded yet. Start by uploading from the Files tab.
              </p>
            )}
          </div>
        </Card>
        <Card>
          <header className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Recent Share Links
            </h3>
            <Badge variant="default">Latest 5</Badge>
          </header>
          <div className="space-y-3">
            {shareLinksQuery.isLoading && (
              <p className="text-sm text-zinc-500">Loading share links...</p>
            )}
            {shareLinksQuery.data?.data.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {link.permission.toUpperCase()} access
                  </p>
                  <p className="text-xs text-zinc-500">
                    Token: <span className="font-mono">{link.token}</span>
                  </p>
                </div>
                <Badge variant={link.active ? "success" : "danger"}>
                  {link.active ? "active" : "disabled"}
                </Badge>
              </div>
            ))}
            {shareLinksQuery.data?.data.length === 0 && (
              <p className="text-sm text-zinc-500">
                No share links created yet.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

