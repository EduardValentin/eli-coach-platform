import type { VisitorGender } from "../assessment-call";
import type { MeasureUnits } from "../unit-preference";

import type { OnboardingSubmissionProblem } from "./client-onboarding";
import { DetailRequest } from "./detail-request";
import {
  emptyAnswers,
  isFieldReachable,
  reachableFields,
  type OnboardingAnswersByForm,
  type OnboardingQuestionId,
} from "./onboarding-answers";
import type { OnboardingClient } from "./onboarding-clients";
import {
  formsForGender,
  type OnboardingField,
  type OnboardingFormDefinition,
  type OnboardingFormId,
} from "./onboarding-schema";
import {
  needsManualScreening,
  type OnboardingSubmission,
} from "./onboarding-submission";
import { fieldProblem } from "./onboarding-validation";

export type ReviewStamps = {
  reviewOpenedAt: Date | null;
  detailsRequestedAt: Date | null;
  detailsAnsweredAt: Date | null;
  answersApprovedAt: Date | null;
};

export type OnboardingReviewStage =
  "awaiting-review" | "in-review" | "needs-details" | "approved";

type DetailRequestRefusal = "empty-note" | "no-question" | "unknown-question";

type OpenReviewOutcome =
  | { status: "opened"; review: OnboardingReview }
  | { status: "already-open" }
  | { status: "not-submitted" }
  | { status: "approved" };

type RequestDetailsOutcome =
  | { status: "requested"; request: DetailRequest; review: OnboardingReview }
  | { status: "not-in-review" }
  | { status: "invalid"; reason: DetailRequestRefusal };

type ApproveAnswersOutcome =
  | { status: "approved"; review: OnboardingReview }
  | { status: "not-reviewable" };

type AnswerDetailsOutcome =
  | {
      status: "answered";
      request: DetailRequest;
      mergedAnswers: OnboardingAnswersByForm;
      review: OnboardingReview;
    }
  | { status: "no-open-request" }
  | { status: "invalid"; problems: OnboardingSubmissionProblem[] };

type OnboardingReviewProps = {
  client: Pick<OnboardingClient, "clientId" | "gender" | "dateOfBirth">;
  submission: OnboardingSubmission | null;
  openedAt: Date | null;
  approvedAt: Date | null;
  requests: readonly DetailRequest[];
};

type RequestDetailsInput = {
  id: string;
  questionIds: readonly OnboardingQuestionId[];
  note: string;
  now: Date;
};

type AnswerDetailsInput = {
  answers: Partial<OnboardingAnswersByForm>;
  units: MeasureUnits;
  now: Date;
};

const NOT_ASKED_MESSAGE = "This question was not asked.";

export function reviewStageOf(input: {
  submittedAt: Date | null;
  stamps: ReviewStamps;
}): OnboardingReviewStage | null {
  const { submittedAt, stamps } = input;

  if (!submittedAt) return null;
  if (stamps.answersApprovedAt) return "approved";
  if (
    stamps.detailsRequestedAt &&
    !(
      stamps.detailsAnsweredAt &&
      stamps.detailsAnsweredAt >= stamps.detailsRequestedAt
    )
  )
    return "needs-details";
  if (stamps.reviewOpenedAt) return "in-review";

  return "awaiting-review";
}

function sameMoment(left: Date | null, right: Date | null): boolean {
  return (left?.getTime() ?? null) === (right?.getTime() ?? null);
}

function uniqueQuestions(
  questionIds: readonly OnboardingQuestionId[],
): OnboardingQuestionId[] {
  return questionIds.filter(
    (question, index) =>
      questionIds.findIndex(
        (other) =>
          other.formId === question.formId &&
          other.fieldId === question.fieldId,
      ) === index,
  );
}

export class OnboardingReview {
  readonly clientId: string;
  readonly gender: VisitorGender;
  readonly dateOfBirth: string;
  readonly submission: OnboardingSubmission | null;
  readonly openedAt: Date | null;
  readonly approvedAt: Date | null;
  readonly requests: readonly DetailRequest[];

  private constructor(props: OnboardingReviewProps) {
    this.clientId = props.client.clientId;
    this.gender = props.client.gender;
    this.dateOfBirth = props.client.dateOfBirth;
    this.submission = props.submission;
    this.openedAt = props.openedAt;
    this.approvedAt = props.approvedAt;
    this.requests = props.requests;
  }

  static reconstitute(props: OnboardingReviewProps): OnboardingReview {
    return new OnboardingReview(props);
  }

  stage(): OnboardingReviewStage | null {
    return reviewStageOf({
      submittedAt: this.submission?.submittedAt ?? null,
      stamps: this.stamps(),
    });
  }

  stamps(): ReviewStamps {
    const latest = this.latestRequest();

    return {
      reviewOpenedAt: this.openedAt,
      detailsRequestedAt: latest?.askedAt ?? null,
      detailsAnsweredAt: latest?.answeredAt ?? null,
      answersApprovedAt: this.approvedAt,
    };
  }

  matchesStamps(projected: ReviewStamps): boolean {
    const own = this.stamps();

    return (
      sameMoment(own.reviewOpenedAt, projected.reviewOpenedAt) &&
      sameMoment(own.detailsRequestedAt, projected.detailsRequestedAt) &&
      sameMoment(own.detailsAnsweredAt, projected.detailsAnsweredAt) &&
      sameMoment(own.answersApprovedAt, projected.answersApprovedAt)
    );
  }

  openRequest(): DetailRequest | null {
    const latest = this.latestRequest();

    return latest?.isOpen() ? latest : null;
  }

  reviewableForms(): OnboardingFormDefinition[] {
    const submittedAt = this.submission?.submittedAt;
    const screensManually =
      submittedAt !== undefined &&
      needsManualScreening(this.dateOfBirth, submittedAt);

    return formsForGender(this.gender).filter(
      (form) => !screensManually || form.id !== "safety-screening",
    );
  }

  open(now: Date): OpenReviewOutcome {
    if (!this.submission) return { status: "not-submitted" };
    if (this.approvedAt) return { status: "approved" };
    if (this.openedAt) return { status: "already-open" };

    return { status: "opened", review: this.with({ openedAt: now }) };
  }

  requestDetails(input: RequestDetailsInput): RequestDetailsOutcome {
    if (this.stage() !== "in-review") return { status: "not-in-review" };

    const note = input.note.trim();
    const questionIds = uniqueQuestions(input.questionIds);
    const refusal = this.detailRequestRefusal({ note, questionIds });
    if (refusal) return { status: "invalid", reason: refusal };

    const request = DetailRequest.raise({
      id: input.id,
      clientId: this.clientId,
      questionIds,
      note,
      askedAt: input.now,
    });

    return {
      status: "requested",
      request,
      review: this.with({ requests: [...this.requests, request] }),
    };
  }

  approve(now: Date): ApproveAnswersOutcome {
    const stage = this.stage();
    if (stage !== "awaiting-review" && stage !== "in-review")
      return { status: "not-reviewable" };

    return {
      status: "approved",
      review: this.with({ openedAt: this.openedAt ?? now, approvedAt: now }),
    };
  }

  answer(input: AnswerDetailsInput): AnswerDetailsOutcome {
    const request = this.openRequest();
    if (!request || !this.submission) return { status: "no-open-request" };

    const unasked = this.unaskedProblems(request, input.answers);
    if (unasked.length > 0) return { status: "invalid", problems: unasked };

    const mergedAnswers = this.askedAnswersFrom(request, input.answers);
    const answers = this.overlay(mergedAnswers, request);
    const problems = this.askedProblems({
      request,
      answers,
      units: input.units,
      today: input.now,
    });
    if (problems.length > 0) return { status: "invalid", problems };

    const answered = request.answer(input.now);

    return {
      status: "answered",
      request: answered,
      mergedAnswers,
      review: this.with({
        submission: { ...this.submission, answers },
        requests: this.requests.map((existing) =>
          existing.id === answered.id ? answered : existing,
        ),
      }),
    };
  }

  private latestRequest(): DetailRequest | null {
    return this.requests.reduce<DetailRequest | null>(
      (latest, candidate) =>
        !latest || candidate.askedAt > latest.askedAt ? candidate : latest,
      null,
    );
  }

  private with(changes: Partial<OnboardingReviewProps>): OnboardingReview {
    return new OnboardingReview({
      client: this,
      submission: this.submission,
      openedAt: this.openedAt,
      approvedAt: this.approvedAt,
      requests: this.requests,
      ...changes,
    });
  }

  private detailRequestRefusal(request: {
    note: string;
    questionIds: readonly OnboardingQuestionId[];
  }): DetailRequestRefusal | null {
    if (request.note.length === 0) return "empty-note";
    if (request.questionIds.length === 0) return "no-question";

    const known = request.questionIds.every((question) =>
      this.isReviewableQuestion(question),
    );

    return known ? null : "unknown-question";
  }

  private isReviewableQuestion(question: OnboardingQuestionId): boolean {
    const form = this.reviewableForms().find(
      (candidate) => candidate.id === question.formId,
    );
    if (!form || !this.submission) return false;

    return reachableFields(form.fields, this.submission.answers[form.id]).some(
      (field) => field.id === question.fieldId,
    );
  }

  private unaskedProblems(
    request: DetailRequest,
    answers: Partial<OnboardingAnswersByForm>,
  ): OnboardingSubmissionProblem[] {
    return Object.entries(answers).flatMap(([formId, formAnswers]) =>
      Object.keys(formAnswers ?? {})
        .filter(
          (fieldId) =>
            !request.asks({ formId: formId as OnboardingFormId, fieldId }),
        )
        .map((fieldId) => ({
          formId: formId as OnboardingFormId,
          fieldId,
          message: NOT_ASKED_MESSAGE,
        })),
    );
  }

  private askedAnswersFrom(
    request: DetailRequest,
    answers: Partial<OnboardingAnswersByForm>,
  ): OnboardingAnswersByForm {
    const asked = emptyAnswers();

    for (const { formId, fieldId } of request.questionIds) {
      asked[formId][fieldId] = answers[formId]?.[fieldId] ?? null;
    }

    return asked;
  }

  private overlay(
    askedAnswers: OnboardingAnswersByForm,
    request: DetailRequest,
  ): OnboardingAnswersByForm {
    const current = this.submission?.answers ?? emptyAnswers();
    const answers = { ...current };

    for (const formId of new Set(request.questionIds.map((q) => q.formId))) {
      answers[formId] = { ...current[formId], ...askedAnswers[formId] };
    }

    return answers;
  }

  private askedProblems(input: {
    request: DetailRequest;
    answers: OnboardingAnswersByForm;
    units: MeasureUnits;
    today: Date;
  }): OnboardingSubmissionProblem[] {
    const options = { units: input.units, today: input.today };

    return input.request.questionIds.flatMap(({ formId, fieldId }) => {
      const field = this.fieldOf({ formId, fieldId });
      const formAnswers = input.answers[formId];
      if (!field || !isFieldReachable(field, formAnswers)) return [];

      const message = fieldProblem(field, formAnswers, options);

      return message ? [{ formId, fieldId, message }] : [];
    });
  }

  private fieldOf(question: OnboardingQuestionId): OnboardingField | null {
    return (
      this.reviewableForms()
        .find((form) => form.id === question.formId)
        ?.fields.find((field) => field.id === question.fieldId) ?? null
    );
  }
}
