import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

// `context` is where the button lives: the public site keeps the pill with
// the brand glow; portal surfaces take the reference app's 14px corner,
// semibold label and neutral drop shadow.
export const buttonVariants = cva(
  "inline-flex min-w-0 items-center justify-center gap-2 rounded-pill border border-transparent text-center whitespace-normal transition-[background-color,border-color,color,box-shadow,filter,transform] duration-150 ease-out outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:border-border-subtle disabled:bg-surface-subtle disabled:text-text-muted disabled:shadow-none",
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
        text: "bg-transparent text-text-secondary shadow-none hover:bg-surface-hover hover:text-text-primary active:bg-surface-hover",
      },
      size: {
        sm: "min-h-[var(--size-control-sm)] px-3 text-body-sm",
        md: "min-h-[var(--size-control-md)] px-4 text-body-base",
        lg: "min-h-[var(--size-control-lg)] px-6 text-body-lg",
        icon: "size-[var(--size-control-md)] p-0",
      },
      context: {
        public: "",
        portal: "rounded-portal-control font-semibold",
      },
    },
    compoundVariants: [
      { context: "portal", variant: "primary", class: "shadow-portal-control" },
      {
        context: "portal",
        variant: "ghost",
        class:
          "shadow-portal-card font-medium hover:border-border-subtle hover:bg-surface-page hover:text-text-primary active:border-border-subtle active:text-text-primary",
      },
      { context: "portal", size: "sm", class: "min-h-0 px-4 py-2" },
      { context: "portal", size: "md", class: "min-h-11 px-5 py-2.5" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
      context: "public",
    },
  },
);

export type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, context, size, variant, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ context, size, variant }), className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";
