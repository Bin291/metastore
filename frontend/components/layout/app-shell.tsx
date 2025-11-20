"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthActions } from "@/lib/hooks/use-auth-actions";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { notificationsService, NotificationDto } from "@/lib/services/notifications";
import { Button } from "@/components/ui/button";
import { LoaderCircle, Bell } from "lucide-react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoadingUser = useAuthStore((state) => state.isLoading);
  const { logoutMutation } = useAuthActions();
  useCurrentUser();

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

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace("/login");
    }
  }, [isLoadingUser, router, user]);

  const navItems = useMemo(
    () =>
      [
        { label: "Overview", href: "/dashboard" },
        { label: "Files", href: "/files" },
        { label: "Share Links", href: "/share-links" },
        ...(user?.role === "admin"
          ? [
              { label: "Pending Review", href: "/admin/pending" },
              { label: "Invites", href: "/admin/invites" },
              { label: "Users", href: "/admin/users" },
            ]
          : []),
      ] as const,
    [user?.role]
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
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-950/40 p-6 md:flex">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white">MetaStore</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Secure file management platform.
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-400">
          <p className="font-semibold text-zinc-200">Logged in as</p>
          <p>{user.username}</p>
          <p className="capitalize">{user.role}</p>
        </div>
        <Button
          variant="outline"
          className="mt-4"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          Logout
        </Button>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 py-4 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Welcome back, {user.username}
            </h2>
            <p className="text-sm text-zinc-500">
              Manage your storage and share files securely.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Notifications Icon */}
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

              {/* Notifications Dropdown */}
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
              className="md:hidden"
            >
              Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-zinc-950 p-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

