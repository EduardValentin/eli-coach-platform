import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

export const inputClasses = cva(
  "flex w-full min-w-0 border py-2 transition-all outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary aria-invalid:border-feedback-danger aria-invalid:outline-feedback-danger disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-muted disabled:shadow-none disabled:placeholder:text-text-muted",
  {
    variants: {
      controlSize: {
        md: "min-h-[var(--size-control-md)]",
        lg: "min-h-[var(--size-control-lg)]",
      },
      variant: {
        default:
          "rounded-md border-border-subtle bg-surface-base px-3 text-text-primary shadow-soft placeholder:text-text-muted focus-visible:border-text-primary",
        inverted:
          "rounded-pill border-surface-base/30 bg-surface-base/15 px-6 text-text-inverted shadow-none backdrop-blur-xl backdrop-brightness-110 backdrop-saturate-150 placeholder:text-text-inverted/50 focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary/30",
      },
    },
    defaultVariants: {
      controlSize: "md",
      variant: "default",
    },
  },
);

export type InputProps = React.ComponentPropsWithoutRef<"input"> &
  VariantProps<typeof inputClasses>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, controlSize, variant, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(inputClasses({ controlSize, variant }), className)}
      {...props}
    />
  ),
);

Input.displayName = "Input";
