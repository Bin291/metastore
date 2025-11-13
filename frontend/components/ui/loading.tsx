"use client";

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-400`}
      />
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-zinc-900 p-8">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-zinc-400">Loading...</p>
      </div>
    </div>
  );
}

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
    </div>
  );
}

