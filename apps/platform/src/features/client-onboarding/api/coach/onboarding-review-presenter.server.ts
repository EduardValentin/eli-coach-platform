import {
  ONBOARDING_FORMS,
  type OnboardingAnswer,
  type OnboardingField,
  type OnboardingFormAnswers,
  type OnboardingFormId,
  type ReadOnboardingReviewUseCase,
} from "@eli-coach-platform/domain/client-onboarding";
import type { MeasurementEntry } from "@eli-coach-platform/domain/measurement";

import {
  formatCanonicalMeasure,
  isMeasureKind,
} from "~/features/client-onboarding/contracts/canonical-measure";
import type {
  MeasurementRow,
  ReviewAnswer,
  ReviewForm,
  SubmittedReview,
} from "~/features/client-onboarding/contracts/onboarding-review";

type OnboardingReviewReading = Awaited<
  ReturnType<ReadOnboardingReviewUseCase["execute"]>
>;

type SubmittedReading = Extract<
  OnboardingReviewReading,
  { status: "submitted" }
>;

type ReviewedForm = SubmittedReading["forms"][number];

type QuestionId = SubmittedReading["flaggedQuestions"][number];

const QUESTION_LABEL_OVERRIDES: Record<string, string> = {
  goalWeight: "Target weight",
};

const CHECK_IN_DAY_FIELD_ID = "checkInDay";

const CHECK_IN_CHANNEL_FIELD_ID = "checkInChannel";

export function presentSubmittedReview(
  reading: SubmittedReading,
): SubmittedReview {
  const collaboration = reading.submission.answers["nutrition-lifestyle"];

  return {
    stage: reading.stage,
    screening: reading.screening,
    withholdsNutritionAdvice: reading.withholdsNutritionAdvice,
    pregnancyContext: reading.pregnancyContext,
    cycleMode: reading.cycleMode,
    checkInDay: answerText(collaboration[CHECK_IN_DAY_FIELD_ID]),
    checkInChannel: answerText(collaboration[CHECK_IN_CHANNEL_FIELD_ID]),
    forms: reading.forms.map((form) => presentForm(reading, form)),
    openRequest: reading.openRequest
      ? {
          note: reading.openRequest.note,
          askedAt: reading.openRequest.askedAt.toISOString(),
          questions: [...reading.openRequest.questionIds],
        }
      : null,
  };
}

export function presentMeasurements(
  measurements: readonly MeasurementEntry[],
): MeasurementRow[] {
  return measurements.map((entry) => ({
    recordedAt: entry.recordedAt.toISOString(),
    weightKg: entry.weightKg,
    waistCm: entry.waistCm,
    hipsCm: entry.hipsCm ?? null,
    thighCm: entry.thighCm ?? null,
    armCm: entry.armCm ?? null,
  }));
}

function humaniseFieldId(fieldId: string): string {
  const override = QUESTION_LABEL_OVERRIDES[fieldId];
  if (override) return override;

  const spaced = fieldId
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function presentForm(
  reading: SubmittedReading,
  form: ReviewedForm,
): ReviewForm {
  const definition = formDefinition(form.formId);
  const given = reading.submission.answers[form.formId];

  return {
    formId: form.formId,
    title: definition.title,
    answered: form.answered,
    total: form.total,
    answers: form.fieldIds.flatMap((fieldId) => {
      const field = definition.fields.find(
        (candidate) => candidate.id === fieldId,
      );

      return field
        ? [
            presentAnswer({
              field,
              given,
              flagged: isFlagged(reading.flaggedQuestions, {
                formId: form.formId,
                fieldId,
              }),
            }),
          ]
        : [];
    }),
  };
}

function presentAnswer(input: {
  field: OnboardingField;
  given: OnboardingFormAnswers;
  flagged: boolean;
}): ReviewAnswer {
  const answer = input.given[input.field.id];

  return {
    fieldId: input.field.id,
    label: humaniseFieldId(input.field.id),
    value: isAnswered(answer) ? answerWithUnit(input.field, answer) : null,
    flagged: input.flagged,
  };
}

function formDefinition(formId: OnboardingFormId) {
  const definition = ONBOARDING_FORMS.find((form) => form.id === formId);

  if (!definition) {
    throw new Error(`No onboarding form is defined for ${formId}.`);
  }

  return definition;
}

function isFlagged(
  flagged: readonly QuestionId[],
  question: QuestionId,
): boolean {
  return flagged.some(
    (candidate) =>
      candidate.formId === question.formId &&
      candidate.fieldId === question.fieldId,
  );
}

function isAnswered(
  answer: OnboardingAnswer | undefined,
): answer is Exclude<OnboardingAnswer, null> {
  if (answer === undefined || answer === null || answer === false) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === "string") return answer.trim().length > 0;

  return true;
}

function describeAnswer(answer: Exclude<OnboardingAnswer, null>): string {
  if (typeof answer === "boolean") return answer ? "Yes" : "No";
  if (Array.isArray(answer)) return answer.join(", ");

  return String(answer);
}

function answerText(answer: OnboardingAnswer | undefined): string | null {
  return isAnswered(answer) ? describeAnswer(answer) : null;
}

function answerWithUnit(
  field: OnboardingField,
  answer: Exclude<OnboardingAnswer, null>,
): string {
  if (typeof answer !== "number") return describeAnswer(answer);

  if (isMeasureKind(field.kind)) {
    return formatCanonicalMeasure(field.kind, answer);
  }

  return field.unitSuffix ? `${answer} ${field.unitSuffix}` : String(answer);
}
