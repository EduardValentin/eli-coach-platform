import {
  reachableFields,
  type OnboardingAnswer,
  type OnboardingField,
  type OnboardingFormAnswers,
} from "@eli-coach-platform/domain/client-onboarding";
import {
  toCanonicalMeasure,
  toDisplayMeasure,
  type MeasureUnits,
} from "@eli-coach-platform/domain/client-settings";

import {
  measureKindOf,
  TICKED,
  UNTICKED,
} from "~/bounded-contexts/clients/client-profile/ui/shared/profile/profile-fields";

export type OnboardingValue = string | string[];

export type OnboardingValues = Record<string, OnboardingValue>;

function asText(value: OnboardingValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function asList(value: OnboardingValue | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function isTicked(value: OnboardingValue | undefined): boolean {
  return asText(value) === TICKED;
}

function answerToValue(
  field: OnboardingField,
  answer: OnboardingAnswer | undefined,
  units: MeasureUnits,
): OnboardingValue {
  if (field.kind === "chips") return Array.isArray(answer) ? answer : [];
  if (field.kind === "checkbox") return answer === true ? TICKED : UNTICKED;
  if (answer === undefined || answer === null) return "";

  const measureKind = measureKindOf(field);

  if (typeof answer === "number" && measureKind) {
    return String(toDisplayMeasure(measureKind, answer, units));
  }

  return String(answer);
}

function numberOf(text: string): number | null {
  const entered = Number(text);

  return Number.isFinite(entered) ? entered : null;
}

function valueToAnswer(
  field: OnboardingField,
  value: OnboardingValue | undefined,
  units: MeasureUnits,
): OnboardingAnswer {
  if (field.kind === "chips") return asList(value);
  if (field.kind === "checkbox") return isTicked(value);

  const text = asText(value).trim();
  if (text === "") return null;

  const measureKind = measureKindOf(field);

  if (measureKind) {
    const entered = numberOf(text);

    return entered === null
      ? null
      : toCanonicalMeasure(measureKind, entered, units);
  }

  return field.kind === "number" ? numberOf(text) : text;
}

function isEmptyAnswer(answer: OnboardingAnswer): boolean {
  return answer === null || (Array.isArray(answer) && answer.length === 0);
}

export function toFormValues(
  fields: readonly OnboardingField[],
  answers: OnboardingFormAnswers,
  units: MeasureUnits,
): OnboardingValues {
  return Object.fromEntries(
    fields.map((field) => [
      field.id,
      answerToValue(field, answers[field.id], units),
    ]),
  );
}

export function toAnswers(
  fields: readonly OnboardingField[],
  values: OnboardingValues,
  units: MeasureUnits,
): OnboardingFormAnswers {
  const answers: OnboardingFormAnswers = {};

  for (const field of fields) {
    const answer = valueToAnswer(field, values[field.id], units);
    if (!isEmptyAnswer(answer)) answers[field.id] = answer;
  }

  return answers;
}

export function visibleFields(
  fields: readonly OnboardingField[],
  values: OnboardingValues,
  units: MeasureUnits,
): OnboardingField[] {
  return reachableFields(fields, toAnswers(fields, values, units));
}
