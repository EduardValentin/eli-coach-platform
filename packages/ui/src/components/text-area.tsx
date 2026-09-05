import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

export const textAreaClasses = cva(
  "flex min-h-28 w-full min-w-0 border transition-[background-color,border-color,color,box-shadow] outline-none placeholder:text-text-muted aria-invalid:border-feedback-danger aria-invalid:outline-feedback-danger disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-muted disabled:shadow-none disabled:placeholder:text-text-muted",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default:
          "rounded-md border-border-subtle bg-surface-base px-3 py-2.5 text-body-base text-text-primary shadow-soft focus-visible:border-text-primary focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary",
        // Multi-line fields stay boxed inside the portals, but on the portal's
        // own corner and padding rather than the public form's.
        portal:
          "min-h-[9.375rem] rounded-field-multiline border-border-subtle bg-transparent p-4 text-body-sm/(--leading-field) text-text-primary shadow-none focus-visible:outline-brand-primary focus-visible:ring-6 focus-visible:ring-brand-primary/16",
      },
    },
  },
);

export type TextAreaProps = React.ComponentPropsWithoutRef<"textarea"> &
  VariantProps<typeof textAreaClasses>;

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, variant, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(textAreaClasses({ variant }), "resize-y", className)}
      {...props}
    />
  ),
);

TextArea.displayName = "TextArea";
