import type { Clock } from "../shared";

import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingClient, OnboardingClients } from "./onboarding-clients";
import { OnboardingReview } from "./onboarding-review";
import type { OnboardingReviewStamps } from "./onboarding-review-stamps";
import type { OnboardingReviews } from "./onboarding-reviews";

type ApproveOnboardingAnswersResult =
  | { status: "approved" }
  | { status: "not-found" }
  | { status: "not-reviewable" };

type ApproveOnboardingAnswersUseCaseOptions = {
  clients: OnboardingClients;
  onboardings: ClientOnboardingSource;
  reviews: OnboardingReviews;
  stamps: OnboardingReviewStamps;
  clock: Clock;
  incidents: ClientOnboardingIncidents;
};

export class ApproveOnboardingAnswersUseCase {
  constructor(
    private readonly options: ApproveOnboardingAnswersUseCaseOptions,
  ) {}

  async execute(clientId: string): Promise<ApproveOnboardingAnswersResult> {
    const client = await this.options.clients.findByClientId(clientId);

    if (!client) {
      return { status: "not-found" };
    }

    const [stored, reviewed] = await Promise.all([
      this.options.onboardings.findByClientId(clientId),
      this.options.reviews.findByClientId(clientId),
    ]);
    const review = OnboardingReview.reconstitute({
      client,
      submission: stored.submission,
      ...reviewed,
    });
    const now = this.options.clock.now();
    const outcome = review.approve(now);

    if (outcome.status !== "approved") {
      await this.repairLaggingStamps(client, review);

      return outcome;
    }

    if (!review.openedAt) {
      await this.options.reviews.recordOpened({ clientId, at: now });
    }
    await this.options.reviews.recordApproval({ clientId, at: now });
    await this.options.stamps.record({
      clientId,
      stamps: outcome.review.stamps(),
    });
    this.options.incidents.onboardingAnswersApproved({ clientId });

    return { status: "approved" };
  }

  private async repairLaggingStamps(
    client: OnboardingClient,
    review: OnboardingReview,
  ): Promise<void> {
    if (review.matchesStamps(client.reviewStamps)) {
      return;
    }

    await this.options.stamps.record({
      clientId: client.clientId,
      stamps: review.stamps(),
    });
    this.options.incidents.onboardingReviewStampsRepaired({
      clientId: client.clientId,
    });
  }
}
