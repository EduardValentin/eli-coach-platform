import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const iconButtonVariants = cva(
  "outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        ghost:
          "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-current transition-[background-color,border-color,color,opacity,box-shadow,transform] duration-150 ease-out hover:text-brand-primary",
        plain: "p-2",
        soft: "flex size-10 items-center justify-center rounded-full bg-surface-quiet text-text-secondary transition-colors hover:bg-surface-muted",
      },
    },
    defaultVariants: {
      variant: "ghost",
    },
  },
);

type IconButtonProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "aria-label"
> &
  VariantProps<typeof iconButtonVariants> & {
    "aria-label": string;
  };

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, type = "button", variant, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonVariants({ variant }), className)}
      {...props}
    />
  ),
);

IconButton.displayName = "IconButton";
