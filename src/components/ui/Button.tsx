import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-accent-gradient text-white hover:brightness-110",
        variant === "ghost" &&
          "bg-surface text-text hover:bg-surface-hover border border-border",
        variant === "danger" && "text-danger hover:bg-danger/10",
        className
      )}
      {...props}
    />
  );
}
