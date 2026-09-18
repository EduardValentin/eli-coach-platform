import * as React from "react";

import { cn } from "../lib/cn";
import { inputClasses } from "./input";

type TextareaProps = React.ComponentPropsWithoutRef<"textarea">;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(inputClasses(), "resize-none", className)}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
