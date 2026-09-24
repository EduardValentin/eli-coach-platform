import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonClasses = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-field font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline:
          "border border-control-border-soft bg-surface-base text-text-label hover:bg-surface-quiet hover:text-text-primary",
        ghost: "text-text-label hover:bg-surface-quiet hover:text-text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "destructive-outline":
          "border border-destructive/30 bg-surface-base text-destructive hover:bg-destructive/10",
      },
      size: {
        xs: "h-(--size-control-xs) px-3 text-sm has-[>svg]:px-2.5",
        sm: "h-(--size-control-sm) px-4 text-sm has-[>svg]:px-3",
        md: "h-(--size-control-md) px-6 text-base has-[>svg]:px-5",
        "icon-xs": "size-(--size-control-xs) rounded-full",
        "icon-sm": "size-(--size-control-sm) rounded-full",
        "icon-md":
          "size-(--size-control-md) rounded-full [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "sm",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonClasses>;

function buttonVariants({
  className,
  ...variants
}: ButtonVariantProps & { className?: string } = {}): string {
  return cn(buttonClasses(variants), className);
}

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    ButtonVariantProps & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      ref={ref}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
