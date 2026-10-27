import type { OnboardingDraft } from "./onboarding-draft";
import type { OnboardingSubmission } from "./onboarding-submission";

type StoredClientOnboarding = {
  draft: OnboardingDraft | null;
  submission: OnboardingSubmission | null;
};

export interface ClientOnboardingSource {
  findByClientId(clientId: string): Promise<StoredClientOnboarding>;
}
