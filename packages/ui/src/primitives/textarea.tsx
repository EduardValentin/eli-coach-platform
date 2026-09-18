import * as React from "react";

import { cn } from "../lib/cn";

type TextareaProps = React.ComponentPropsWithoutRef<"textarea">;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-lg border border-control-border-soft bg-surface-quiet/50 px-3 py-2 text-base transition-[color,box-shadow] outline-none placeholder:text-text-muted focus-visible:border-border-focus aria-invalid:border-feedback-danger disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
