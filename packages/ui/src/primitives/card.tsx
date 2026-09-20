import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const cardClasses = cva("border", {
  variants: {
    variant: {
      card: "rounded-card border-stroke-faint bg-surface-base shadow-card",
      quiet: "rounded-card border-stroke-faint bg-surface-quiet",
      panel: "rounded-panel border-border-subtle bg-surface-base shadow-soft",
      "portal-panel":
        "rounded-panel border-border-default/50 bg-surface-base shadow-soft",
    },
  },
  defaultVariants: {
    variant: "card",
  },
});

type CardVariantProps = VariantProps<typeof cardClasses>;

export function cardVariants(options?: CardVariantProps): string {
  return cn(cardClasses(options));
}

type CardProps = React.ComponentPropsWithoutRef<"div"> & CardVariantProps;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardClasses({ variant }), className)}
      {...props}
    />
  ),
);

Card.displayName = "Card";
