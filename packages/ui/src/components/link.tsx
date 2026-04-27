import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Link as RouterLink, type LinkProps as RouterLinkProps } from "react-router";

import { cn } from "../lib/cn";

export const linkVariants = cva(
  "outline-none transition-[background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary",
  {
    variants: {
      variant: {
        inline:
          "font-medium text-brand-primary underline-offset-4 hover:text-brand-primary-hover hover:underline",
        subtle: "font-medium text-text-secondary hover:text-text-primary",
        pill: "inline-flex items-center rounded-pill border border-border-subtle bg-surface-base/80 px-[var(--space-4)] py-[var(--space-2)] text-body-sm font-medium text-text-primary shadow-soft hover:border-brand-primary hover:text-brand-primary",
      },
    },
    defaultVariants: {
      variant: "inline",
    },
  },
);

export type LinkProps = RouterLinkProps & VariantProps<typeof linkVariants>;

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, prefetch = "intent", variant, ...props }, ref) => (
    <RouterLink
      ref={ref}
      prefetch={prefetch}
      className={cn(linkVariants({ variant }), className)}
      {...props}
    />
  ),
);

Link.displayName = "Link";
