import * as React from "react";

import { cn } from "../lib/cn";
import { describedByOf } from "../lib/described-by";
import { FieldError } from "./field-error";
import { FieldHint } from "./field-hint";
import { Label, LabelSuffix } from "./label";

type FieldLabelSuffix = { parity?: string; text: string };

type FieldHintPlacement = "before-control" | "after-control";

export type FieldControlAttributes = {
  "aria-describedby": string | undefined;
  "aria-invalid": boolean;
  id: string;
};

type FieldLayoutProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "children"
> & {
  children: (controlAttributes: FieldControlAttributes) => React.ReactNode;
  error?: string;
  errorParity?: string;
  hint?: string;
  hintPlacement?: FieldHintPlacement;
  label: React.ReactNode;
  suffixes?: readonly FieldLabelSuffix[];
};

export function FieldLayout({
  children,
  className,
  error,
  errorParity,
  hint,
  hintPlacement = "before-control",
  label,
  suffixes = [],
  ...props
}: FieldLayoutProps) {
  const controlId = React.useId();
  const hintId = `${controlId}-hint`;
  const messageId = `${controlId}-message`;
  const invalid = error !== undefined;
  const hintLine = hint && <FieldHint id={hintId}>{hint}</FieldHint>;

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      <Label htmlFor={controlId} invalid={invalid} layout="wrap">
        {label}
        {suffixes.map((suffix) => (
          <LabelSuffix data-parity={suffix.parity} key={suffix.text}>
            {suffix.text}
          </LabelSuffix>
        ))}
      </Label>
      {hintPlacement === "before-control" && hintLine}
      {children({
        "aria-describedby": describedByOf(
          hint ? hintId : undefined,
          invalid ? messageId : undefined,
        ),
        "aria-invalid": invalid,
        id: controlId,
      })}
      {hintPlacement === "after-control" && hintLine}
      <FieldError data-parity={errorParity} id={messageId} message={error} />
    </div>
  );
}
