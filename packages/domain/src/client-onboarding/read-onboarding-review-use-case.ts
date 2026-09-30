import {
  earliestMeasurementOf,
  type ClientMeasurementsSource,
  type MeasurementEntry,
} from "../measurement";

import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { DetailRequestSnapshot } from "./detail-request";
import {
  answeredOfTotal,
  reachableFields,
  type OnboardingAnswersByForm,
  type OnboardingQuestionId,
} from "./onboarding-answers";
import type { OnboardingClient, OnboardingClients } from "./onboarding-clients";
import {
  OnboardingReview,
  type OnboardingReviewStage,
} from "./onboarding-review";
import type { OnboardingReviewStamps } from "./onboarding-review-stamps";
import type { OnboardingReviews } from "./onboarding-reviews";
import type { OnboardingFormId } from "./onboarding-schema";
import {
  cycleModeOf,
  flaggedAnswerIds,
  isPregnancyFlagged,
  screeningOutcome,
  withholdsNutritionAdvice,
  type CycleMode,
  type OnboardingSubmission,
  type ScreeningOutcome,
} from "./onboarding-submission";

type ReviewedForm = {
  formId: OnboardingFormId;
  fieldIds: string[];
  answered: number;
  total: number;
};

type SubmittedOnboardingReview = {
  status: "submitted";
  stage: OnboardingReviewStage;
  submission: OnboardingSubmission;
  screening: { outcome: ScreeningOutcome; yesCount: number };
  withholdsNutritionAdvice: boolean;
  pregnancyContext: boolean;
  cycleMode: CycleMode | null;
  flaggedQuestions: OnboardingQuestionId[];
  forms: ReviewedForm[];
  openRequest: DetailRequestSnapshot | null;
  requests: DetailRequestSnapshot[];
  submittedMeasurement: MeasurementEntry | null;
  statedHeightCm: number | null;
};

type ReadOnboardingReviewResult =
  | SubmittedOnboardingReview
  | { status: "not-submitted" }
  | { status: "not-found" };

type ReadOnboardingReviewUseCaseOptions = {
  clients: OnboardingClients;
  onboardings: ClientOnboardingSource;
  reviews: OnboardingReviews;
  measurements: ClientMeasurementsSource;
  stamps: OnboardingReviewStamps;
  incidents: ClientOnboardingIncidents;
};

function statedHeightCm(answers: OnboardingAnswersByForm): number | null {
  const height = answers["goal-availability"].height;

  return typeof height === "number" ? height : null;
}

function reviewedForms(review: OnboardingReview): ReviewedForm[] {
  const answers = review.submission?.answers;
  if (!answers) return [];

  return review.reviewableForms().map((form) => ({
    formId: form.id,
    fieldIds: reachableFields(form.fields, answers[form.id]).map(
      (field) => field.id,
    ),
    ...answeredOfTotal(form.fields, answers[form.id]),
  }));
}

function cycleModeFor(
  review: OnboardingReview,
  submission: OnboardingSubmission,
): CycleMode | null {
  const asksCycle = review
    .reviewableForms()
    .some((form) => form.id === "cycle-context");

  return asksCycle ? cycleModeOf(submission.answers) : null;
}

export class ReadOnboardingReviewUseCase {
  constructor(private readonly options: ReadOnboardingReviewUseCaseOptions) {}

  async execute(clientId: string): Promise<ReadOnboardingReviewResult> {
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
    await this.repairLaggingStamps(client, review);

    const { submission } = review;
    const stage = review.stage();

    if (!submission || !stage) {
      return { status: "not-submitted" };
    }

    const { answers } = submission;
    const flaggedQuestions = flaggedAnswerIds(answers);

    return {
      status: "submitted",
      stage,
      submission,
      screening: {
        outcome: screeningOutcome({
          answers,
          dateOfBirth: client.dateOfBirth,
          now: submission.submittedAt,
        }),
        yesCount: flaggedQuestions.filter(
          (question) => question.formId === "safety-screening",
        ).length,
      },
      withholdsNutritionAdvice: withholdsNutritionAdvice(answers),
      pregnancyContext: isPregnancyFlagged(answers),
      cycleMode: cycleModeFor(review, submission),
      flaggedQuestions,
      forms: reviewedForms(review),
      openRequest: review.openRequest()?.toSnapshot() ?? null,
      requests: review.requests.map((request) => request.toSnapshot()),
      submittedMeasurement: earliestMeasurementOf(
        await this.options.measurements.listByClientId(clientId),
      ),
      statedHeightCm: statedHeightCm(answers),
    };
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
