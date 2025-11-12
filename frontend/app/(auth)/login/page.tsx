"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@/lib/hooks/use-auth-actions";
import { useAuthStore } from "@/lib/stores/auth-store";

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { loginMutation } = useAuthActions();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [router, user]);

  const onSubmit = (values: FormValues) => {
    loginMutation.mutate(values, {
      onSuccess: () => router.replace("/dashboard"),
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold text-white">MetaStore</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Sign in with your administrator-provided credentials.
        </p>
        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
          {loginMutation.isError && (
            <p className="text-sm text-red-400">
              Authentication failed. Please verify your credentials.
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-500">
          Have an invite token?{" "}
          <Link
            href="/accept-invite"
            className="font-medium text-indigo-400 hover:underline"
          >
            Activate your account.
          </Link>
        </p>
      </Card>
    </div>
  );
}

