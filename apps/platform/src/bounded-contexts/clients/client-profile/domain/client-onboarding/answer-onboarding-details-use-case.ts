import type { ClockPort } from "../clock-port";
import {
  measureUnitsOf,
  UnitPreference,
  type ClientSettingsSourcePort,
} from "../client-settings";

import type { OnboardingSubmissionProblem } from "./client-onboarding";
import type { ClientOnboardingIncidentsPort } from "./client-onboarding-incidents-port";
import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import type { OnboardingAnswersByForm } from "./onboarding-answers";
import type { OnboardingParticipants } from "./onboarding-participants";
import { OnboardingReview } from "./onboarding-review";
import type { OnboardingReviewsPort } from "./onboarding-reviews-port";

type AnswerOnboardingDetailsCommand = {
  authSubjectId: string;
  answers: Partial<OnboardingAnswersByForm>;
};

type AnswerOnboardingDetailsResult =
  | { status: "answered" }
  | { status: "not-on-journey" }
  | { status: "ended" }
  | { status: "no-open-request" }
  | { status: "invalid"; problems: OnboardingSubmissionProblem[] };

type AnswerOnboardingDetailsUseCaseOptions = {
  participants: Pick<OnboardingParticipants, "byAuthSubjectId">;
  clientOnboardingSourcePort: ClientOnboardingSourcePort;
  onboardingReviewsPort: OnboardingReviewsPort;
  clientSettingsSourcePort: ClientSettingsSourcePort;
  clockPort: ClockPort;
  clientOnboardingIncidentsPort: ClientOnboardingIncidentsPort;
};

export class AnswerOnboardingDetailsUseCase {
  constructor(
    private readonly options: AnswerOnboardingDetailsUseCaseOptions,
  ) {}

  async execute(
    command: AnswerOnboardingDetailsCommand,
  ): Promise<AnswerOnboardingDetailsResult> {
    const participant = await this.options.participants.byAuthSubjectId(
      command.authSubjectId,
    );

    if (!participant) {
      return { status: "not-on-journey" };
    }

    const { client, identity } = participant;
    const now = this.options.clockPort.now();

    if (!client.standing.hasPortalAccessAt(now)) {
      return { status: "ended" };
    }

    const { clientId } = client;
    const [stored, reviewed, settings] = await Promise.all([
      this.options.clientOnboardingSourcePort.findByClientId(clientId),
      this.options.onboardingReviewsPort.findByClientId(clientId),
      this.options.clientSettingsSourcePort.findByClientId(clientId),
    ]);
    const review = OnboardingReview.reconstitute({
      client: identity,
      submission: stored.submission,
      ...reviewed,
    });
    const outcome = review.answer({
      answers: command.answers,
      units: measureUnitsOf(
        (settings?.unitPreference() ?? UnitPreference.metric()).toSnapshot(),
      ),
      now,
    });

    if (outcome.status !== "answered") {
      this.options.clientOnboardingIncidentsPort.onboardingDetailsRefused({
        clientId,
        reason: outcome.status,
      });

      return outcome;
    }

    await this.options.onboardingReviewsPort.recordAnswer({
      clientId,
      requestId: outcome.request.id,
      mergedAnswers: outcome.mergedAnswers,
      answeredAt: now,
      stamps: outcome.review.stamps(),
    });
    this.options.clientOnboardingIncidentsPort.onboardingDetailsAnswered({
      clientId,
      questionCount: outcome.request.questionIds.length,
    });

    return { status: "answered" };
  }
}
