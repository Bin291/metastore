"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInvitesStore } from "@/lib/stores/invites-store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/time-picker";
import { toast } from "@/components/ui/toast";

const inviteLinkSchema = z.object({
  role: z.enum(["user", "admin"]).default("user"),
  password: z.string().min(1, "Password is required"),
  expiresIn: z.number().min(1).default(24),
});

type InviteLinkFormValues = z.infer<typeof inviteLinkSchema>;

interface InviteLinkDialogProps {
  onClose: () => void;
  onSuccess: (link: string) => void;
}

export function InviteLinkDialog({ onClose, onSuccess }: InviteLinkDialogProps) {
  const [localLoading, setLocalLoading] = useState(false);
  const { createInvite, isLoading } = useInvitesStore();

  const form = useForm<InviteLinkFormValues>({
    resolver: zodResolver(inviteLinkSchema),
    defaultValues: {
      role: "user",
      password: "",
      expiresIn: 24,
    },
  });

  const handleGenerateLink = async (values: InviteLinkFormValues) => {
    setLocalLoading(true);
    try {
      // Calculate expiration time
      const expiresAt = new Date(Date.now() + values.expiresIn * 60 * 60 * 1000).toISOString();
      const invite = await createInvite(values.role, 1, expiresAt);
      const link = `${window.location.origin}/invites/accept/${invite.token}`;
      toast.success("Invite link generated successfully");
      onSuccess(link);
      form.reset();
    } catch (error) {
      toast.error("Failed to generate invite link");
      console.error("Failed to create invite:", error);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-12">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Generate Invitation Link</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-xl"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-6">
          Enter your password to generate an invitation link that can be shared with users.
        </p>

        <form className="space-y-4" onSubmit={form.handleSubmit(handleGenerateLink)}>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Your Password</span>
            <Input
              type="password"
              placeholder="Enter your admin password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <span className="text-xs text-red-400">{form.formState.errors.password.message}</span>
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
            <span className="text-sm text-zinc-300">Expires In (hours)</span>
            <Input
              type="number"
              min="1"
              placeholder="24"
              {...form.register("expiresIn", { valueAsNumber: true })}
            />
            {form.formState.errors.expiresIn && (
              <span className="text-xs text-red-400">{form.formState.errors.expiresIn.message}</span>
            )}
          </label>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={localLoading || isLoading}
              className="flex-1"
            >
              {localLoading || isLoading ? "Generating..." : "Generate Link"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}


