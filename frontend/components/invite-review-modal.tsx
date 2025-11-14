"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Invite } from "@/lib/services/invites";
import { useInvitesStore } from "@/lib/stores/invites-store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function generateRandomPassword() {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

const approveSchema = z.object({
  password: z.string().optional(),
  username: z.string().optional(),
  message: z.string().optional(),
});

type ApproveFormValues = z.infer<typeof approveSchema>;

interface InviteReviewModalProps {
  invite: Invite;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export function InviteReviewModal({
  invite,
  onClose,
  onApprove,
  onReject,
}: InviteReviewModalProps) {
  const [action, setAction] = useState<"view" | "approve" | "reject" | "success">("view");
  const [rejectReason, setRejectReason] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");

  const approveForm = useForm<ApproveFormValues>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      username: invite.userFullName || "",
    },
  });

  const { approveInvite, rejectInvite, isLoading } = useInvitesStore();

  const handleApprove = async (values: ApproveFormValues) => {
    try {
      const password = values.password || generateRandomPassword();
      setGeneratedPassword(password);
      
      await approveInvite(invite.id, password, values.username, approvalMessage);
      
      setAction("success");
      setTimeout(() => {
        onApprove();
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Failed to approve invite:", error);
    }
  };

  const handleReject = async () => {
    try {
      await rejectInvite(invite.id, rejectReason);
      onReject();
      onClose();
    } catch (error) {
      console.error("Failed to reject invite:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-12">
      <Card className="w-full max-w-lg p-6">
        {action === "view" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Review Invitation</h2>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-300 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <div>
                <p className="text-xs text-zinc-500">Email</p>
                <p className="text-sm font-medium text-white">{invite.email}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Full Name</p>
                <p className="text-sm font-medium text-white">{invite.userFullName}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Phone</p>
                <p className="text-sm font-medium text-white">{invite.userPhone}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Role</p>
                <Badge variant="default" className="capitalize">
                  {invite.role}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAction("reject")}
                className="flex-1 text-red-400 hover:text-red-200"
              >
                Reject
              </Button>
              <Button
                onClick={() => setAction("approve")}
                className="flex-1"
              >
                Approve
              </Button>
            </div>
          </>
        )}

        {action === "approve" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Create Account</h2>
              <button
                onClick={() => setAction("view")}
                className="text-zinc-500 hover:text-zinc-300 text-xl"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={approveForm.handleSubmit(handleApprove)}>
              <label className="flex flex-col gap-2">
                <span className="text-sm text-zinc-300">Login Username</span>
                <Input
                  type="text"
                  placeholder={invite.userFullName || "username"}
                  {...approveForm.register("username")}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-zinc-300">Initial Password (Optional)</span>
                <Input
                  type="password"
                  placeholder="Leave empty to auto-generate"
                  {...approveForm.register("password")}
                />
                <p className="text-xs text-zinc-500">If empty, a secure password will be generated automatically.</p>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-zinc-300">Message (Optional)</span>
                <textarea
                  placeholder={`Welcome to MetaStore! We're excited to have you on board. Your account has been approved and is ready to use. If you have any questions, feel free to reach out to our support team.`}
                  value={approvalMessage}
                  onChange={(e) => setApprovalMessage(e.target.value)}
                  className="h-20 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
                />
                <p className="text-xs text-zinc-500">This message will be sent to the user as a notification.</p>
              </label>

              <div className="rounded-lg border border-blue-800/30 bg-blue-900/10 p-3 text-xs text-blue-300">
                <p>The user will receive these credentials to log in.</p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAction("view")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </>
        )}

        {action === "reject" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Reject Invitation</h2>
              <button
                onClick={() => setAction("view")}
                className="text-zinc-500 hover:text-zinc-300 text-xl"
              >
                ✕
              </button>
            </div>

            <label className="flex flex-col gap-2 mb-4">
              <span className="text-sm text-zinc-300">Rejection Reason (Optional)</span>
              <textarea
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="h-24 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
              />
            </label>

            <div className="rounded-lg border border-red-800/30 bg-red-900/10 p-3 text-xs text-red-300 mb-4">
              <p>The user will be notified that their invitation was rejected.</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAction("view")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleReject}
                disabled={isLoading}
                variant="outline"
                className="flex-1 text-red-400 hover:text-red-200"
              >
                {isLoading ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </>
        )}

        {action === "success" && (
          <>
            <div className="text-center space-y-4">
              <div className="text-4xl">✓</div>
              <h2 className="text-lg font-semibold text-white">Account Created</h2>
              <p className="text-sm text-zinc-300">
                The account has been created successfully. The user will receive their credentials.
              </p>
              {generatedPassword && (
                <div className="rounded-lg border border-green-800/30 bg-green-900/10 p-4 space-y-2">
                  <p className="text-xs text-green-300 font-semibold">Generated Password:</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={generatedPassword}
                      readOnly
                      className="text-sm font-mono flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPassword);
                        setCopiedPassword(true);
                        setTimeout(() => setCopiedPassword(false), 2000);
                      }}
                      className="px-3 py-1 text-xs h-9 whitespace-nowrap"
                    >
                      {copiedPassword ? "✓ Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
