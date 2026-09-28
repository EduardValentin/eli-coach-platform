import * as React from "react";

import { cn } from "../lib/cn";
import {
  FIELD_FRAME_CLASS,
  fieldSizeClasses,
  type FieldSize,
} from "./field-size";

const INPUT_CLASS =
  "flex min-w-0 py-1 placeholder:text-text-muted focus-visible:border-focus-ring";

type InputProps = Omit<React.ComponentPropsWithoutRef<"input">, "size"> & {
  size?: FieldSize;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = "md", ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        FIELD_FRAME_CLASS,
        INPUT_CLASS,
        fieldSizeClasses({ size }),
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
