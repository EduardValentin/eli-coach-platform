import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

export const iconButtonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-pill border border-transparent transition-[background-color,border-color,color,opacity,box-shadow,transform] duration-150 ease-out outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        md: "size-11",
        sm: "size-9",
      },
      variant: {
        ghost: "bg-transparent text-current hover:text-brand-primary",
        inverted: "bg-transparent text-text-inverted/80 hover:text-text-inverted",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "ghost",
    },
  },
);

export type IconButtonProps = Omit<React.ComponentPropsWithoutRef<"button">, "aria-label"> &
  VariantProps<typeof iconButtonVariants> & {
    "aria-label": string;
  };

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size, type = "button", variant, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonVariants({ size, variant }), className)}
      {...props}
    />
  ),
);

IconButton.displayName = "IconButton";
