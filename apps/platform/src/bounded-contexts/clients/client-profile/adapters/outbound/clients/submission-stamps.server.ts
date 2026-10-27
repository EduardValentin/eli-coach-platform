import type { OnboardingSubmissionStamps } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { OnboardingSubmissionRecorder } from "~/bounded-contexts/clients/clients/public";

export class ClientsSubmissionStamps implements OnboardingSubmissionStamps {
  constructor(private readonly recorder: OnboardingSubmissionRecorder) {}

  recordOnboardingSubmitted(stamp: {
    clientId: string;
    at: Date;
  }): Promise<void> {
    return this.recorder.recordOnboardingSubmitted(stamp);
  }
}
