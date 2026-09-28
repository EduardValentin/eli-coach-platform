import type { Clock } from "../shared";

import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { DetailRequest } from "./detail-request";
import type { OnboardingQuestionId } from "./onboarding-answers";
import type { OnboardingClient, OnboardingClients } from "./onboarding-clients";
import type { OnboardingDetailsNotifications } from "./onboarding-details-notifications";
import { OnboardingReview } from "./onboarding-review";
import type { OnboardingReviewStamps } from "./onboarding-review-stamps";
import type {
  DetailRequestIdGenerator,
  OnboardingReviews,
} from "./onboarding-reviews";

type RequestOnboardingDetailsCommand = {
  clientId: string;
  questionIds: readonly OnboardingQuestionId[];
  note: string;
};

type RequestOnboardingDetailsResult =
  | { status: "requested" }
  | { status: "not-found" }
  | { status: "not-in-review" }
  | {
      status: "invalid";
      reason: "empty-note" | "no-question" | "unknown-question";
    };

type RequestOnboardingDetailsUseCaseOptions = {
  clients: OnboardingClients;
  onboardings: ClientOnboardingSource;
  reviews: OnboardingReviews;
  stamps: OnboardingReviewStamps;
  requestIds: DetailRequestIdGenerator;
  notifications: OnboardingDetailsNotifications;
  clock: Clock;
  incidents: ClientOnboardingIncidents;
};

export class RequestOnboardingDetailsUseCase {
  constructor(
    private readonly options: RequestOnboardingDetailsUseCaseOptions,
  ) {}

  async execute(
    command: RequestOnboardingDetailsCommand,
  ): Promise<RequestOnboardingDetailsResult> {
    const { clientId } = command;
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
    const outcome = review.requestDetails({
      id: this.options.requestIds.generate(),
      questionIds: command.questionIds,
      note: command.note,
      now: this.options.clock.now(),
    });

    if (outcome.status !== "requested") {
      await this.repairLaggingStamps(client, review);

      return outcome;
    }

    await this.options.reviews.recordRequest(outcome.request);
    await this.options.stamps.record({
      clientId,
      stamps: outcome.review.stamps(),
    });
    this.options.incidents.onboardingDetailsRequested({
      clientId,
      questionCount: outcome.request.questionIds.length,
    });
    await this.emailDetailsRequest(client, outcome.request);

    return { status: "requested" };
  }

  private async emailDetailsRequest(
    client: OnboardingClient,
    request: DetailRequest,
  ): Promise<void> {
    const delivery = await this.options.notifications
      .sendDetailsRequest({
        requestId: request.id,
        clientId: client.clientId,
        email: client.email,
        firstName: client.firstName,
      })
      .catch(() => "failed" as const);

    if (delivery === "failed") {
      this.options.incidents.onboardingDetailsRequestEmailFailed({
        clientId: client.clientId,
        requestId: request.id,
      });
    }
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
