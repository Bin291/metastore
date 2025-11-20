"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInvitesStore } from "@/lib/stores/invites-store";
import { Invite } from "@/lib/services/invites";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const acceptInviteSchema = z.object({
  email: z.string().email(),
  userFullName: z.string().min(1, "Name is required"),
  userPhone: z.string().min(1, "Phone is required"),
});

type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>;

function CredentialsSection({ invite }: { invite: Invite }) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const username = invite.metadata?.temporaryUsername || invite.userFullName;
  const password = invite.metadata?.temporaryPassword || "";

  const handleCopyUsername = async () => {
    try {
      await navigator.clipboard.writeText(username || "");
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password || "");
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleCopyAll = async () => {
    const text = `Username: ${username}\nPassword: ${password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="rounded-lg border border-green-800/50 bg-green-900/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-green-400 text-sm font-semibold">✓ Account Created</span>
      </div>
      
      <p className="text-xs text-green-300">
        Your account has been created. Use the credentials below to login.
      </p>

      <div className="space-y-3 bg-zinc-950/50 rounded p-3 border border-zinc-800">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Username</label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              readOnly
              value={username || ""}
              className="flex-1 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyUsername}
              className="px-3 py-1 text-xs h-9 whitespace-nowrap"
            >
              {copiedUsername ? "✓ Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Password</label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              readOnly
              value={password || ""}
              className="flex-1 text-sm font-mono"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyPassword}
              className="px-3 py-1 text-xs h-9 whitespace-nowrap"
            >
              {copiedPassword ? "✓ Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </div>

      <Button
        type="button"
        onClick={handleCopyAll}
        className="w-full bg-green-700 hover:bg-green-600"
      >
        {copiedAll ? "✓ Copied!" : "Copy All Credentials"}
      </Button>

      <p className="text-xs text-zinc-400 italic">
        Your password was securely created by the admin. Keep it safe.
      </p>
    </div>
  );
}

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(true);

  const { getByToken, acceptInvite, isLoading } = useInvitesStore();

  const form = useForm<AcceptInviteFormValues>({
    resolver: zodResolver(acceptInviteSchema),
  });

  // Fetch invite details
  useEffect(() => {
    const loadInvite = async () => {
      try {
        const data = await getByToken(params.token);
        setInvite(data);
        form.setValue("email", data.email);
      } catch (error) {
        console.error("Failed to load invite:", error);
      } finally {
        setLoadingInvite(false);
      }
    };
    loadInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  // Auto-reload invite status every 5 seconds
  useEffect(() => {
    if (submitted) {
      const interval = setInterval(async () => {
        try {
          const data = await getByToken(params.token);
          setInvite(data);
        } catch (error) {
          console.error("Failed to reload invite:", error);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [submitted, params.token, getByToken]);

  const handleSubmit = async (values: AcceptInviteFormValues) => {
    try {
      const result = await acceptInvite(
        params.token,
        values.email,
        values.userFullName,
        values.userPhone
      );
      setInvite(result);
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to accept invite:", error);
    }
  };

  if (loadingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
        <Card className="w-full max-w-md p-8">
          <p className="text-center text-zinc-400">Loading invite...</p>
        </Card>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
        <Card className="w-full max-w-md p-8">
          <p className="text-center text-red-400">Invite not found or has expired.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <Card className="w-full max-w-md p-8">
        {!submitted ? (
          <>
            <h1 className="text-xl font-semibold text-white">Join MetaStore</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Complete your registration using the invite sent to you.
            </p>

            {invite.status !== "pending" && (
              <div className="mt-4 rounded-lg border border-red-800 bg-red-900/20 p-3">
                <p className="text-sm text-red-400">
                  This invite is no longer valid.
                </p>
              </div>
            )}

            {invite.status === "pending" && (
              <form
                className="mt-6 space-y-4"
                onSubmit={form.handleSubmit(handleSubmit)}
              >
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-zinc-300">Email</span>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <span className="text-xs text-red-400">
                      {form.formState.errors.email.message}
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-zinc-300">Full Name</span>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    {...form.register("userFullName")}
                  />
                  {form.formState.errors.userFullName && (
                    <span className="text-xs text-red-400">
                      {form.formState.errors.userFullName.message}
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-zinc-300">Phone Number</span>
                  <Input
                    type="tel"
                    placeholder="+84 123 456 789"
                    {...form.register("userPhone")}
                  />
                  {form.formState.errors.userPhone && (
                    <span className="text-xs text-red-400">
                      {form.formState.errors.userPhone.message}
                    </span>
                  )}
                </label>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400">
                  <p className="font-semibold text-zinc-300">Your info will be reviewed by an admin.</p>
                  <p className="mt-1">After approval, you&apos;ll receive account credentials.</p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Submitting..." : "Submit Registration"}
                </Button>
              </form>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-white">
                Registration Submitted
              </h1>
              <p className="text-sm text-zinc-500">
                Thank you for completing your registration.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <div>
                <p className="text-xs text-zinc-500">Email</p>
                <p className="text-sm font-medium text-white">{invite.email}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Full Name</p>
                <p className="text-sm font-medium text-white">{invite.userFullName}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Phone Number</p>
                <p className="text-sm font-medium text-white">{invite.userPhone}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Role</p>
                <p className="text-sm font-medium text-white capitalize">
                  {invite.role}
                </p>
              </div>
              <div className="pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">Status</p>
                <Badge
                  variant={
                    invite.invitationResponseStatus === "pending"
                      ? "warning"
                      : invite.invitationResponseStatus === "approved"
                      ? "success"
                      : "danger"
                  }
                >
                  {invite.invitationResponseStatus === "pending"
                    ? "⏳ Awaiting Review"
                    : invite.invitationResponseStatus === "approved"
                    ? "✓ Approved"
                    : "✗ Rejected"}
                </Badge>
              </div>
            </div>

            {invite.invitationResponseStatus === "approved" && (
              <CredentialsSection invite={invite} />
            )}

            <div className="rounded-lg border border-blue-800/30 bg-blue-900/10 p-3 text-xs text-blue-300">
              <p>An admin will review your information and contact you soon.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
