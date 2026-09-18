import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";
import { inputClasses } from "./input";

type TextareaProps = React.ComponentPropsWithoutRef<"textarea"> &
  VariantProps<typeof inputClasses>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, controlSize, variant, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        inputClasses({ controlSize, variant }),
        "resize-none",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
