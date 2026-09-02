import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent",
        className
      )}
      {...props}
    />
  );
}
