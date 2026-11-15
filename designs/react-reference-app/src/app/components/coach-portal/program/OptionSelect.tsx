import type { Ref } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

export type Option<Value extends string | number> = { value: Value; label: string };

type OptionSelectProps<Value extends string | number> = {
  options: readonly Option<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  id?: string;
  label?: string;
  labelledBy?: string;
  triggerRef?: Ref<HTMLButtonElement>;
  disabled?: boolean;
  size?: 'sm' | 'md';
};

export function OptionSelect<Value extends string | number>({ options, value, onChange, id, label, labelledBy, triggerRef, disabled, size }: OptionSelectProps<Value>) {
  return (
    <Select
      value={String(value)}
      disabled={disabled}
      onValueChange={next => onChange(options.find(option => String(option.value) === next)!.value)}
    >
      <SelectTrigger ref={triggerRef} id={id} aria-label={label} aria-labelledby={labelledBy} size={size}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
