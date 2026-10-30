import type { ClockPort } from "../clock-port";

import type { ClientOnboardingIncidentsPort } from "./client-onboarding-incidents-port";
import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import { coachingSeedOf } from "./onboarding-coaching-seed";
import type { OnboardingParticipants } from "./onboarding-participants";
import { OnboardingReview } from "./onboarding-review";
import type { OnboardingReviewsPort } from "./onboarding-reviews-port";

type ApproveOnboardingAnswersResult =
  | { status: "approved" }
  | { status: "not-found" }
  | { status: "subscription-cancelled-or-ended" }
  | { status: "not-reviewable" };

type ApproveOnboardingAnswersUseCaseOptions = {
  participants: Pick<OnboardingParticipants, "byClientId">;
  clientOnboardingSourcePort: ClientOnboardingSourcePort;
  onboardingReviewsPort: OnboardingReviewsPort;
  clockPort: ClockPort;
  clientOnboardingIncidentsPort: ClientOnboardingIncidentsPort;
};

export class ApproveOnboardingAnswersUseCase {
  constructor(
    private readonly options: ApproveOnboardingAnswersUseCaseOptions,
  ) {}

  async execute(clientId: string): Promise<ApproveOnboardingAnswersResult> {
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
    const outcome = review.approve(now);

    if (outcome.status !== "approved") {
      return outcome;
    }

    await this.options.onboardingReviewsPort.recordApproval({
      clientId,
      at: now,
      stamps: outcome.review.stamps(),
      seed: coachingSeedOf(outcome.submission.answers, identity.gender),
    });
    this.options.clientOnboardingIncidentsPort.onboardingAnswersApproved({
      clientId,
    });

    return { status: "approved" };
  }
}
