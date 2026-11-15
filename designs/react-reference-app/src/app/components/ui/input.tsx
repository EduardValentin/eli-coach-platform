import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const fieldSurfaceClass =
  "flex w-full min-w-0 rounded-field border border-control-border-soft bg-surface-base text-base transition-[color,box-shadow] outline-none md:text-sm dark:bg-input/30";

const fieldStateClass =
  "focus-visible:border-focus-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive";

const inputVariants = cva("h-(--size-control-md) px-3", {
  variants: {
    appearance: {
      field: "",
      "inline-title":
        "rounded-none border-x-0 border-t-0 border-b bg-transparent px-1 font-serif text-xl text-text-primary shadow-none hover:border-text-secondary md:text-xl dark:bg-transparent",
    },
  },
  defaultVariants: {
    appearance: "field",
  },
});

type InputProps = Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, appearance = "field", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        fieldSurfaceClass,
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground py-1 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        inputVariants({ appearance }),
        fieldStateClass,
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { fieldStateClass, fieldSurfaceClass, Input, inputVariants };
