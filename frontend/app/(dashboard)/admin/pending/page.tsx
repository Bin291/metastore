"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { filesService } from "@/lib/services/files";
import { FileItem } from "@/types/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRelative } from "@/lib/time";

export default function PendingApprovalsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const pendingQuery = useQuery({
    queryKey: ["files", { status: "pending", search }],
    queryFn: () =>
      filesService.list({
        status: "pending",
        search: search || undefined,
        page: 1,
        limit: 50,
      }),
  });

  const approveMutation = useMutation({
    mutationFn: (payload: { id: string }) =>
      filesService.approveFile(payload.id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { id: string; reason?: string }) =>
      filesService.rejectFile(payload.id, { reason: payload.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const files: FileItem[] = pendingQuery.data?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Pending Approvals</h2>
        <p className="text-sm text-zinc-500">
          Review content uploaded by users before it becomes available in their
          private storage.
        </p>
        <div className="mt-4 flex max-w-sm gap-2">
          <Input
            placeholder="Search pending files..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-800">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                File
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Uploaded
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 bg-zinc-950">
            {files.map((file) => (
              <tr key={file.id}>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-white">{file.name}</p>
                  <p className="text-xs text-zinc-500">{file.path}</p>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  <Badge variant="default">{file.ownerId}</Badge>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {formatRelative(file.createdAt)}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button
                    variant="outline"
                    className="text-xs"
                    onClick={() => approveMutation.mutate({ id: file.id })}
                    disabled={approveMutation.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-xs text-red-400 hover:text-red-200"
                    onClick={() => rejectMutation.mutate({ id: file.id })}
                    disabled={rejectMutation.isPending}
                  >
                    Reject
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {files.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-zinc-500">
            There are no pending files at the moment.
          </p>
        )}
      </div>
    </div>
  );
}

