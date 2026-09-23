import type {
  OnboardingAnswer,
  OnboardingFormAnswers,
} from '../../../domain/journey';
import type { OnboardingField } from '../../../domain/onboardingSchema';
import {
  toCanonicalMeasure,
  toDisplayMeasure,
  type MeasureKind,
  type MeasureUnits,
} from '../measureUnits';

export type OnboardingValues = Record<string, string | string[]>;

const MEASURE_KINDS: readonly string[] = ['weight', 'height', 'circumference'];

export function isMeasureField(field: OnboardingField): boolean {
  return MEASURE_KINDS.includes(field.kind);
}

export function isNumericField(field: OnboardingField): boolean {
  return isMeasureField(field) || field.kind === 'number';
}

export function asText(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export function asList(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function answerToValue(
  field: OnboardingField,
  answer: OnboardingAnswer | undefined,
  units: MeasureUnits,
): string | string[] {
  if (field.kind === 'chips') {
    return Array.isArray(answer) ? answer : [];
  }
  if (field.kind === 'checkbox') return answer === true ? 'true' : 'false';
  if (answer === undefined || answer === null) return '';
  if (typeof answer === 'number' && isMeasureField(field)) {
    return String(toDisplayMeasure(field.kind as MeasureKind, answer, units));
  }

  return String(answer);
}

function valueToAnswer(
  field: OnboardingField,
  value: string | string[] | undefined,
  units: MeasureUnits,
): OnboardingAnswer {
  if (field.kind === 'chips') return asList(value);
  if (field.kind === 'checkbox') return asText(value) === 'true';

  const text = asText(value).trim();
  if (text === '') return null;

  if (isMeasureField(field)) {
    const entered = Number(text);
    return Number.isFinite(entered)
      ? toCanonicalMeasure(field.kind as MeasureKind, entered, units)
      : null;
  }

  if (field.kind === 'number') {
    const entered = Number(text);
    return Number.isFinite(entered) ? entered : null;
  }

  return text;
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
    const empty =
      answer === null || (Array.isArray(answer) && answer.length === 0);
    if (!empty) answers[field.id] = answer;
  }

  return answers;
}

function matchesCondition(
  condition: NonNullable<OnboardingField['revealedBy']>,
  values: OnboardingValues,
): boolean {
  const expected = Array.isArray(condition.value)
    ? condition.value
    : [condition.value];
  const actual = values[condition.id];

  return Array.isArray(actual)
    ? actual.some((entry) => expected.includes(entry))
    : expected.includes(asText(actual));
}

function hasEntry(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value.length > 0 : asText(value).trim() !== '';
}

function meetsRequires(
  requires: OnboardingField['requires'],
  values: OnboardingValues,
): boolean {
  return (requires ?? []).every((id) => hasEntry(values[id]));
}

export function isFieldVisible(
  field: OnboardingField,
  values: OnboardingValues,
): boolean {
  if (field.revealedBy && !matchesCondition(field.revealedBy, values)) {
    return false;
  }
  if (field.concealedBy && matchesCondition(field.concealedBy, values)) {
    return false;
  }

  return meetsRequires(field.requires, values);
}

export function visibleFields(
  fields: readonly OnboardingField[],
  values: OnboardingValues,
): OnboardingField[] {
  return fields.filter((field) => isFieldVisible(field, values));
}
