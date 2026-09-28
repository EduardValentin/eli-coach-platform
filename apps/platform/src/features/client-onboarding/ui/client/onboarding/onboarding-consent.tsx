import {
  Card,
  CheckboxField,
  FieldCaption,
  LabelSuffix,
} from "@eli-coach-platform/ui/primitives";
import { Link } from "react-router";

import {
  OPTIONAL_SUFFIX,
  PROGRESS_PHOTO_CONSENT_COPY,
} from "~/features/client-onboarding/contracts/onboarding-copy";

type ConsentAgreement = "specialCategory" | "disclaimer";

const PRIVACY_PATH = "/privacy";

const PRIVACY_LINK_LABEL = "How I handle your data →";

const PARITY_HOOKS: Record<ConsentAgreement, string> = {
  specialCategory: "consent",
  disclaimer: "disclaimer",
};

const PROGRESS_PHOTOS_HEADING = "Progress photos";

type OnboardingConsentProps = {
  agreement: ConsentAgreement;
  checked: boolean;
  onChange: (checked: boolean) => void;
  problem: string | null;
  statement: string;
};

type ProgressPhotoConsentProps = {
  consented: boolean;
  onConsentChange: (consented: boolean) => void;
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
      checked={checked}
      data-parity={PARITY_HOOKS[agreement]}
      error={problem ?? undefined}
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

export function ProgressPhotoConsent({
  consented,
  onConsentChange,
}: ProgressPhotoConsentProps) {
  return (
    <Card className="grid gap-4" variant="inset">
      <FieldCaption>
        {PROGRESS_PHOTOS_HEADING} <LabelSuffix>{OPTIONAL_SUFFIX}</LabelSuffix>
      </FieldCaption>
      <CheckboxField
        checked={consented}
        label={PROGRESS_PHOTO_CONSENT_COPY}
        layout="statement"
        onCheckedChange={onConsentChange}
      />
    </Card>
  );
}
