import type { ClockPort } from "../clock-port";
import type {
  OnboardingParticipants,
  OnboardingReviewsPort,
} from "../client-onboarding";
import type { ClientProfilesPort } from "../client-profile";

import { ClientCoaching } from "./client-coaching";

type ReadClientCoachingUseCaseOptions = {
  clockPort: ClockPort;
  participants: OnboardingParticipants;
  onboardingReviewsPort: Pick<OnboardingReviewsPort, "findByClientId">;
  clientProfilesPort: Pick<ClientProfilesPort, "findByClientId">;
};

export class ReadClientCoachingUseCase {
  constructor(private readonly options: ReadClientCoachingUseCaseOptions) {}

  async execute(clientId: string): Promise<ClientCoaching | null> {
    const participant = await this.options.participants.byClientId(clientId);

    if (!participant) {
      return null;
    }

    const [review, profile] = await Promise.all([
      this.options.onboardingReviewsPort.findByClientId(clientId),
      this.options.clientProfilesPort.findByClientId(clientId),
    ]);

    return ClientCoaching.of({
      ...participant,
      answersApprovedAt: review.approvedAt,
      profile,
      now: this.options.clockPort.now(),
    });
  }
}
