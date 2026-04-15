import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../lib/cn";

export const textAreaClasses = cva(
  "flex min-h-[calc(var(--space-8)+var(--space-9))] w-full min-w-0 rounded-md border border-border-subtle bg-surface-base px-4 py-3 text-body-base text-text-primary shadow-soft transition-[background-color,border-color,color,box-shadow] outline-none placeholder:text-text-muted focus-visible:border-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary aria-invalid:border-feedback-danger aria-invalid:outline-feedback-danger disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-muted disabled:shadow-none disabled:placeholder:text-text-muted",
);

export type TextAreaProps = React.ComponentPropsWithoutRef<"textarea">;

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(textAreaClasses(), "resize-y", className)}
      {...props}
    />
  ),
);

TextArea.displayName = "TextArea";
