"use client";

import { cn } from "@/lib/utils";

const variants = {
  default: "bg-zinc-800 text-zinc-100",
  success: "bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-400/40",
  danger: "bg-red-500/10 text-red-400 ring-1 ring-red-500/40",
  info: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/40",
};

type Variant = keyof typeof variants;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

