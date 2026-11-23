import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/shared/design-system/primitives";
import type { Ref } from "react";

export type Option<Value extends string | number> = {
  value: Value;
  label: string;
};

type OptionSelectProps<Value extends string | number> = {
  options: readonly Option<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  id?: string;
  label?: string;
  labelledBy?: string;
  triggerRef?: Ref<HTMLButtonElement>;
};

export function OptionSelect<Value extends string | number>({
  options,
  value,
  onChange,
  id,
  label,
  labelledBy,
  triggerRef,
}: OptionSelectProps<Value>) {
  function choose(next: string) {
    const option = options.find(
      (candidate) => String(candidate.value) === next,
    );
    if (option) onChange(option.value);
  }

  return (
    <Select onValueChange={choose} value={String(value)}>
      <SelectTrigger
        aria-label={label}
        aria-labelledby={labelledBy}
        id={id}
        ref={triggerRef}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
