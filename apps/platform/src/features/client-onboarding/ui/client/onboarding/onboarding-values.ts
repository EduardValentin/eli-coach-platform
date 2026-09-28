import {
  reachableFields,
  type OnboardingAnswer,
  type OnboardingField,
  type OnboardingFormAnswers,
} from "@eli-coach-platform/domain/client-onboarding";
import {
  toCanonicalMeasure,
  toDisplayMeasure,
  type MeasureKind,
  type MeasureUnits,
} from "@eli-coach-platform/domain/unit-preference";

export type OnboardingValue = string | string[];

export type OnboardingValues = Record<string, OnboardingValue>;

const MEASURE_KINDS: readonly string[] = ["weight", "height", "circumference"];

const TICKED = "true";

const UNTICKED = "false";

export function measureKindOf(field: OnboardingField): MeasureKind | null {
  return MEASURE_KINDS.includes(field.kind)
    ? (field.kind as MeasureKind)
    : null;
}

export function isNumericField(field: OnboardingField): boolean {
  return measureKindOf(field) !== null || field.kind === "number";
}

export function asText(value: OnboardingValue | undefined): string {
  return typeof value === "string" ? value : "";
}

export function asList(value: OnboardingValue | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

export function isTicked(value: OnboardingValue | undefined): boolean {
  return asText(value) === TICKED;
}

export function tickedValue(ticked: boolean): string {
  return ticked ? TICKED : UNTICKED;
}

function answerToValue(
  field: OnboardingField,
  answer: OnboardingAnswer | undefined,
  units: MeasureUnits,
): OnboardingValue {
  if (field.kind === "chips") return Array.isArray(answer) ? answer : [];
  if (field.kind === "checkbox") return tickedValue(answer === true);
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
