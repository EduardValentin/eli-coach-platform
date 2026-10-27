import type { OnboardingFormId } from "./onboarding-schema";
import type { ScreeningOutcome } from "./onboarding-submission";

type OnboardingSubmissionRefusal =
  "already-submitted" | "consent-missing" | "invalid";

type OnboardingDetailsRefusal = "no-open-request" | "invalid";

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

type OnboardingReviewIncident = {
  clientId: string;
};

type OnboardingDetailsIncident = {
  clientId: string;
  questionCount: number;
};

type OnboardingDetailsEmailIncident = {
  clientId: string;
  requestId: string;
};

type OnboardingDetailsRefusedIncident = {
  clientId: string;
  reason: OnboardingDetailsRefusal;
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
  onboardingReviewOpened(incident: OnboardingReviewIncident): void;
  onboardingDetailsRequested(incident: OnboardingDetailsIncident): void;
  onboardingDetailsRequestEmailFailed(
    incident: OnboardingDetailsEmailIncident,
  ): void;
  onboardingDetailsAnswered(incident: OnboardingDetailsIncident): void;
  onboardingDetailsRefused(incident: OnboardingDetailsRefusedIncident): void;
  onboardingAnswersApproved(incident: OnboardingReviewIncident): void;
  onboardingReviewStampsRepaired(incident: OnboardingReviewIncident): void;
}
