import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const buttonClasses = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-field transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "bg-brand-secondary text-brand-secondary-foreground hover:bg-brand-secondary-hover",
        inverted:
          "bg-surface-inverted text-text-inverted hover:bg-brand-primary",
        outline:
          "border border-control-border-soft bg-surface-base text-text-label hover:bg-surface-quiet hover:text-text-primary",
        "outline-brand":
          "border border-brand-primary text-brand-primary hover:bg-brand-primary/5",
        ghost: "text-text-label hover:bg-surface-quiet hover:text-text-primary",
        destructive:
          "bg-feedback-danger text-text-inverted hover:bg-feedback-danger/90",
        "destructive-outline":
          "border border-feedback-danger/30 bg-surface-base text-feedback-danger hover:bg-feedback-danger-soft",
        glass:
          "border border-text-inverted/30 bg-text-inverted/15 text-text-inverted backdrop-blur-sm hover:bg-text-inverted/25",
      },
      size: {
        xs: "h-(--size-control-xs) px-3 text-sm has-[>svg]:px-2.5",
        sm: "h-(--size-control-sm) px-4 text-sm has-[>svg]:px-3",
        md: "h-(--size-control-md) px-6 text-base has-[>svg]:px-5",
        lg: "h-(--size-control-lg) px-8 text-base",
        "lg-tight": "h-(--size-control-lg) px-4 text-base",
        "icon-xs": "size-(--size-control-xs) rounded-full",
        "icon-sm": "size-(--size-control-sm) rounded-full",
        "icon-md":
          "size-(--size-control-md) rounded-full [&_svg:not([class*='size-'])]:size-5",
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
      lettering: "plain",
      elevation: "flat",
      press: "none",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonClasses>;

type ButtonVariantOptions = ButtonVariantProps & { className?: string };

export function buttonVariants({
  className,
  ...variants
}: ButtonVariantOptions = {}): string {
  return cn(buttonClasses(variants), className);
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
      className={buttonVariants({
        className,
        elevation,
        lettering,
        press,
        size,
        textSize,
        variant,
        weight,
        width,
      })}
      {...props}
    />
  ),
);

Button.displayName = "Button";
