import type { OnboardingSubmissionStampsPort } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { OnboardingSubmissionRecorderPort } from "~/bounded-contexts/clients/clients/public";

export class ClientsSubmissionStampsAdapter implements OnboardingSubmissionStampsPort {
  constructor(private readonly recorder: OnboardingSubmissionRecorderPort) {}

  recordOnboardingSubmitted(stamp: {
    clientId: string;
    at: Date;
  }): Promise<void> {
    return this.recorder.recordOnboardingSubmitted(stamp);
  }
}
