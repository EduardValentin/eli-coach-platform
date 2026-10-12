import type { ClientIdentities } from "../client";
import type { Clock } from "../shared";

import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingClients } from "./onboarding-clients";
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
  clients: OnboardingClients;
  identities: Pick<ClientIdentities, "findByClientId">;
  onboardings: ClientOnboardingSource;
  reviews: OnboardingReviews;
  clock: Clock;
  incidents: ClientOnboardingIncidents;
};

export class OpenOnboardingReviewUseCase {
  constructor(private readonly options: OpenOnboardingReviewUseCaseOptions) {}

  async execute(clientId: string): Promise<OpenOnboardingReviewResult> {
    const client = await this.options.clients.findByClientId(clientId);
    const identity =
      client && (await this.options.identities.findByClientId(client.clientId));

    if (!client || !identity) {
      return { status: "not-found" };
    }

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
