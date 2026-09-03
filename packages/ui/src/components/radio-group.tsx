import * as React from "react";

import { cn } from "../lib/cn";

export type RadioOption<TValue extends string> = {
  label: string;
  value: TValue;
};

export type RadioGroupProps<TValue extends string> = {
  className?: string;
  hint?: React.ReactNode;
  legend: string;
  name: string;
  onChange: (value: TValue) => void;
  options: readonly RadioOption<TValue>[];
  value: TValue;
};

/**
 * A `fieldset` rather than a bare row of inputs: the legend is what names the
 * group for a screen reader, so without it each option is announced with no
 * indication of what is being chosen.
 */
export function RadioGroup<TValue extends string>({
  className,
  hint,
  legend,
  name,
  onChange,
  options,
  value,
}: RadioGroupProps<TValue>) {
  return (
    <fieldset className={cn("flex flex-col gap-1.5", className)}>
      <legend className="text-label font-semibold uppercase text-text-muted">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2 py-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="inline-flex items-center gap-2 text-body-sm text-text-primary"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="accent-brand-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint && <p className="text-label text-text-muted">{hint}</p>}
    </fieldset>
  );
}
