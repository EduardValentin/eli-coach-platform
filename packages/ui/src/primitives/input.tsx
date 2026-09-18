import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

export const inputClasses = cva(
  "flex w-full min-w-0 border outline-none disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default:
          "h-9 rounded-lg border-transparent bg-surface-input px-3 py-1 text-base transition-[color,box-shadow] placeholder:text-text-muted focus-visible:border-border-focus aria-invalid:border-feedback-danger disabled:pointer-events-none disabled:opacity-50 md:text-sm",
        inverted:
          "min-h-[var(--size-control-lg)] rounded-pill border-surface-base/30 bg-surface-base/15 px-6 py-2 text-text-inverted shadow-none backdrop-blur-xl backdrop-brightness-110 backdrop-saturate-150 transition-all placeholder:text-text-inverted/50 focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary/30 aria-invalid:border-feedback-danger disabled:bg-surface-subtle disabled:text-text-muted disabled:placeholder:text-text-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type InputProps = React.ComponentPropsWithoutRef<"input"> &
  VariantProps<typeof inputClasses>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(inputClasses({ variant }), className)}
      {...props}
    />
  ),
);

Input.displayName = "Input";
