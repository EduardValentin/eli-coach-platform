import * as React from "react";

import { cn } from "../lib/cn";
import { fieldSizeClasses, type FieldSize } from "./field-size";

const INPUT_CLASS =
  "flex w-full min-w-0 rounded-field border border-control-border-soft bg-surface-base py-1 transition-[color,box-shadow] outline-none placeholder:text-text-muted focus-visible:border-border-focus aria-invalid:border-feedback-danger disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

type InputProps = Omit<React.ComponentPropsWithoutRef<"input">, "size"> & {
  size?: FieldSize;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = "md", ...props }, ref) => (
    <input
      ref={ref}
      className={cn(INPUT_CLASS, fieldSizeClasses({ size }), className)}
      {...props}
    />
  ),
);

Input.displayName = "Input";
