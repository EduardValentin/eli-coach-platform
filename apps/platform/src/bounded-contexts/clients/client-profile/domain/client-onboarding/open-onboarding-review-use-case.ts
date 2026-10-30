import type { ClockPort } from "../clock-port";

import type { ClientOnboardingIncidentsPort } from "./client-onboarding-incidents-port";
import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import type { OnboardingParticipants } from "./onboarding-participants";
import { OnboardingReview } from "./onboarding-review";
import type { OnboardingReviewsPort } from "./onboarding-reviews-port";

type OpenOnboardingReviewResult =
  | { status: "opened" }
  | { status: "already-open" }
  | { status: "not-found" }
  | { status: "subscription-cancelled-or-ended" }
  | { status: "not-submitted" }
  | { status: "approved" };

type OpenOnboardingReviewUseCaseOptions = {
  participants: Pick<OnboardingParticipants, "byClientId">;
  clientOnboardingSourcePort: ClientOnboardingSourcePort;
  onboardingReviewsPort: OnboardingReviewsPort;
  clockPort: ClockPort;
  clientOnboardingIncidentsPort: ClientOnboardingIncidentsPort;
};

export class OpenOnboardingReviewUseCase {
  constructor(private readonly options: OpenOnboardingReviewUseCaseOptions) {}

  async execute(clientId: string): Promise<OpenOnboardingReviewResult> {
    const participant = await this.options.participants.byClientId(clientId);

    if (!participant) {
      return { status: "not-found" };
    }

    const { client, identity } = participant;

    if (client.standing.isCancelledOrEnded()) {
      return { status: "subscription-cancelled-or-ended" };
    }

    const [stored, reviewed] = await Promise.all([
      this.options.clientOnboardingSourcePort.findByClientId(clientId),
      this.options.onboardingReviewsPort.findByClientId(clientId),
    ]);
    const review = OnboardingReview.reconstitute({
      client: identity,
      submission: stored.submission,
      ...reviewed,
    });
    const now = this.options.clockPort.now();
    const outcome = review.open(now);

    if (outcome.status !== "opened") {
      return outcome;
    }

    await this.options.onboardingReviewsPort.recordOpened({
      clientId,
      at: now,
      stamps: outcome.review.stamps(),
    });
    this.options.clientOnboardingIncidentsPort.onboardingReviewOpened({
      clientId,
    });

    return { status: "opened" };
  }
}
