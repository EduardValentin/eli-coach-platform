import * as React from "react";

import { cn } from "../lib/cn";
import { cardVariants } from "./card";
import { Checkbox } from "./checkbox";
import { FieldError } from "./field-error";

type CheckboxFieldLayout = "inline" | "statement";

type CheckboxFieldFrame = "none" | "inset";

type CheckboxFieldProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "onChange"
> & {
  checkboxRef?: React.Ref<HTMLButtonElement>;
  checked: boolean;
  error?: string;
  errorRole?: "alert";
  frame?: CheckboxFieldFrame;
  label: React.ReactNode;
  layout?: CheckboxFieldLayout;
  onCheckedChange: (checked: boolean) => void;
};

export const CheckboxField = React.forwardRef<
  HTMLDivElement,
  CheckboxFieldProps
>(
  (
    {
      checkboxRef,
      checked,
      children,
      className,
      error,
      errorRole,
      frame = "none",
      label,
      layout = "inline",
      onCheckedChange,
      ...props
    },
    ref,
  ) => {
    const checkboxId = React.useId();
    const errorId = React.useId();
    const isStatement = layout === "statement";
    const invalid = error !== undefined;

    return (
      <div className={cn("grid gap-2", className)} ref={ref} {...props}>
        <div
          className={cn("flex", {
            "items-start gap-3": isStatement,
            "items-center gap-2": !isStatement,
            [cardVariants({ variant: "inset" })]: frame === "inset",
          })}
        >
          <Checkbox
            aria-describedby={invalid ? errorId : undefined}
            aria-invalid={invalid}
            checked={checked}
            className={cn({ "mt-0.5": isStatement })}
            id={checkboxId}
            onCheckedChange={(next) => onCheckedChange(next === true)}
            ref={checkboxRef}
          />
          <label
            className={cn("text-sm text-text-primary", {
              "leading-relaxed": isStatement,
            })}
            htmlFor={checkboxId}
          >
            {label}
          </label>
        </div>
        {children}
        <FieldError id={errorId} message={error} role={errorRole} />
      </div>
    );
  },
);

CheckboxField.displayName = "CheckboxField";
