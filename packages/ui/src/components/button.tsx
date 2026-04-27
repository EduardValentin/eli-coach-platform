import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

export const buttonVariants = cva(
  "inline-flex min-w-0 items-center justify-center gap-[var(--space-2)] rounded-pill border border-transparent text-center font-medium whitespace-normal transition-[background-color,border-color,color,box-shadow,filter,transform] duration-150 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-subtle disabled:text-text-muted disabled:shadow-none",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-primary text-text-inverted shadow-brand-glow hover:bg-brand-primary-hover active:bg-brand-primary-pressed",
        secondary:
          "bg-brand-secondary text-text-inverted shadow-soft hover:bg-brand-secondary-hover active:brightness-95",
        destructive:
          "bg-feedback-danger text-text-inverted shadow-soft hover:brightness-95 active:brightness-90",
        ghost:
          "border-border-subtle bg-surface-base text-text-primary shadow-soft hover:border-brand-primary hover:text-brand-primary active:border-brand-primary-hover active:text-brand-primary-hover",
      },
      size: {
        sm: "min-h-[var(--size-control-sm)] px-[var(--space-4)] text-body-sm",
        md: "min-h-[var(--size-control-md)] px-[var(--space-5)] text-body-base",
        lg: "min-h-[var(--size-control-lg)] px-[var(--space-6)] text-body-lg",
        icon: "size-[var(--size-control-md)] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
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
