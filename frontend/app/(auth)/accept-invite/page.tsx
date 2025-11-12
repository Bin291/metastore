"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@/lib/hooks/use-auth-actions";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useEffect } from "react";

const schema = z.object({
  token: z.string().min(8),
  username: z.string().min(3),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export default function AcceptInvitePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { acceptInviteMutation, loginMutation } = useAuthActions();

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [router, user]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    acceptInviteMutation.mutate(values, {
      onSuccess: () => {
        loginMutation.mutate(
          { username: values.username, password: values.password },
          {
            onSuccess: () => router.replace("/dashboard"),
          }
        );
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <Card className="w-full max-w-lg p-8">
        <h1 className="text-2xl font-semibold text-white">Activate Account</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Use the invite token you received from an administrator to create your
          account.
        </p>
        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <label className="text-sm text-zinc-300">Invite Token</label>
            <Input
              placeholder="Paste your invite token"
              {...form.register("token")}
            />
            {form.formState.errors.token && (
              <p className="text-xs text-red-400">
                {form.formState.errors.token.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-zinc-300">Username</label>
            <Input placeholder="your.username" {...form.register("username")} />
            {form.formState.errors.username && (
              <p className="text-xs text-red-400">
                {form.formState.errors.username.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-zinc-300">Password</label>
            <Input
              type="password"
              placeholder="********"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-red-400">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          {acceptInviteMutation.isError && (
            <p className="text-sm text-red-400">
              Unable to accept invite. Please verify the token and try again.
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={acceptInviteMutation.isPending}
          >
            {acceptInviteMutation.isPending ? "Activating..." : "Activate"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-500">
          Already have credentials?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-400 hover:underline"
          >
            Sign in instead.
          </Link>
        </p>
      </Card>
    </div>
  );
}

