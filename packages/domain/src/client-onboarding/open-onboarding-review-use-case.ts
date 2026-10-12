import type { Clock } from "../shared";

import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingParticipants } from "./onboarding-participants";
import { OnboardingReview } from "./onboarding-review";
import type { OnboardingReviews } from "./onboarding-reviews";

type OpenOnboardingReviewResult =
  | { status: "opened" }
  | { status: "already-open" }
  | { status: "not-found" }
  | { status: "subscription-cancelled-or-ended" }
  | { status: "not-submitted" }
  | { status: "approved" };

type OpenOnboardingReviewUseCaseOptions = {
  participants: Pick<OnboardingParticipants, "byClientId">;
  onboardings: ClientOnboardingSource;
  reviews: OnboardingReviews;
  clock: Clock;
  incidents: ClientOnboardingIncidents;
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
      this.options.onboardings.findByClientId(clientId),
      this.options.reviews.findByClientId(clientId),
    ]);
    const review = OnboardingReview.reconstitute({
      client: identity,
      submission: stored.submission,
      ...reviewed,
    });
    const now = this.options.clock.now();
    const outcome = review.open(now);

    if (outcome.status !== "opened") {
      return outcome;
    }

    await this.options.reviews.recordOpened({
      clientId,
      at: now,
      stamps: outcome.review.stamps(),
    });
    this.options.incidents.onboardingReviewOpened({ clientId });

    return { status: "opened" };
  }
}
