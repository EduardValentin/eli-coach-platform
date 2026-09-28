import {
  measureUnitLabel,
  toDisplayMeasure,
  type MeasureKind,
  type MeasureUnits,
} from "../unit-preference";
import type {
  OnboardingAnswer,
  OnboardingFormAnswers,
} from "./onboarding-answers";
import { reachableFields } from "./onboarding-answers";
import type {
  NumericRange,
  OnboardingField,
  OnboardingFormDefinition,
} from "./onboarding-schema";

export type OnboardingValidationOptions = {
  units: MeasureUnits;
  today: Date;
};

export type OnboardingFieldProblem = {
  fieldId: string;
  message: string;
};

const AMOUNT_NOUNS: Record<string, string> = {
  weight: "a weight",
  height: "a height",
  circumference: "a measurement",
};

const REQUIRED_MESSAGES: Record<string, string> = {
  radio: "Choose one option.",
  select: "Choose one option.",
  chips: "Choose at least one option.",
  date: "Pick a date.",
  checkbox: "Tick the box to continue.",
};

const TEXT_REQUIRED_MESSAGE = "Enter an answer.";

const FUTURE_DATE_MESSAGE = "Pick a date in the past.";

function isMeasureField(field: OnboardingField): boolean {
  return (
    field.kind === "weight" ||
    field.kind === "height" ||
    field.kind === "circumference"
  );
}

function isNumericField(field: OnboardingField): boolean {
  return isMeasureField(field) || field.kind === "number";
}

function amountNoun(field: OnboardingField): string {
  return AMOUNT_NOUNS[field.kind] ?? "a number";
}

function amountMessage(field: OnboardingField): string {
  return `Enter ${amountNoun(field)}.`;
}

function requiredMessage(field: OnboardingField): string {
  if (isNumericField(field)) return amountMessage(field);

  return REQUIRED_MESSAGES[field.kind] ?? TEXT_REQUIRED_MESSAGE;
}

function unitLabelOf(field: OnboardingField, units: MeasureUnits): string {
  if (isMeasureField(field))
    return ` ${measureUnitLabel(field.kind as MeasureKind, units)}`;

  return field.unitSuffix ? ` ${field.unitSuffix}` : "";
}

function displayAmount(
  field: OnboardingField,
  canonical: number,
  units: MeasureUnits,
): number {
  return isMeasureField(field)
    ? toDisplayMeasure(field.kind as MeasureKind, canonical, units)
    : canonical;
}

function displayRange(
  field: OnboardingField,
  range: NumericRange,
  units: MeasureUnits,
): NumericRange {
  return {
    min: Math.round(displayAmount(field, range.min, units)),
    max: Math.round(displayAmount(field, range.max, units)),
  };
}

export function entryBounds(
  field: OnboardingField,
  units: MeasureUnits,
): NumericRange | null {
  return field.range ? displayRange(field, field.range, units) : null;
}

function rangeMessage(
  field: OnboardingField,
  range: NumericRange,
  units: MeasureUnits,
): string {
  const bounds = displayRange(field, range, units);

  return `Enter ${amountNoun(field)} between ${bounds.min} and ${bounds.max}${unitLabelOf(field, units)}.`;
}

function spreadMessage(
  field: OnboardingField,
  spread: number,
  units: MeasureUnits,
): string {
  const allowed = Math.round(displayAmount(field, spread, units));

  return `Keep your goal within ${allowed}${unitLabelOf(field, units)} of your current weight.`;
}

function parseIsoDateUtc(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function subUtcMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() - months,
      date.getUTCDate(),
    ),
  );
}

function dateProblem(
  field: OnboardingField,
  answer: OnboardingAnswer,
  today: Date,
): string | null {
  const parsed = typeof answer === "string" ? parseIsoDateUtc(answer) : null;
  if (!parsed) return REQUIRED_MESSAGES.date;

  const todayUtc = startOfUtcDay(today);
  if (parsed > todayUtc) return FUTURE_DATE_MESSAGE;
  if (field.recentMonths === undefined) return null;

  return parsed < subUtcMonths(todayUtc, field.recentMonths)
    ? `Pick a date within the last ${field.recentMonths} months.`
    : null;
}

function numberProblem(
  field: OnboardingField,
  answer: OnboardingAnswer,
  answers: OnboardingFormAnswers,
  units: MeasureUnits,
): string | null {
  if (typeof answer !== "number") return amountMessage(field);

  const entered = displayAmount(field, answer, units);

  if (field.range) {
    const bounds = displayRange(field, field.range, units);
    if (entered < bounds.min || entered > bounds.max)
      return rangeMessage(field, field.range, units);
  } else if (entered <= 0) {
    return amountMessage(field);
  }

  if (!field.relativeTo) return null;

  const reference = answers[field.relativeTo.id];
  if (typeof reference !== "number") return null;

  const referenceDisplay = displayAmount(field, reference, units);
  if (referenceDisplay <= 0) return null;

  const allowed = displayAmount(field, field.relativeTo.spread, units);

  return Math.abs(entered - referenceDisplay) > allowed
    ? spreadMessage(field, field.relativeTo.spread, units)
    : null;
}

function isEmptyAnswer(
  field: OnboardingField,
  answer: OnboardingAnswer | undefined,
): boolean {
  if (field.kind === "chips")
    return !Array.isArray(answer) || answer.length === 0;
  if (field.kind === "checkbox") return answer !== true;

  return (
    answer === undefined ||
    answer === null ||
    (typeof answer === "string" && answer.trim() === "")
  );
}

export function fieldProblem(
  field: OnboardingField,
  answers: OnboardingFormAnswers,
  options: OnboardingValidationOptions,
): string | null {
  const answer = answers[field.id];

  if (isEmptyAnswer(field, answer)) {
    return field.requirement === "required" ? requiredMessage(field) : null;
  }
  if (field.kind === "date") return dateProblem(field, answer, options.today);
  if (!isNumericField(field)) return null;

  return numberProblem(field, answer, answers, options.units);
}

export function formProblems(
  form: OnboardingFormDefinition,
  answers: OnboardingFormAnswers,
  options: OnboardingValidationOptions,
): OnboardingFieldProblem[] {
  return reachableFields(form.fields, answers).flatMap((field) => {
    const message = fieldProblem(field, answers, options);

    return message ? [{ fieldId: field.id, message }] : [];
  });
}
