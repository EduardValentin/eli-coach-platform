import type { OnboardingSubmissionProblem } from "./client-onboarding";
import {
  emptyAnswers,
  isSameQuestion,
  type OnboardingAnswersByForm,
  type OnboardingQuestionId,
} from "./onboarding-answers";
import type { OnboardingFormId } from "./onboarding-schema";

export type DetailRequestSnapshot = {
  id: string;
  clientId: string;
  questionIds: readonly OnboardingQuestionId[];
  note: string;
  askedAt: Date;
  answeredAt: Date | null;
};

const NOT_ASKED_MESSAGE = "This question was not asked.";

export class DetailRequest {
  readonly id: string;
  readonly clientId: string;
  readonly questionIds: readonly OnboardingQuestionId[];
  readonly note: string;
  readonly askedAt: Date;
  readonly answeredAt: Date | null;

  private constructor(snapshot: DetailRequestSnapshot) {
    this.id = snapshot.id;
    this.clientId = snapshot.clientId;
    this.questionIds = snapshot.questionIds;
    this.note = snapshot.note;
    this.askedAt = snapshot.askedAt;
    this.answeredAt = snapshot.answeredAt;
  }

  static raise(input: {
    id: string;
    clientId: string;
    questionIds: readonly OnboardingQuestionId[];
    note: string;
    askedAt: Date;
  }): DetailRequest {
    return new DetailRequest({ ...input, answeredAt: null });
  }

  static reconstitute(snapshot: DetailRequestSnapshot): DetailRequest {
    return new DetailRequest(snapshot);
  }

  isOpen(): boolean {
    return this.answeredAt === null;
  }

  asks(question: OnboardingQuestionId): boolean {
    return this.questionIds.some((asked) => isSameQuestion(asked, question));
  }

  unaskedProblemsIn(
    answers: Partial<OnboardingAnswersByForm>,
  ): OnboardingSubmissionProblem[] {
    return Object.entries(answers).flatMap(([formId, formAnswers]) =>
      Object.keys(formAnswers ?? {})
        .filter(
          (fieldId) =>
            !this.asks({ formId: formId as OnboardingFormId, fieldId }),
        )
        .map((fieldId) => ({
          formId: formId as OnboardingFormId,
          fieldId,
          message: NOT_ASKED_MESSAGE,
        })),
    );
  }

  answersFrom(
    answers: Partial<OnboardingAnswersByForm>,
  ): OnboardingAnswersByForm {
    const asked = emptyAnswers();

    for (const { formId, fieldId } of this.questionIds) {
      asked[formId][fieldId] = answers[formId]?.[fieldId] ?? null;
    }

    return asked;
  }

  answer(at: Date): DetailRequest {
    return new DetailRequest({ ...this.toSnapshot(), answeredAt: at });
  }

  toSnapshot(): DetailRequestSnapshot {
    return {
      id: this.id,
      clientId: this.clientId,
      questionIds: this.questionIds,
      note: this.note,
      askedAt: this.askedAt,
      answeredAt: this.answeredAt,
    };
  }
}
