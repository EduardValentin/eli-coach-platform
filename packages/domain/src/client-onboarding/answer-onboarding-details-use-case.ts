import { ClientProfile } from "../client-profile";
import type { Clock } from "../shared";
import {
  measureUnitsOf,
  UnitPreference,
  type ClientUnitPreferencesSource,
} from "../unit-preference";

import type { OnboardingSubmissionProblem } from "./client-onboarding";
import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingAnswersByForm } from "./onboarding-answers";
import type { OnboardingParticipants } from "./onboarding-participants";
import { profileFactsOf } from "./onboarding-profile-facts";
import { OnboardingReview } from "./onboarding-review";
import type { OnboardingReviews } from "./onboarding-reviews";

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
  onboardings: ClientOnboardingSource;
  reviews: OnboardingReviews;
  unitPreferences: ClientUnitPreferencesSource;
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
    const participant = await this.options.participants.byAuthSubjectId(
      command.authSubjectId,
    );

    if (!participant) {
      return { status: "not-on-journey" };
    }

    const { client, identity } = participant;
    const now = this.options.clock.now();

    if (!client.standing.hasPortalAccessAt(now)) {
      return { status: "ended" };
    }

    const { clientId } = client;
    const [stored, reviewed, preference] = await Promise.all([
      this.options.onboardings.findByClientId(clientId),
      this.options.reviews.findByClientId(clientId),
      this.options.unitPreferences.findByClientId(clientId),
    ]);
    const review = OnboardingReview.reconstitute({
      client: identity,
      submission: stored.submission,
      ...reviewed,
    });
    const outcome = review.answer({
      answers: command.answers,
      units: measureUnitsOf(
        (preference ?? UnitPreference.metric()).toSnapshot(),
      ),
      now,
    });

    if (outcome.status !== "answered") {
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
      profile: ClientProfile.fromOnboarding({
        clientId,
        facts: profileFactsOf(outcome.submissionAnswers),
        progressPhotosConsentedAt:
          review.submission?.consents.progressPhotosAt ?? null,
        now,
      }),
      stamps: outcome.review.stamps(),
    });
    this.options.incidents.onboardingDetailsAnswered({
      clientId,
      questionCount: outcome.request.questionIds.length,
    });

    return { status: "answered" };
  }
}
