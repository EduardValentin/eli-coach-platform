import { useId } from 'react';
import { Checkbox } from '../../ui/checkbox';

type OnboardingConsentProps = {
  statement: string;
  checked: boolean;
  problem: string | null;
  onChange: (checked: boolean) => void;
};

export function OnboardingConsent({
  statement,
  checked,
  problem,
  onChange,
}: OnboardingConsentProps) {
  const checkboxId = useId();
  const errorId = useId();

  return (
    <div className="grid gap-2">
      <div className="flex items-start gap-3 rounded-card border border-border-subtle bg-surface-quiet/60 p-4">
        <Checkbox
          aria-describedby={problem ? errorId : undefined}
          aria-invalid={problem !== null}
          checked={checked}
          className="mt-0.5"
          id={checkboxId}
          onCheckedChange={(next) => onChange(next === true)}
        />
        <label
          className="text-sm leading-relaxed text-text-primary"
          htmlFor={checkboxId}
        >
          {statement}
        </label>
      </div>

      {problem && (
        <p className="text-sm text-destructive" id={errorId} role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
