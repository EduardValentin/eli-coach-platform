import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingQuestionId } from "./onboarding-answers";
import type { OnboardingClient, OnboardingClients } from "./onboarding-clients";
import { OnboardingReview } from "./onboarding-review";
import type { OnboardingReviewStamps } from "./onboarding-review-stamps";
import type { OnboardingReviews } from "./onboarding-reviews";

type OpenDetailRequestReading = {
  requestId: string;
  note: string;
  fields: readonly OnboardingQuestionId[];
};

type ReadOpenDetailRequestUseCaseOptions = {
  clients: OnboardingClients;
  onboardings: ClientOnboardingSource;
  reviews: OnboardingReviews;
  stamps: OnboardingReviewStamps;
  incidents: ClientOnboardingIncidents;
};

export class ReadOpenDetailRequestUseCase {
  constructor(private readonly options: ReadOpenDetailRequestUseCaseOptions) {}

  async execute(
    authSubjectId: string,
  ): Promise<OpenDetailRequestReading | null> {
    const client =
      await this.options.clients.findByAuthSubjectId(authSubjectId);

    if (!client) {
      return null;
    }

    const [stored, reviewed] = await Promise.all([
      this.options.onboardings.findByClientId(client.clientId),
      this.options.reviews.findByClientId(client.clientId),
    ]);
    const review = OnboardingReview.reconstitute({
      client,
      submission: stored.submission,
      ...reviewed,
    });

    await this.repairLaggingStamps(client, review);

    const request = review.openRequest();

    return request
      ? {
          requestId: request.id,
          note: request.note,
          fields: request.questionIds,
        }
      : null;
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
