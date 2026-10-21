import { useId } from 'react';
import { cn } from '../../ui/utils';

type SegmentedChoiceProps<Value extends string> = {
  legend: string;
  options: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
  orientation?: 'row' | 'column';
};

export function SegmentedChoice<Value extends string>({ legend, options, value, onChange, orientation = 'row' }: SegmentedChoiceProps<Value>) {
  const name = useId();
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div
        className={cn('grid gap-0.5 rounded-field bg-surface-quiet p-0.5', {
          'auto-cols-fr grid-flow-col': orientation === 'row',
          'grid-cols-1': orientation === 'column',
        })}
      >
        {options.map(option => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center justify-center rounded-field px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary has-checked:bg-card has-checked:text-text-primary has-checked:shadow-card has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50 motion-reduce:transition-none"
          >
            <input type="radio" name={name} value={option.value} checked={option.value === value} onChange={() => onChange(option.value)} className="sr-only" />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
