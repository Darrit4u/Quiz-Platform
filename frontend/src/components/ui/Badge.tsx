import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        {
          "border-transparent bg-violet-100 text-violet-800":
            variant === "default",
          "border-transparent bg-zinc-100 text-zinc-800":
            variant === "secondary",
          "border-zinc-200 text-zinc-900": variant === "outline",
          "border-transparent bg-green-100 text-green-800":
            variant === "success",
          "border-transparent bg-yellow-100 text-yellow-800":
            variant === "warning",
        },
        className,
      )}
      {...props}
    />
  ),
);

Badge.displayName = "Badge";
