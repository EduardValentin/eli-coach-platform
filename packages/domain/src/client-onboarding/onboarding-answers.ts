import type { OnboardingField, OnboardingFormId } from "./onboarding-schema";
import { ONBOARDING_FORM_IDS } from "./onboarding-schema";

export type OnboardingAnswer = string | string[] | number | boolean | null;

export type OnboardingFormAnswers = Record<string, OnboardingAnswer>;

export type OnboardingAnswersByForm = Record<
  OnboardingFormId,
  OnboardingFormAnswers
>;

export function emptyAnswers(): OnboardingAnswersByForm {
  return Object.fromEntries(
    ONBOARDING_FORM_IDS.map((formId) => [formId, {}]),
  ) as OnboardingAnswersByForm;
}

function describeAnswer(answer: OnboardingAnswer): string {
  if (answer === null) return "Not answered";
  if (typeof answer === "boolean") return answer ? "Yes" : "No";
  if (Array.isArray(answer)) return answer.join(", ");

  return String(answer);
}

function conditionTriggerValue(trigger: OnboardingAnswer): string {
  return typeof trigger === "boolean"
    ? String(trigger)
    : describeAnswer(trigger);
}

function isAnswered(answer: OnboardingAnswer | undefined): boolean {
  if (answer === undefined || answer === null) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === "string") return answer.trim().length > 0;

  return true;
}

function matchesCondition(
  condition: NonNullable<OnboardingField["revealedBy"]>,
  answers: OnboardingFormAnswers,
): boolean {
  const trigger = answers[condition.id];
  if (trigger === undefined) return false;

  const expected = Array.isArray(condition.value)
    ? condition.value
    : [condition.value];

  return Array.isArray(trigger)
    ? trigger.some((entry) => expected.includes(entry))
    : expected.includes(conditionTriggerValue(trigger));
}

function meetsRequires(
  requires: OnboardingField["requires"],
  answers: OnboardingFormAnswers,
): boolean {
  return (requires ?? []).every((id) => isAnswered(answers[id]));
}

export function isFieldReachable(
  field: OnboardingField,
  answers: OnboardingFormAnswers,
): boolean {
  if (field.revealedBy && !matchesCondition(field.revealedBy, answers))
    return false;
  if (field.concealedBy && matchesCondition(field.concealedBy, answers))
    return false;

  return meetsRequires(field.requires, answers);
}

export function reachableFields(
  fields: readonly OnboardingField[],
  answers: OnboardingFormAnswers,
): OnboardingField[] {
  return fields.filter((field) => isFieldReachable(field, answers));
}

export function withoutUnreachable(
  fields: readonly OnboardingField[],
  answers: OnboardingFormAnswers,
): OnboardingFormAnswers {
  const reachableIds = new Set(
    reachableFields(fields, answers).map((field) => field.id),
  );

  return Object.fromEntries(
    Object.entries(answers).filter(([id]) => reachableIds.has(id)),
  );
}

export function applyExclusiveOptions(
  field: OnboardingField,
  previous: readonly string[],
  next: readonly string[],
): string[] {
  const exclusiveOptions = field.exclusiveOptions ?? [];
  if (exclusiveOptions.length === 0) return [...next];

  const removed = previous.find((option) => !next.includes(option));
  if (removed !== undefined) return [...next];

  const added = next.find((option) => !previous.includes(option));
  if (added === undefined) return [...next];
  if (exclusiveOptions.includes(added)) return [added];

  return next.filter((option) => !exclusiveOptions.includes(option));
}
