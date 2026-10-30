import type { ClientIdentity } from "../client-identities-port";
import type { ClockPort } from "../clock-port";

import type { ClientOnboardingIncidentsPort } from "./client-onboarding-incidents-port";
import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import type { DetailRequest } from "./detail-request";
import type { OnboardingQuestionId } from "./onboarding-answers";
import type { OnboardingDetailsNotificationsPort } from "./onboarding-details-notifications-port";
import type { OnboardingParticipants } from "./onboarding-participants";
import {
  OnboardingReview,
  type DetailRequestRefusal,
} from "./onboarding-review";
import type { OnboardingReviewsPort } from "./onboarding-reviews-port";
import type { DetailRequestIdsPort } from "./detail-request-ids-port";

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
  participants: Pick<OnboardingParticipants, "byClientId">;
  clientOnboardingSourcePort: ClientOnboardingSourcePort;
  onboardingReviewsPort: OnboardingReviewsPort;
  detailRequestIdsPort: DetailRequestIdsPort;
  onboardingDetailsNotificationsPort: OnboardingDetailsNotificationsPort;
  clockPort: ClockPort;
  clientOnboardingIncidentsPort: ClientOnboardingIncidentsPort;
};

export class RequestOnboardingDetailsUseCase {
  constructor(
    private readonly options: RequestOnboardingDetailsUseCaseOptions,
  ) {}

  async execute(
    command: RequestOnboardingDetailsCommand,
  ): Promise<RequestOnboardingDetailsResult> {
    const { clientId } = command;
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
    const outcome = review.requestDetails({
      id: this.options.detailRequestIdsPort.generate(),
      questionIds: command.questionIds,
      note: command.note,
      now: this.options.clockPort.now(),
    });

    if (outcome.status !== "requested") {
      return outcome;
    }

    const recorded = await this.options.onboardingReviewsPort.recordRequest({
      request: outcome.request,
      stamps: outcome.review.stamps(),
    });

    if (recorded === "already-open") {
      return { status: "not-in-review" };
    }

    this.options.clientOnboardingIncidentsPort.onboardingDetailsRequested({
      clientId,
      questionCount: outcome.request.questionIds.length,
    });
    await this.emailDetailsRequest(identity, outcome.request);

    return { status: "requested" };
  }

  private async emailDetailsRequest(
    client: ClientIdentity,
    request: DetailRequest,
  ): Promise<void> {
    const delivery = await this.options.onboardingDetailsNotificationsPort
      .sendDetailsRequest({
        requestId: request.id,
        clientId: client.clientId,
        email: client.email,
        firstName: client.firstName,
      })
      .catch(() => "failed" as const);

    if (delivery === "failed") {
      this.options.clientOnboardingIncidentsPort.onboardingDetailsRequestEmailFailed(
        {
          clientId: client.clientId,
          requestId: request.id,
        },
      );
    }
  }
}
