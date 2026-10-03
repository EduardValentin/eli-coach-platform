import type { Clock } from "../shared";

import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingClients } from "./onboarding-clients";
import { OnboardingReview } from "./onboarding-review";
import type { OnboardingReviews } from "./onboarding-reviews";

type ApproveOnboardingAnswersResult =
  | { status: "approved" }
  | { status: "not-found" }
  | { status: "coaching-closed" }
  | { status: "not-reviewable" };

type ApproveOnboardingAnswersUseCaseOptions = {
  clients: OnboardingClients;
  onboardings: ClientOnboardingSource;
  reviews: OnboardingReviews;
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

    if (client.coachingClosed) {
      return { status: "coaching-closed" };
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
      return outcome;
    }

    await this.options.reviews.recordApproval({
      clientId,
      at: now,
      stamps: outcome.review.stamps(),
    });
    this.options.incidents.onboardingAnswersApproved({ clientId });

    return { status: "approved" };
  }
}
