"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shareLinksService } from "@/lib/services/share-links";
import { filesService } from "@/lib/services/files";
import { ShareLink } from "@/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/time";
import { Pagination } from "@/components/ui/pagination";
import { useState } from "react";

const formSchema = z.object({
  resourceId: z.string().min(1, "Please choose a file or folder"),
  permission: z.enum(["view", "full"]),
  expiresAt: z.string().optional(),
  password: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ShareLinksPage() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const filesQuery = useQuery({
    queryKey: ["files", { page: 1, limit: 50 }],
    queryFn: () => filesService.list({ page: 1, limit: 50 }),
  });

  const shareLinksQuery = useQuery({
    queryKey: ["share-links", { page: currentPage, limit }],
    queryFn: () => shareLinksService.list({ page: currentPage, limit }),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      permission: "view",
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      shareLinksService.create({
        resourceId: values.resourceId,
        permission: values.permission,
        expiresAt: values.expiresAt,
        password: values.password,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-links"] });
      form.reset();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (payload: { id: string; active: boolean }) =>
      shareLinksService.toggle(payload.id, { active: payload.active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-links"] });
    },
  });

  const options = useMemo(
    () => filesQuery.data?.data ?? [],
    [filesQuery.data?.data]
  );

  const links: ShareLink[] = shareLinksQuery.data?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Create Share Link</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Generate secure links to share files or folders with view or full
          access permissions.
        </p>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit((values) =>
            createMutation.mutate(values)
          )}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Resource</span>
            <select
              className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
              {...form.register("resourceId")}
            >
              <option value="">Select a file...</option>
              {options.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name} ({file.visibility})
                </option>
              ))}
            </select>
            {form.formState.errors.resourceId && (
              <span className="text-xs text-red-400">
                {form.formState.errors.resourceId.message}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Permission</span>
            <select
              className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
              {...form.register("permission")}
            >
              <option value="view">View only</option>
              <option value="full">Full access</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Expires At</span>
            <Input
              type="datetime-local"
              {...form.register("expiresAt")}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Password (optional)</span>
            <Input
              type="text"
              placeholder="Protect access with a password"
              {...form.register("password")}
            />
          </label>
          <div className="md:col-span-2">
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Share Link"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-0">
        <header className="border-b border-zinc-800 px-6 py-4">
          <h3 className="text-sm font-semibold text-white">Share Links</h3>
          <p className="text-xs text-zinc-500">
            Manage active links and toggle access when needed.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Token
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Permission
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Expires
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 bg-zinc-950">
              {links.map((link) => (
                <tr key={link.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-mono text-zinc-200">
                      {link.token}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Resource: {link.resourceId}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm uppercase text-zinc-300">
                    {link.permission}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={link.active ? "success" : "danger"}>
                      {link.active ? "active" : "disabled"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {link.expiresAt
                      ? formatRelative(link.expiresAt)
                      : "No expiry"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      className="text-xs text-zinc-400"
                      onClick={() =>
                        toggleMutation.mutate({
                          id: link.id,
                          active: !link.active,
                        })
                      }
                    >
                      {link.active ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {links.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-zinc-500">
              No share links yet. Create one using the form above.
            </p>
          )}
        </div>
      </Card>

      {shareLinksQuery.data && shareLinksQuery.data.meta.total > limit && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(shareLinksQuery.data.meta.total / limit)}
          onPageChange={setCurrentPage}
          totalItems={shareLinksQuery.data.meta.total}
          itemsPerPage={limit}
        />
      )}
    </div>
  );
}

