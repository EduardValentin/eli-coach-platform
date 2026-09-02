import { cn } from "../lib/cn";

export type SegmentedControlOption<Value extends string> = {
  label: string;
  value: Value;
};

export type SegmentedControlProps<Value extends string> = {
  className?: string;
  legend: string;
  name: string;
  onValueChange: (value: Value) => void;
  options: readonly SegmentedControlOption<Value>[];
  value: Value;
};

/** One choice among a few as equal-width segments. Native radios keep arrow-key movement and form semantics. */
export function SegmentedControl<Value extends string>(
  props: SegmentedControlProps<Value>,
) {
  const { className, legend, name, onValueChange, options, value } = props;

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-1.5 text-body-sm font-semibold text-text-primary">
        {legend}
      </legend>
      <div className="flex gap-2">
        {options.map((option) => {
          const isChecked = option.value === value;

          return (
            <label
              className={cn(
                "flex min-h-[var(--size-control-sm)] flex-1 cursor-pointer items-center justify-center rounded-md border px-3 text-body-sm font-medium transition-colors has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text-primary",
                {
                  "border-text-primary bg-text-primary text-text-inverted":
                    isChecked,
                  "border-border-subtle bg-surface-base text-text-secondary hover:bg-surface-subtle":
                    !isChecked,
                },
              )}
              key={option.value}
            >
              <input
                checked={isChecked}
                className="ui-sr-only"
                name={name}
                onChange={() => onValueChange(option.value)}
                type="radio"
                value={option.value}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
