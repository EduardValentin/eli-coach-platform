import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonClasses = cva(
  "relative hit-area inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-field font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground not-aria-disabled:hover:bg-primary-hover",
        outline:
          "border border-control-border-soft bg-surface-base text-text-label not-aria-disabled:hover:bg-surface-quiet not-aria-disabled:hover:text-text-primary",
        ghost:
          "text-text-label aria-invalid:text-destructive not-aria-disabled:hover:bg-surface-quiet not-aria-disabled:hover:text-text-primary",
        "ghost-muted":
          "text-text-secondary aria-invalid:text-destructive not-aria-disabled:hover:bg-surface-quiet not-aria-disabled:hover:text-text-primary",
        link: "text-primary underline-offset-4 aria-invalid:text-destructive not-aria-disabled:hover:underline",
        destructive:
          "bg-destructive text-destructive-foreground not-aria-disabled:hover:bg-destructive/90",
        "destructive-outline":
          "border border-destructive/30 bg-surface-base text-destructive not-aria-disabled:hover:bg-destructive/10",
        "destructive-link": "text-destructive underline-offset-4 not-aria-disabled:hover:underline",
        disclosure:
          "font-normal text-text-secondary not-aria-disabled:hover:bg-surface-quiet not-aria-disabled:hover:text-text-primary data-[state=open]:text-text-primary [&>svg:last-child]:transition-transform motion-reduce:[&>svg:last-child]:transition-none data-[state=open]:[&>svg:last-child]:rotate-180",
        drop: "w-full border border-dashed border-control-border-soft bg-surface-subtle text-text-secondary not-aria-disabled:hover:border-primary not-aria-disabled:hover:bg-primary-soft not-aria-disabled:hover:text-primary data-[drop=ready]:border-primary/40 data-[drop=ready]:bg-primary-soft data-[drop=over]:border-primary data-[drop=over]:bg-primary-soft data-[drop=over]:text-primary",
      },
      size: {
        xs: "h-(--size-control-xs) px-3 text-sm has-[>svg]:px-2.5",
        sm: "h-(--size-control-sm) px-4 text-sm has-[>svg]:px-3",
        md: "h-(--size-control-md) px-6 text-base has-[>svg]:px-5",
        inline: "h-auto w-fit whitespace-normal px-0 text-left text-sm has-[>svg]:px-0",
        "icon-xs": "size-(--size-control-xs) rounded-full",
        "icon-sm": "size-(--size-control-sm) rounded-full",
        "icon-md":
          "size-(--size-control-md) rounded-full [&_svg:not([class*='size-'])]:size-5",
      },
      elevation: {
        flat: "",
        card: "shadow-card",
      },
    },
    compoundVariants: [{ variant: "drop", size: "md", class: "text-sm" }],
    defaultVariants: {
      variant: "primary",
      size: "sm",
      elevation: "flat",
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
>(({ className, variant, size, elevation, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      ref={ref}
      className={buttonVariants({ variant, size, elevation, className })}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
