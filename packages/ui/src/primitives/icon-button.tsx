import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-pill border border-transparent transition-[background-color,border-color,color,opacity,box-shadow,transform] duration-150 ease-out outline-none disabled:pointer-events-none disabled:opacity-50 bg-transparent text-current hover:text-brand-primary",
  {
    variants: {
      size: {
        md: "size-11",
        sm: "size-9",
      },
    },
    defaultVariants: {
      size: "md",
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
  ({ className, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonVariants({ size }), className)}
      {...props}
    />
  ),
);

IconButton.displayName = "IconButton";
