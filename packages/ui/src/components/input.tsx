import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

export const inputClasses = cva(
  "flex min-h-[var(--size-control-md)] w-full min-w-0 rounded-md border border-border-subtle bg-surface-base px-3 py-2 text-body-base text-text-primary shadow-soft transition-[background-color,border-color,color,box-shadow] outline-none placeholder:text-text-muted focus-visible:border-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary aria-invalid:border-feedback-danger aria-invalid:outline-feedback-danger disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-muted disabled:shadow-none disabled:placeholder:text-text-muted",
  {
    variants: {
      variant: {
        default: "",
        inverted:
          "border-surface-base/20 bg-surface-base/10 text-text-inverted shadow-none backdrop-blur-md placeholder:text-text-inverted/60 focus-visible:border-brand-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type InputProps = React.ComponentPropsWithoutRef<"input"> &
  VariantProps<typeof inputClasses>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, ...props }, ref) => (
    <input ref={ref} className={cn(inputClasses({ variant }), className)} {...props} />
  ),
);

Input.displayName = "Input";
