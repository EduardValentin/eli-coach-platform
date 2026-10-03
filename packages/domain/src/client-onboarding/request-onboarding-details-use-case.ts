import type { Clock } from "../shared";

import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { DetailRequest } from "./detail-request";
import type { OnboardingQuestionId } from "./onboarding-answers";
import type { OnboardingClient, OnboardingClients } from "./onboarding-clients";
import type { OnboardingDetailsNotifications } from "./onboarding-details-notifications";
import {
  OnboardingReview,
  type DetailRequestRefusal,
} from "./onboarding-review";
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
  | { status: "subscription-cancelled-or-ended" }
  | { status: "not-in-review" }
  | { status: "invalid"; reason: DetailRequestRefusal };

type RequestOnboardingDetailsUseCaseOptions = {
  clients: OnboardingClients;
  onboardings: ClientOnboardingSource;
  reviews: OnboardingReviews;
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

    if (client.subscriptionCancelledOrEnded) {
      return { status: "subscription-cancelled-or-ended" };
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
      return outcome;
    }

    const recorded = await this.options.reviews.recordRequest({
      request: outcome.request,
      stamps: outcome.review.stamps(),
    });

    if (recorded === "already-open") {
      return { status: "not-in-review" };
    }

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
}
