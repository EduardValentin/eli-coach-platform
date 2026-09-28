import { cn } from "@eli-coach-platform/ui/lib";
import { Checkbox } from "@eli-coach-platform/ui/primitives";
import { useId } from "react";
import { Link } from "react-router";

import { PROGRESS_PHOTO_CONSENT_COPY } from "~/features/client-onboarding/contracts/onboarding-copy";

import { ONBOARDING_AGREEMENT_BOX_CLASS } from "./onboarding-card";

export type ConsentAgreement = "specialCategory" | "disclaimer";

const PRIVACY_PATH = "/privacy";

const PRIVACY_LINK_LABEL = "How I handle your data →";

const PARITY_HOOKS: Record<ConsentAgreement, string> = {
  specialCategory: "consent",
  disclaimer: "disclaimer",
};

const PROGRESS_PHOTOS_HEADING = "Progress photos";

const OPTIONAL_SUFFIX = "(optional)";

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
  const checkboxId = useId();
  const errorId = useId();

  return (
    <div className="grid gap-2" data-parity={PARITY_HOOKS[agreement]}>
      <div
        className={cn("flex items-start gap-3", ONBOARDING_AGREEMENT_BOX_CLASS)}
      >
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

      {agreement === "specialCategory" && (
        <Link
          className="mt-1 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          data-parity="consent-link"
          to={PRIVACY_PATH}
        >
          {PRIVACY_LINK_LABEL}
        </Link>
      )}

      {problem && (
        <p className="text-sm text-feedback-danger" id={errorId} role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}

export function ProgressPhotoConsent({
  consented,
  onConsentChange,
}: ProgressPhotoConsentProps) {
  const checkboxId = useId();

  return (
    <div className={cn("grid gap-4", ONBOARDING_AGREEMENT_BOX_CLASS)}>
      <p className="text-sm font-medium text-text-label">
        {PROGRESS_PHOTOS_HEADING}{" "}
        <span className="font-normal text-text-secondary">
          {OPTIONAL_SUFFIX}
        </span>
      </p>

      <div className="flex items-start gap-3">
        <Checkbox
          checked={consented}
          className="mt-0.5"
          id={checkboxId}
          onCheckedChange={(next) => onConsentChange(next === true)}
        />
        <label
          className="text-sm leading-relaxed text-text-primary"
          htmlFor={checkboxId}
        >
          {PROGRESS_PHOTO_CONSENT_COPY}
        </label>
      </div>
    </div>
  );
}
