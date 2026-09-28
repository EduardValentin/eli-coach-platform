import { useId } from 'react';
import { Link } from 'react-router';
import type { OnboardingConsents } from '../../../domain/journey';
import { Checkbox } from '../../ui/checkbox';

const PRIVACY_LINK_LABEL = 'How I handle your data →';

export type ConsentAgreement = Extract<
  keyof OnboardingConsents,
  'specialCategory' | 'disclaimer'
>;

const PARITY_HOOKS: Record<ConsentAgreement, string> = {
  specialCategory: 'consent',
  disclaimer: 'disclaimer',
};

type OnboardingConsentProps = {
  agreement: ConsentAgreement;
  statement: string;
  checked: boolean;
  problem: string | null;
  onChange: (checked: boolean) => void;
};

export function OnboardingConsent({
  agreement,
  statement,
  checked,
  problem,
  onChange,
}: OnboardingConsentProps) {
  const checkboxId = useId();
  const errorId = useId();

  return (
    <div className="grid gap-2" data-parity={PARITY_HOOKS[agreement]}>
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

      {agreement === 'specialCategory' && (
        <Link
          className="mt-1 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          data-parity="consent-link"
          to="/privacy"
        >
          {PRIVACY_LINK_LABEL}
        </Link>
      )}

      {problem && (
        <p className="text-sm text-destructive" id={errorId} role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
