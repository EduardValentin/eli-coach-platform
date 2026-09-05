import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

// The `portal` variants are the reference app's field: 14px corner, no
// shadow, a brand ring on focus, and optionally the page-grey fill it gives
// fields inside dialogs.
export const inputClasses = cva(
  "block w-full min-w-0 border py-2 transition-all outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary aria-invalid:border-feedback-danger aria-invalid:outline-feedback-danger disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-muted disabled:shadow-none disabled:placeholder:text-text-muted",
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
        portal:
          "min-h-0 rounded-portal-control border-border-subtle bg-surface-base px-4 py-3 text-text-primary shadow-none placeholder:text-text-muted focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 aria-invalid:ring-feedback-danger",
        "portal-subtle":
          "min-h-0 rounded-portal-control border-border-subtle bg-surface-page px-4 py-2.5 text-text-primary shadow-none placeholder:text-text-muted focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary aria-invalid:ring-feedback-danger",
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
