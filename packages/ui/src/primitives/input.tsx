import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const inputClasses = cva(
  "flex w-full min-w-0 rounded-field border border-control-border-soft bg-surface-base px-3 py-1 transition-[color,box-shadow] outline-none placeholder:text-text-muted focus-visible:border-border-focus aria-invalid:border-feedback-danger disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-(--size-control-sm) text-sm",
        md: "h-12 text-base md:text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type InputProps = Omit<React.ComponentPropsWithoutRef<"input">, "size"> &
  VariantProps<typeof inputClasses>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = "md", ...props }, ref) => (
    <input
      ref={ref}
      className={cn(inputClasses({ size }), className)}
      data-size={size}
      {...props}
    />
  ),
);

Input.displayName = "Input";
