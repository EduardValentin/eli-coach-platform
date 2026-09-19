import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const badgeClasses = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-field border px-2 py-0.5 text-xs font-medium transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      tone: {
        accent:
          "border-brand-secondary/20 bg-brand-secondary-surface text-brand-secondary",
        neutral: "border-border-default text-text-muted",
      },
    },
    defaultVariants: {
      tone: "accent",
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
      {...props}
    />
  ),
);

Badge.displayName = "Badge";
