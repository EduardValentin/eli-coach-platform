import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const fieldSurfaceClass =
  "flex w-full min-w-0 rounded-field border border-control-border-soft bg-surface-base text-base transition-[color,box-shadow] outline-none md:text-sm dark:bg-input/30";

const fieldStateClass =
  "focus-visible:border-focus-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive";

const inputVariants = cva("", {
  variants: {
    size: {
      md: "h-(--size-control-md) px-3",
      sm: "h-(--size-control-sm) px-2.5",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size = "md", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        fieldSurfaceClass,
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground py-1 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        inputVariants({ size }),
        fieldStateClass,
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { fieldStateClass, fieldSurfaceClass, Input, inputVariants };
