import type { OnboardingReviewsPort } from "../client-onboarding";
import type { ClientProfilesPort } from "../client-profile";

import { ClientCoaching } from "./client-coaching";

type ReadClientCoachingUseCaseOptions = {
  onboardingReviewsPort: Pick<OnboardingReviewsPort, "findByClientId">;
  clientProfilesPort: Pick<ClientProfilesPort, "findByClientId">;
};

export class ReadClientCoachingUseCase {
  constructor(private readonly options: ReadClientCoachingUseCaseOptions) {}

  async execute(clientId: string): Promise<ClientCoaching> {
    const [review, profile] = await Promise.all([
      this.options.onboardingReviewsPort.findByClientId(clientId),
      this.options.clientProfilesPort.findByClientId(clientId),
    ]);

    return ClientCoaching.of({
      clientId,
      answersApprovedAt: review.approvedAt,
      profile,
    });
  }
}
