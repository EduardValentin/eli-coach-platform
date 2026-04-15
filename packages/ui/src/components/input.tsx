import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../lib/cn";

export const inputClasses = cva(
  "flex min-h-[var(--size-control-md)] w-full min-w-0 rounded-md border border-border-subtle bg-surface-base px-4 py-2 text-body-base text-text-primary shadow-soft transition-[background-color,border-color,color,box-shadow] outline-none placeholder:text-text-muted focus-visible:border-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary aria-invalid:border-feedback-danger aria-invalid:outline-feedback-danger disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-muted disabled:shadow-none disabled:placeholder:text-text-muted",
);

export type InputProps = React.ComponentPropsWithoutRef<"input">;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputClasses(), className)} {...props} />
  ),
);

Input.displayName = "Input";
