import * as React from "react";

import { cn } from "../lib/cn";
import { FIELD_FRAME_CLASS } from "./field-frame";
import { FIELD_SIZE_CLASS } from "./field-size";

const INPUT_CLASS =
  "flex min-w-0 py-1 placeholder:text-text-muted focus-visible:border-focus-ring";

type InputProps = Omit<React.ComponentPropsWithoutRef<"input">, "size">;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        FIELD_FRAME_CLASS,
        INPUT_CLASS,
        FIELD_SIZE_CLASS,
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
