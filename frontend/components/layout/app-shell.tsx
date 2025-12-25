"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthActions } from "@/lib/hooks/use-auth-actions";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { notificationsService, NotificationDto } from "@/lib/services/notifications";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useAvatar } from "@/lib/hooks/use-avatar";
import { Button } from "@/components/ui/button";
import { LoaderCircle, Bell } from "lucide-react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const isLoadingUser = useAuthStore((state) => state.isLoading);
  const { logoutMutation } = useAuthActions();
  useCurrentUser();

  // Load avatar
  const avatarKey = user?.profileMetadata?.avatarUrl as string | undefined;
  const { avatarUrl } = useAvatar(avatarKey);

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingNotifications(true);
      const data = await notificationsService.listNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user]);

  // Fetch notifications on mount and every 10 seconds
  useEffect(() => {
    if (!user) return;
    
    // Fetch immediately on mount
    fetchNotifications();

    // Set up interval to fetch every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Refresh user data when subscription activation notification is received
  useEffect(() => {
    const hasSubscriptionNotification = notifications.some(
      (notif) => notif.type === 'subscription.activated' && !notif.readAt
    );
    if (hasSubscriptionNotification) {
      // Invalidate user query to refresh subscription info
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    }
  }, [notifications, queryClient]);

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace("/login");
    }
  }, [isLoadingUser, router, user]);

  const navItems = useMemo(
    () =>
      [
        { label: t('nav.overview'), href: "/dashboard" },
        { label: t('nav.files'), href: "/files" },
        { label: t('nav.subscription'), href: "/subscription" },
        { label: t('nav.settings'), href: "/settings" },
        ...(user?.role === "admin"
          ? [
              { label: t('nav.pendingReview'), href: "/admin/pending" },
              { label: t('nav.invites'), href: "/admin/invites" },
              { label: t('nav.users'), href: "/admin/users" },
              { label: t('nav.payments'), href: "/admin/payments" },
            ]
          : []),
      ] as const,
    [user?.role, t]
  );

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.push("/login");
  };

  if (isLoadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <LoaderCircle className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-500">
          Redirecting to authentication...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-lg font-semibold text-white">
              MetaStore
            </Link>
            <nav className="hidden gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-3 text-right text-xs text-zinc-400 sm:flex">
              {/* Avatar */}
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.username}
                  className="h-8 w-8 rounded-full object-cover border border-zinc-700"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-zinc-200">{user.username}</p>
                <div className="flex items-center gap-2">
                  <p className="capitalize">{user.role}</p>
                  {user.subscriptionPlan && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <p className="capitalize font-medium text-blue-400">
                        {user.subscriptionPlan === 'free' ? 'Free' : user.subscriptionPlan === 'plus' ? 'Plus' : 'Pro'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Bell className="h-5 w-5 text-zinc-400 hover:text-white" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg z-50 overflow-y-auto">
                  <div className="p-4 border-b border-zinc-800">
                    <h3 className="font-semibold text-white">Notifications ({notifications.length})</h3>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="p-4 space-y-3">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={cn(
                            "p-3 rounded-lg text-sm border-l-2 transition-colors",
                            notif.readAt
                              ? "bg-zinc-800/20 text-zinc-400 border-zinc-600"
                              : "bg-zinc-800/50 text-zinc-300 border-blue-500"
                          )}
                        >
                          <p>{notif.message}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-zinc-500">
                      No notifications
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
          </div>
        </div>
        <nav className="flex gap-2 px-4 pb-3 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}

