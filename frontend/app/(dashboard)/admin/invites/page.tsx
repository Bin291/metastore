"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invitesService, Invite } from "@/lib/services/invites";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/time";

const formSchema = z.object({
  email: z.string().email(),
  role: z.enum(["user", "admin"]).default("user"),
  expiresAt: z.string().optional(),
  maxUses: z.preprocess(
    (value) => (value === "" ? undefined : Number(value)),
    z.number().min(1).max(10).optional()
  ),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminInvitesPage() {
  const queryClient = useQueryClient();

  const invitesQuery = useQuery({
    queryKey: ["invites"],
    queryFn: () => invitesService.list({ page: 1, limit: 50 }),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "user",
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      invitesService.create({
        email: values.email,
        role: values.role,
        expiresAt: values.expiresAt,
        maxUses: values.maxUses,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      form.reset({ role: "user" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => invitesService.revoke(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });

  const invites: Invite[] = useMemo(
    () => invitesQuery.data?.data ?? [],
    [invitesQuery.data?.data]
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Invite Users</h2>
        <p className="text-sm text-zinc-500">
          Generate invitation links to onboard new users securely.
        </p>
        <form
          className="mt-4 grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit((values) =>
            createMutation.mutate(values)
          )}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Email</span>
            <Input
              type="email"
              placeholder="user@example.com"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <span className="text-xs text-red-400">
                {form.formState.errors.email.message}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Role</span>
            <select
              className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
              {...form.register("role")}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
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
            <span className="text-sm text-zinc-300">Max Uses</span>
            <Input
              type="number"
              min={1}
              max={10}
              placeholder="1"
              {...form.register("maxUses")}
            />
            {form.formState.errors.maxUses && (
              <span className="text-xs text-red-400">
                {form.formState.errors.maxUses.message}
              </span>
            )}
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Invite"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-0">
        <header className="border-b border-zinc-800 px-6 py-4">
          <h3 className="text-sm font-semibold text-white">Active Invites</h3>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Role
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
              {invites.map((invite) => (
                <tr key={invite.id}>
                  <td className="px-6 py-4 text-sm text-zinc-200">
                    <div>{invite.email}</div>
                    <div className="text-xs text-zinc-500">
                      Token: <span className="font-mono">{invite.token}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    <Badge variant="default">{invite.role}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    <Badge
                      variant={
                        invite.status === "pending"
                          ? "warning"
                          : invite.status === "used"
                          ? "success"
                          : invite.status === "revoked"
                          ? "danger"
                          : "default"
                      }
                    >
                      {invite.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {invite.expiresAt
                      ? formatRelative(invite.expiresAt)
                      : "No expiry"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      className="text-xs text-red-400 hover:text-red-200"
                      onClick={() => revokeMutation.mutate(invite.id)}
                      disabled={revokeMutation.isPending}
                    >
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invites.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-zinc-500">
              No invites generated yet.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

