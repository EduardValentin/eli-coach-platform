import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

export const badgeVariants = cva(
  "inline-flex w-fit items-center rounded-pill border px-[var(--space-3)] py-[var(--space-1)] text-label font-semibold uppercase text-text-primary shadow-soft",
  {
    variants: {
      variant: {
        default: "border-brand-primary/15 bg-brand-primary/10",
        info: "border-feedback-info/15 bg-feedback-info-soft",
        success: "border-feedback-success/15 bg-feedback-success-soft",
        pending: "border-status-pending/15 bg-status-pending-soft",
        destructive: "border-feedback-danger/15 bg-feedback-danger-soft",
        secondary: "border-brand-secondary/15 bg-brand-secondary-soft",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = React.ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof badgeVariants>;

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  ),
);

Badge.displayName = "Badge";
