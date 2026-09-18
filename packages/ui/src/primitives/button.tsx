import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const buttonClasses = cva(
  "rounded-control text-base font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-primary text-text-inverted hover:bg-brand-primary-hover",
        secondary:
          "bg-brand-secondary text-text-inverted shadow-soft hover:bg-brand-secondary-hover active:brightness-95",
        inverted:
          "bg-surface-inverted text-text-inverted hover:bg-brand-primary",
        outline:
          "border border-control-border-soft bg-surface-base text-text-label hover:bg-surface-quiet hover:text-text-emphasis focus-visible:border-border-focus",
        "outline-brand":
          "border border-brand-primary text-brand-primary hover:bg-brand-primary/5",
      },
      size: {
        md: "inline-flex h-12 shrink-0 items-center justify-center gap-2 px-4 py-2 whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0",
        lg: "inline-flex items-center justify-center gap-2 px-6 py-4",
        cta: "inline-flex h-12 items-center justify-center px-8",
        "cta-lg": "h-14 px-8 whitespace-nowrap",
      },
      label: {
        standard: "",
        regular: "font-normal",
        strong: "font-semibold",
        compact: "text-sm font-semibold",
        caps: "text-sm font-semibold tracking-widest uppercase",
        large: "text-lg",
      },
      elevation: {
        flat: "",
        raised: "shadow-action",
        lifted: "shadow-action hover:shadow-action-hover",
      },
      press: {
        none: "",
        scale: "transition-all active:scale-[0.98]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      label: "standard",
      elevation: "flat",
      press: "none",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonClasses>;

export function buttonVariants(options?: ButtonVariantProps): string {
  return cn(buttonClasses(options));
}

type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  ButtonVariantProps;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      elevation,
      label,
      press,
      size,
      variant,
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        buttonClasses({ elevation, label, press, size, variant }),
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
