import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const badgeClasses = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-field border px-2 py-0.5 text-xs font-medium transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      tone: {
        "brand-secondary":
          "border-brand-secondary/20 bg-brand-secondary-surface text-brand-secondary",
        muted: "border-border-default text-text-muted",
        pending:
          "border-status-pending/20 bg-status-pending-soft text-status-pending",
        success:
          "border-feedback-success/20 bg-feedback-success-soft text-feedback-success",
        count:
          "min-w-5 rounded-full border-transparent bg-current/12 px-1.5 text-caption font-medium tabular-nums opacity-80",
      },
    },
    defaultVariants: {
      tone: "muted",
    },
  },
);

type BadgeProps = React.ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof badgeClasses>;

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeClasses({ tone }), className)}
      data-slot="badge"
      {...props}
    />
  ),
);

Badge.displayName = "Badge";
