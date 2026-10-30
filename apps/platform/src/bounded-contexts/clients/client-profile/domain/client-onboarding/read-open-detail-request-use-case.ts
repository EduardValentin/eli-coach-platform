import type { ClientOnboardingIncidentsPort } from "./client-onboarding-incidents-port";
import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import type { OnboardingQuestionId } from "./onboarding-answers";
import type { OnboardingClient } from "./onboarding-clients-port";
import type { OnboardingParticipants } from "./onboarding-participants";
import { OnboardingReview } from "./onboarding-review";
import type { OnboardingReviewStampsPort } from "./onboarding-review-stamps-port";
import type { OnboardingReviewsPort } from "./onboarding-reviews-port";

type OpenDetailRequestReading = {
  requestId: string;
  note: string;
  fields: readonly OnboardingQuestionId[];
};

type ReadOpenDetailRequestUseCaseOptions = {
  participants: Pick<OnboardingParticipants, "byAuthSubjectId">;
  clientOnboardingSourcePort: ClientOnboardingSourcePort;
  onboardingReviewsPort: OnboardingReviewsPort;
  onboardingReviewStampsPort: OnboardingReviewStampsPort;
  clientOnboardingIncidentsPort: ClientOnboardingIncidentsPort;
};

export class ReadOpenDetailRequestUseCase {
  constructor(private readonly options: ReadOpenDetailRequestUseCaseOptions) {}

  async execute(
    authSubjectId: string,
  ): Promise<OpenDetailRequestReading | null> {
    const participant =
      await this.options.participants.byAuthSubjectId(authSubjectId);

    if (!participant) {
      return null;
    }

    const { client, identity } = participant;

    const [stored, reviewed] = await Promise.all([
      this.options.clientOnboardingSourcePort.findByClientId(client.clientId),
      this.options.onboardingReviewsPort.findByClientId(client.clientId),
    ]);
    const review = OnboardingReview.reconstitute({
      client: identity,
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

    await this.options.onboardingReviewStampsPort.record({
      clientId: client.clientId,
      stamps: review.stamps(),
    });
    this.options.clientOnboardingIncidentsPort.onboardingReviewStampsRepaired({
      clientId: client.clientId,
    });
  }
}
