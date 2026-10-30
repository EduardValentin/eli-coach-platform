import type {
  OnboardingReviewStampsPort,
  ReviewStamps,
} from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { ReviewStampRecorderPort } from "~/bounded-contexts/clients/clients/public";

export class ClientsReviewStampsAdapter implements OnboardingReviewStampsPort {
  constructor(
    private readonly reviewStampRecorderPort: ReviewStampRecorderPort,
  ) {}

  record(input: { clientId: string; stamps: ReviewStamps }): Promise<void> {
    return this.reviewStampRecorderPort.recordReviewStamp(input);
  }
}
