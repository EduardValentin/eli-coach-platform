import * as React from "react";

import { cn } from "../lib/cn";

const CAPTION_CLASS = "text-sm font-medium";

type LabelProps = React.ComponentPropsWithoutRef<"label"> & {
  htmlFor: string;
  invalid?: boolean;
};

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, htmlFor, invalid, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        CAPTION_CLASS,
        "flex items-center gap-2 leading-none select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 data-[error=true]:text-feedback-danger",
        className,
      )}
      data-error={invalid}
      htmlFor={htmlFor}
      {...props}
    />
  ),
);

Label.displayName = "Label";

type LegendProps = React.ComponentPropsWithoutRef<"legend">;

export const Legend = React.forwardRef<HTMLLegendElement, LegendProps>(
  ({ className, ...props }, ref) => (
    <legend
      ref={ref}
      className={cn(
        CAPTION_CLASS,
        "mb-1 flex flex-wrap items-baseline gap-1.5 text-text-label",
        className,
      )}
      {...props}
    />
  ),
);

Legend.displayName = "Legend";

type LabelSuffixProps = React.ComponentPropsWithoutRef<"span">;

export const LabelSuffix = React.forwardRef<HTMLSpanElement, LabelSuffixProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("font-normal text-text-secondary", className)}
      {...props}
    />
  ),
);

LabelSuffix.displayName = "LabelSuffix";
