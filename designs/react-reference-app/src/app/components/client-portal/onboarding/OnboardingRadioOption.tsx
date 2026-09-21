import { useId } from 'react';
import { RadioGroupItem } from '../../ui/radio-group';

export function OnboardingRadioOption({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={value} />
      <label htmlFor={id} className="text-sm text-text-primary">
        {label}
      </label>
    </div>
  );
}
