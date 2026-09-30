import * as React from "react";

import { cn } from "../lib/cn";

const CAPTION_CLASS = "text-sm font-medium";

const CAPTION_INK_CLASS = "text-text-label";

const LABEL_LAYOUT_CLASSES = {
  inline: "flex items-center gap-2",
  wrap: "flex flex-wrap items-baseline gap-1.5",
} as const;

type LabelLayout = keyof typeof LABEL_LAYOUT_CLASSES;

type LabelProps = React.ComponentPropsWithoutRef<"label"> & {
  htmlFor: string;
  invalid?: boolean;
  layout?: LabelLayout;
};

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, htmlFor, invalid, layout = "inline", ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        CAPTION_CLASS,
        LABEL_LAYOUT_CLASSES[layout],
        "leading-none select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 data-[error=true]:text-feedback-danger",
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
        CAPTION_INK_CLASS,
        LABEL_LAYOUT_CLASSES.wrap,
        "mb-1",
        className,
      )}
      {...props}
    />
  ),
);

Legend.displayName = "Legend";

type FieldCaptionProps = React.ComponentPropsWithoutRef<"p">;

export const FieldCaption = React.forwardRef<
  HTMLParagraphElement,
  FieldCaptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(CAPTION_CLASS, CAPTION_INK_CLASS, className)}
    {...props}
  />
));

FieldCaption.displayName = "FieldCaption";

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
