import * as React from "react";

import { cn } from "../lib/cn";

type InputProps = React.ComponentPropsWithoutRef<"input">;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-12 w-full min-w-0 rounded-field border border-control-border-soft bg-surface-quiet/50 px-3 py-1 text-base transition-[color,box-shadow] outline-none placeholder:text-text-muted focus-visible:border-border-focus aria-invalid:border-feedback-danger disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
