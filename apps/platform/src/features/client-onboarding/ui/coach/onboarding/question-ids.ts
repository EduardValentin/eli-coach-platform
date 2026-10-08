import type { QuestionId } from "~/features/client-onboarding/public/onboarding";

function sameQuestion(first: QuestionId, second: QuestionId): boolean {
  return first.formId === second.formId && first.fieldId === second.fieldId;
}

export function includesQuestion(
  questions: readonly QuestionId[],
  question: QuestionId,
): boolean {
  return questions.some((candidate) => sameQuestion(candidate, question));
}

export function toggleQuestion(
  questions: readonly QuestionId[],
  question: QuestionId,
): QuestionId[] {
  if (includesQuestion(questions, question)) {
    return questions.filter((candidate) => !sameQuestion(candidate, question));
  }

  return [...questions, question];
}
