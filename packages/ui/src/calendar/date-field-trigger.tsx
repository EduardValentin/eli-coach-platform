import * as React from "react";

import { cn } from "../lib/cn";
import { glyphAttributes } from "../lib/glyph";

const GLYPH_SIZE = 16;
// Safari's default Tab order visits text fields only and skips buttons unless
// they carry an explicit tabindex; a control that stands in for a form field
// must stay reachable like the native field it replaces.
const FIELD_TAB_INDEX = 0;

// A button that has to read as one of the form's fields, so it carries the
// Input primitive's frame rather than a button variant.
const FIELD_TRIGGER_CLASS_NAME =
  "flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-field border border-control-border-soft bg-surface-quiet/50 px-3 text-left text-base transition-[color,box-shadow] outline-none focus-visible:border-border-focus aria-invalid:border-feedback-danger disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

function CalendarDaysGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0 text-text-muted"
      {...glyphAttributes(GLYPH_SIZE)}
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect height="18" rx="2" width="18" x="3" y="4" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}

type DateFieldTriggerProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "children" | "type"
> & {
  placeholder: string;
  text: string;
};

export const DateFieldTrigger = React.forwardRef<
  HTMLButtonElement,
  DateFieldTriggerProps
>(({ className, placeholder, text, ...buttonProps }, ref) => {
  const isEmpty = text.length === 0;

  return (
    <button
      ref={ref}
      className={cn(FIELD_TRIGGER_CLASS_NAME, className)}
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
      <CalendarDaysGlyph />
    </button>
  );
});

DateFieldTrigger.displayName = "DateFieldTrigger";
