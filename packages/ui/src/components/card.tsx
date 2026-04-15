import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../lib/cn";

export const cardClasses = cva(
  "rounded-panel border border-border-subtle bg-surface-base p-6 shadow-soft sm:p-7",
);

export type CardProps = React.ComponentPropsWithoutRef<"div">;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(cardClasses(), className)} {...props} />
  ),
);

Card.displayName = "Card";
