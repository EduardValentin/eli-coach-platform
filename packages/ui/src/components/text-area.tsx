import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

export const textAreaClasses = cva(
  "flex min-h-28 w-full min-w-0 border py-2.5 text-body-base text-text-primary transition-[background-color,border-color,color,box-shadow] outline-none placeholder:text-text-muted aria-invalid:border-feedback-danger disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-muted disabled:shadow-none disabled:placeholder:text-text-muted",
  {
    variants: {
      variant: {
        default:
          "rounded-md border-border-subtle bg-surface-base px-3 shadow-soft focus-visible:border-text-primary focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary aria-invalid:outline-feedback-danger",
        portal:
          "rounded-portal-control border-border-subtle bg-surface-base px-4 shadow-none focus-visible:border-brand-primary focus-visible:ring-1 focus-visible:ring-brand-primary aria-invalid:ring-feedback-danger",
        "portal-subtle":
          "rounded-portal-control border-border-subtle bg-surface-page px-4 shadow-none focus-visible:border-brand-primary focus-visible:ring-1 focus-visible:ring-brand-primary aria-invalid:ring-feedback-danger",
      },
    },
    defaultVariants: {
      variant: "default",
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
