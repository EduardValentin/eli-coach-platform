import { CalendarDays } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/cn";
import { fieldSizeClasses, type FieldSize } from "../primitives/field-size";

const GLYPH_SIZE = 16;
// Safari's default Tab order visits text fields only and skips buttons unless
// they carry an explicit tabindex; a control that stands in for a form field
// must stay reachable like the native field it replaces.
const FIELD_TAB_INDEX = 0;

// A button that has to read as one of the form's fields, so it carries the
// Input primitive's frame rather than a button variant.
const FIELD_TRIGGER_CLASS =
  "flex w-full min-w-0 items-center justify-between gap-2 rounded-field border border-control-border-soft bg-surface-base text-left transition-[color,box-shadow] outline-none focus-visible:border-border-focus aria-invalid:border-feedback-danger disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

type DateFieldTriggerProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "children" | "type"
> & {
  placeholder: string;
  size?: FieldSize;
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
      className={cn(FIELD_TRIGGER_CLASS, fieldSizeClasses({ size }), className)}
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
