import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const buttonClasses = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover",
        secondary:
          "bg-brand-secondary text-brand-secondary-foreground hover:bg-brand-secondary-hover",
        inverted:
          "bg-surface-inverted text-text-inverted hover:bg-brand-primary",
        outline:
          "border border-control-border-soft bg-surface-base text-text-label hover:bg-surface-quiet hover:text-text-primary",
        "outline-brand":
          "border border-brand-primary text-brand-primary hover:bg-brand-primary/5",
        glass:
          "border border-text-inverted/30 bg-text-inverted/15 text-text-inverted backdrop-blur-sm hover:bg-text-inverted/25",
      },
      size: {
        xs: "h-(--size-control-xs) px-4",
        md: "h-(--size-control-md) px-8",
        lg: "h-(--size-control-lg) px-8",
        "lg-tight": "h-(--size-control-lg) px-4",
      },
      width: {
        content: "",
        full: "w-full shrink",
        "full-below-sm": "w-full sm:w-auto",
      },
      weight: {
        regular: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
      },
      textSize: {
        sm: "text-sm",
        base: "text-base",
        lg: "text-lg",
      },
      lettering: {
        plain: "",
        wide: "tracking-wide",
        caps: "uppercase tracking-widest",
      },
      elevation: {
        flat: "",
        raised: "shadow-action transition-all hover:shadow-action-hover",
      },
      press: {
        none: "",
        scale: "transition-all active:scale-[0.98]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      width: "content",
      weight: "medium",
      textSize: "base",
      lettering: "plain",
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
      lettering,
      press,
      size,
      textSize,
      variant,
      weight,
      width,
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        buttonClasses({
          elevation,
          lettering,
          press,
          size,
          textSize,
          variant,
          weight,
          width,
        }),
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
