import { Link } from 'react-router';
import type { OnboardingConsents } from '../../../domain/journey';
import { CheckboxField } from '../../CheckboxField';

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
  return (
    <CheckboxField
      checkboxParity={`${PARITY_HOOKS[agreement]}-checkbox`}
      checked={checked}
      data-parity={PARITY_HOOKS[agreement]}
      error={problem ?? undefined}
      errorParity={`${PARITY_HOOKS[agreement]}-error`}
      errorRole="alert"
      frame="inset"
      label={statement}
      layout="statement"
      onCheckedChange={onChange}
      required
    >
      {agreement === 'specialCategory' && (
        <Link
          className="mt-1 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          data-parity="consent-link"
          to="/privacy"
        >
          {PRIVACY_LINK_LABEL}
        </Link>
      )}
    </CheckboxField>
  );
}
