"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/lib/services/users";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/time";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const usersQuery = useQuery({
    queryKey: ["users", { page: 1, limit: 50, search }],
    queryFn: () =>
      usersService.list({
        page: 1,
        limit: 50,
        search: search || undefined,
      }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: (payload: { id: string; role: "admin" | "user" }) =>
      usersService.updateRole(payload.id, payload.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { id: string; status: "active" | "suspended" }) =>
      usersService.updateStatus(payload.id, payload.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const users = usersQuery.data?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">User Management</h2>
        <p className="text-sm text-zinc-500">
          Manage user accounts, roles, and account status.
        </p>
        <div className="mt-4 flex max-w-sm gap-2">
          <Input
            placeholder="Search users..."
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
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 bg-zinc-950">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-white">
                    {user.username}
                  </p>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                </td>
                <td className="px-6 py-4">
                  <select
                    className="h-8 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
                    value={user.role}
                    onChange={(e) =>
                      updateRoleMutation.mutate({
                        id: user.id,
                        role: e.target.value as "admin" | "user",
                      })
                    }
                    disabled={updateRoleMutation.isPending}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant={
                      user.status === "active" ? "success" : "danger"
                    }
                  >
                    {user.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {formatRelative(user.createdAt)}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button
                    variant="ghost"
                    className="text-xs"
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: user.id,
                        status:
                          user.status === "active" ? "suspended" : "active",
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                  >
                    {user.status === "active" ? "Suspend" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-zinc-500">
            No users found.
          </p>
        )}
      </div>
    </div>
  );
}

