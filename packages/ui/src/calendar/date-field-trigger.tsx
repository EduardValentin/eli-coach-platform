import { cva, type VariantProps } from "class-variance-authority";
import { CalendarDays } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/cn";

const GLYPH_SIZE = 16;
// Safari's default Tab order visits text fields only and skips buttons unless
// they carry an explicit tabindex; a control that stands in for a form field
// must stay reachable like the native field it replaces.
const FIELD_TAB_INDEX = 0;

// A button that has to read as one of the form's fields, so it carries the
// Input primitive's frame rather than a button variant.
const fieldTriggerClasses = cva(
  "flex w-full min-w-0 items-center justify-between gap-2 rounded-field border border-control-border-soft bg-surface-base px-3 text-left transition-[color,box-shadow] outline-none focus-visible:border-border-focus aria-invalid:border-feedback-danger disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-(--size-control-sm) text-sm",
        md: "h-12 text-base md:text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type DateFieldTriggerSize = NonNullable<
  VariantProps<typeof fieldTriggerClasses>["size"]
>;

type DateFieldTriggerProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "children" | "type"
> & {
  placeholder: string;
  size?: DateFieldTriggerSize;
  text: string;
};

export const DateFieldTrigger = React.forwardRef<
  HTMLButtonElement,
  DateFieldTriggerProps
>(({ className, placeholder, size = "md", text, ...buttonProps }, ref) => {
  const isEmpty = text.length === 0;

  return (
    <button
      ref={ref}
      className={cn(fieldTriggerClasses({ size }), className)}
      data-size={size}
      tabIndex={FIELD_TAB_INDEX}
      type="button"
      {...buttonProps}
    >
      <span
        className={cn({
          "text-text-muted": isEmpty,
          "text-text-primary": !isEmpty,
        })}
      >
        {isEmpty ? placeholder : text}
      </span>
      <CalendarDays
        aria-hidden="true"
        className="shrink-0 text-text-muted"
        size={GLYPH_SIZE}
      />
    </button>
  );
});

DateFieldTrigger.displayName = "DateFieldTrigger";
