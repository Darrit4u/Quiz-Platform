import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-violet-600 text-white shadow-sm hover:bg-violet-700":
            variant === "primary",
          "bg-zinc-100 text-zinc-900 hover:bg-zinc-200":
            variant === "secondary",
          "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100":
            variant === "outline",
          "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900":
            variant === "ghost",
          "bg-red-600 text-white shadow-sm hover:bg-red-700":
            variant === "danger",
          "h-8 px-3 text-sm": size === "sm",
          "h-10 px-4 py-2 text-sm": size === "md",
          "h-12 px-8 text-base": size === "lg",
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = "Button";
