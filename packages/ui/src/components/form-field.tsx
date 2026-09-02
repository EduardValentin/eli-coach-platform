import * as React from "react";

import { cn } from "../lib/cn";

export type FormFieldProps = {
  children: (control: {
    "aria-describedby": string | undefined;
    "aria-invalid": boolean;
    id: string;
  }) => React.ReactNode;
  className?: string;
  error?: string;
  hint?: React.ReactNode;
  id: string;
  label: string;
};

/**
 * Pairs a label with its control and wires the error and hint into the control's
 * accessible description, so a screen reader hears why a field was rejected
 * rather than only that it was. Every form before this hand-rolled the same
 * `aria-describedby`/`aria-invalid` plumbing and some of them missed a piece.
 */
export function FormField({
  children,
  className,
  error,
  hint,
  id,
  label,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="text-label font-semibold text-text-primary"
      >
        {label}
      </label>
      {children({
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
        id,
      })}
      {hint && !error && (
        <p id={hintId} className="text-label text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-label font-medium text-feedback-danger">
          {error}
        </p>
      )}
    </div>
  );
}
