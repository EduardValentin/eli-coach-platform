import type { OnboardingFormId } from "./onboarding-schema";
import type { ScreeningOutcome } from "./onboarding-submission";

type OnboardingSubmissionRefusal =
  "already-submitted" | "consent-missing" | "invalid";

type OnboardingDraftIncident = {
  clientId: string;
  formId: OnboardingFormId;
};

type OnboardingSubmissionAcceptedIncident = {
  clientId: string;
  screeningOutcome: ScreeningOutcome;
};

type OnboardingSubmissionRefusedIncident = {
  clientId: string;
  reason: OnboardingSubmissionRefusal;
};

export interface ClientOnboardingIncidents {
  onboardingDraftSaved(incident: OnboardingDraftIncident): void;
  onboardingDraftSaveFailed(incident: OnboardingDraftIncident): void;
  onboardingSubmissionAccepted(
    incident: OnboardingSubmissionAcceptedIncident,
  ): void;
  onboardingSubmissionRefused(
    incident: OnboardingSubmissionRefusedIncident,
  ): void;
}
