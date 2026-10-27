import type {
  OnboardingReviewStamps,
  ReviewStamps,
} from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { ReviewStampRecorder } from "~/bounded-contexts/clients/clients/public";

export class ClientsReviewStamps implements OnboardingReviewStamps {
  constructor(private readonly recorder: ReviewStampRecorder) {}

  record(input: { clientId: string; stamps: ReviewStamps }): Promise<void> {
    return this.recorder.recordReviewStamp(input);
  }
}
