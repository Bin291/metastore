"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const baseStyles =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-zinc-950";

const variants = {
  default: "bg-indigo-500 text-white hover:bg-indigo-400",
  outline:
    "border border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white",
  ghost: "text-zinc-200 hover:bg-zinc-800",
  destructive: "bg-red-500 text-white hover:bg-red-400",
};

type Variant = keyof typeof variants;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

