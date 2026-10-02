import { CheckboxField } from "@eli-coach-platform/ui/primitives";
import { Link } from "react-router";

type ConsentAgreement = "specialCategory" | "disclaimer";

const PRIVACY_PATH = "/privacy";

const PRIVACY_LINK_LABEL = "How I handle your data →";

const PARITY_HOOKS: Record<ConsentAgreement, string> = {
  specialCategory: "consent",
  disclaimer: "disclaimer",
};

type OnboardingConsentProps = {
  agreement: ConsentAgreement;
  checked: boolean;
  onChange: (checked: boolean) => void;
  problem: string | null;
  statement: string;
};

export function OnboardingConsent({
  agreement,
  checked,
  onChange,
  problem,
  statement,
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
    >
      {agreement === "specialCategory" && (
        <Link
          className="mt-1 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          data-parity="consent-link"
          to={PRIVACY_PATH}
        >
          {PRIVACY_LINK_LABEL}
        </Link>
      )}
    </CheckboxField>
  );
}
