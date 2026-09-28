import type { Clock } from "../shared";
import {
  DEFAULT_UNIT_PREFERENCE,
  measureUnitsOf,
  type ClientUnitPreferences,
} from "../unit-preference";

import type { OnboardingSubmissionProblem } from "./client-onboarding";
import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingAnswersByForm } from "./onboarding-answers";
import type { OnboardingClient, OnboardingClients } from "./onboarding-clients";
import { OnboardingReview } from "./onboarding-review";
import type { OnboardingReviewStamps } from "./onboarding-review-stamps";
import type { OnboardingReviews } from "./onboarding-reviews";

type AnswerOnboardingDetailsCommand = {
  authSubjectId: string;
  answers: Partial<OnboardingAnswersByForm>;
};

type AnswerOnboardingDetailsResult =
  | { status: "answered" }
  | { status: "not-on-journey" }
  | { status: "no-open-request" }
  | { status: "invalid"; problems: OnboardingSubmissionProblem[] };

type AnswerOnboardingDetailsUseCaseOptions = {
  clients: OnboardingClients;
  onboardings: ClientOnboardingSource;
  reviews: OnboardingReviews;
  unitPreferences: ClientUnitPreferences;
  stamps: OnboardingReviewStamps;
  clock: Clock;
  incidents: ClientOnboardingIncidents;
};

export class AnswerOnboardingDetailsUseCase {
  constructor(
    private readonly options: AnswerOnboardingDetailsUseCaseOptions,
  ) {}

  async execute(
    command: AnswerOnboardingDetailsCommand,
  ): Promise<AnswerOnboardingDetailsResult> {
    const client = await this.options.clients.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return { status: "not-on-journey" };
    }

    const { clientId } = client;
    const [stored, reviewed, preference] = await Promise.all([
      this.options.onboardings.findByClientId(clientId),
      this.options.reviews.findByClientId(clientId),
      this.options.unitPreferences.findByClientId(clientId),
    ]);
    const review = OnboardingReview.reconstitute({
      client,
      submission: stored.submission,
      ...reviewed,
    });
    const now = this.options.clock.now();
    const outcome = review.answer({
      answers: command.answers,
      units: measureUnitsOf(preference ?? DEFAULT_UNIT_PREFERENCE),
      now,
    });

    if (outcome.status !== "answered") {
      await this.repairLaggingStamps(client, review);
      this.options.incidents.onboardingDetailsRefused({
        clientId,
        reason: outcome.status,
      });

      return outcome;
    }

    await this.options.reviews.recordAnswer({
      clientId,
      requestId: outcome.request.id,
      mergedAnswers: outcome.mergedAnswers,
      answeredAt: now,
    });
    await this.options.stamps.record({
      clientId,
      stamps: outcome.review.stamps(),
    });
    this.options.incidents.onboardingDetailsAnswered({
      clientId,
      questionCount: outcome.request.questionIds.length,
    });

    return { status: "answered" };
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
