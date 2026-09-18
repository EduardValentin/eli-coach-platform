import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-primary text-text-inverted hover:bg-brand-primary-hover",
        secondary:
          "bg-brand-secondary text-text-inverted shadow-soft hover:bg-brand-secondary-hover active:brightness-95",
        destructive:
          "bg-feedback-danger text-text-inverted shadow-soft hover:brightness-95 active:brightness-90",
        outline:
          "border border-control-border-soft bg-surface-base text-text-label hover:bg-surface-quiet hover:text-text-accent focus-visible:border-border-focus",
        ghost:
          "border border-border-subtle bg-surface-base text-text-primary shadow-soft hover:border-brand-primary hover:text-brand-primary active:border-brand-primary-hover active:text-brand-primary-hover",
      },
      size: {
        sm: "min-h-[var(--size-control-sm)] px-3 text-body-sm",
        md: "min-h-[var(--size-control-md)] px-4 py-2 text-body-base",
        lg: "min-h-[var(--size-control-lg)] px-6 text-body-lg",
        icon: "size-[var(--size-control-md)] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, variant, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ size, variant }), className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";
