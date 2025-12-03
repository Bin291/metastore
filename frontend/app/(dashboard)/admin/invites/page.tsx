"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInvitesStore } from "@/lib/stores/invites-store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimePicker } from "@/components/time-picker";
import { InviteReviewModal } from "@/components/invite-review-modal";
import { formatRelative } from "@/lib/time";
import { toast } from "@/components/ui/toast";

const formSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(["user", "admin"]).default("user"),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminInvitesPage() {
  const {
    invites,
    selectedInvite,
    inviteLink,
    filter,
    isLoading,
    fetchInvites,
    createInvite,
    setSelectedInvite,
    setInviteLink,
    setFilter,
  } = useInvitesStore();

  const [localLoading, setLocalLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "user",
      maxUses: 1,
      duration: "00:05:00",
    },
  });

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites, filter]);

  const handleCreateUser = async (values: FormValues) => {
    setLocalLoading(true);
    try {
      // Gọi API tạo user trực tiếp
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://localhost:3001/api/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to create user");
      const user = await res.json();
      toast.success(`Tạo tài khoản thành công! Username: ${user.username}`);
      form.reset();
    } catch (error) {
      toast.error("Tạo tài khoản thất bại!");
      console.error("Failed to create user:", error);
    } finally {
      setLocalLoading(false);
    }
  };

  // Separate invites by response status
  const pendingInvites = invites.filter(
    (i) => !i.invitationResponseStatus || (i.invitationResponseStatus === 'pending' && !i.userFullName)
  );
  const awaitingResponseInvites = invites.filter(
    (i) => i.invitationResponseStatus === "pending" && i.userFullName
  );
  const approvedInvites = invites.filter((i) => i.invitationResponseStatus === "approved");
  const rejectedInvites = invites.filter((i) => i.invitationResponseStatus === "rejected");

  const displayInvites = (() => {
    switch (filter) {
      case "pending":
        return pendingInvites;
      case "awaiting-response":
        return awaitingResponseInvites;
      case "approved":
        return approvedInvites;
      case "rejected":
        return rejectedInvites;
      default:
        return invites;
    }
  })();

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4">
      {/* Create Invite Form */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">Generate Invitation Link</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Create a new invitation link to send directly to users.
        </p>

        <form
          className="mt-6 grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(handleCreateUser)}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Username</span>
            <Input type="text" {...form.register("username")} placeholder="Username" />
            {form.formState.errors.username && (
              <span className="text-xs text-red-400">{form.formState.errors.username.message}</span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Password</span>
            <Input type="password" {...form.register("password")} placeholder="Password" />
            {form.formState.errors.password && (
              <span className="text-xs text-red-400">{form.formState.errors.password.message}</span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Email</span>
            <Input type="email" {...form.register("email")} placeholder="Email" />
            {form.formState.errors.email && (
              <span className="text-xs text-red-400">{form.formState.errors.email.message}</span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Phone</span>
            <Input type="text" {...form.register("phone")} placeholder="Phone (optional)" />
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
          <div className="md:col-span-2">
            <Button type="submit" disabled={localLoading || isLoading} className="w-full">
              {localLoading || isLoading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>

        {inviteLink && (
          <div className="mt-6 rounded-lg border border-green-800/30 bg-green-900/10 p-4">
            <p className="text-sm text-green-300 font-semibold mb-3">✓ Invitation Link Created</p>
            <div className="flex gap-2">
              <Input
                type="text"
                value={inviteLink}
                readOnly
                className="text-xs"
              />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  toast.success("Link copied to clipboard!");
                }}
                className="whitespace-nowrap"
              >
                Copy Link
              </Button>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Share this link with the user to let them complete their registration.
            </p>
          </div>
        )}
      </Card>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "All", count: invites.length },
          { value: "pending", label: "Pending", count: pendingInvites.length },
          { value: "awaiting-response", label: "Awaiting Review", count: awaitingResponseInvites.length },
          { value: "approved", label: "Approved", count: approvedInvites.length },
          { value: "rejected", label: "Rejected", count: rejectedInvites.length },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as any)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition ${
              filter === tab.value
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Invites Table */}
      <Card className="p-0">
        <header className="border-b border-zinc-800 px-6 py-4">
          <h3 className="text-sm font-semibold text-white">
            {filter === "all" && "All Invitations"}
            {filter === "pending" && "Pending Invitations"}
            {filter === "awaiting-response" && "Awaiting Review"}
            {filter === "approved" && "Approved Invitations"}
            {filter === "rejected" && "Rejected Invitations"}
          </h3>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {filter === "awaiting-response" ? "User Info" : "Email / Name"}
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
              {displayInvites.map((invite) => (
                <tr key={invite.id} className="hover:bg-zinc-900/50 transition">
                  <td className="px-6 py-4 text-sm">
                    <div className="text-white font-medium">{invite.userFullName || invite.email}</div>
                    {invite.userFullName && (
                      <div className="text-xs text-zinc-500">{invite.email}</div>
                    )}
                    {invite.userPhone && (
                      <div className="text-xs text-zinc-500">{invite.userPhone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Badge variant="default" className="capitalize">
                      {invite.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Badge
                      variant={
                        invite.invitationResponseStatus === "approved"
                          ? "success"
                          : invite.invitationResponseStatus === "rejected"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {!invite.invitationResponseStatus && !invite.userFullName
                        ? "Pending"
                        : invite.invitationResponseStatus === "pending" && invite.userFullName
                        ? "Awaiting Review"
                        : invite.invitationResponseStatus === "approved"
                        ? "✓ Approved"
                        : "✗ Rejected"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {invite.expiresAt
                      ? formatRelative(invite.expiresAt)
                      : "No expiry"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      {invite.invitationResponseStatus === "pending" && invite.userFullName && (
                        <Button
                          variant="ghost"
                          onClick={() => setSelectedInvite(invite)}
                          className="text-xs text-blue-400 hover:text-blue-200"
                        >
                          Review
                        </Button>
                      )}
                      {invite.invitationResponseStatus !== "approved" && (
                        <Button
                          variant="ghost"
                          className="text-xs text-red-400 hover:text-red-200"
                          onClick={() => {
                            // TODO: implement revoke
                          }}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayInvites.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-zinc-500">
              No invitations in this category.
            </p>
          )}
        </div>
      </Card>

      {/* Review Modal */}
      {selectedInvite && (
        <InviteReviewModal
          invite={selectedInvite}
          onClose={() => setSelectedInvite(null)}
          onApprove={() => {
            fetchInvites();
          }}
          onReject={() => {
            fetchInvites();
          }}
        />
      )}
    </div>
  );
}

