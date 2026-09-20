import { isValid, parseISO, startOfDay, subMonths } from 'date-fns';
import type { RegisterOptions } from 'react-hook-form';
import type {
  NumericRange,
  OnboardingField,
} from '../../../domain/onboardingSchema';
import {
  measureUnitLabel,
  toDisplayMeasure,
  type MeasureKind,
  type MeasureUnits,
} from '../measureUnits';
import { asList, asText, isMeasureField, type OnboardingValues } from './onboardingValues';

const REQUIRED_MESSAGES: Record<string, string> = {
  radio: 'Pick one of these.',
  select: 'Choose one of these.',
  chips: 'Pick at least one.',
  number: 'Add a number here.',
  date: 'Pick a date.',
};

const NUMBER_MESSAGE = 'Use numbers only.';

const FUTURE_DATE_MESSAGE = "That day hasn't come yet — pick the day it started.";

const DISTANT_DATE_MESSAGE =
  'That is more than a year back — pick the most recent one you remember.';

type FieldEntry = {
  value: string | string[] | undefined;
  values: OnboardingValues;
};

function requiredMessage(field: OnboardingField): string {
  if (isMeasureField(field)) return REQUIRED_MESSAGES.number;

  return REQUIRED_MESSAGES[field.kind] ?? 'Write a short answer here.';
}

function isNumeric(field: OnboardingField): boolean {
  return isMeasureField(field) || field.kind === 'number';
}

function unitLabelOf(field: OnboardingField, units: MeasureUnits): string {
  if (isMeasureField(field)) {
    return ` ${measureUnitLabel(field.kind as MeasureKind, units)}`;
  }

  return field.unitSuffix ? ` ${field.unitSuffix}` : '';
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
    min: Math.floor(displayAmount(field, range.min, units)),
    max: Math.ceil(displayAmount(field, range.max, units)),
  };
}

function rangeMessage(
  field: OnboardingField,
  range: NumericRange,
  units: MeasureUnits,
): string {
  const bounds = displayRange(field, range, units);

  return `Check that one — it should be between ${bounds.min} and ${bounds.max}${unitLabelOf(field, units)}.`;
}

function spreadMessage(
  field: OnboardingField,
  spread: number,
  units: MeasureUnits,
): string {
  const allowed = Math.round(displayAmount(field, spread, units));

  return `Keep your goal within ${allowed}${unitLabelOf(field, units)} of where you are now.`;
}

function dateProblem(field: OnboardingField, entered: string): string | true {
  const parsed = parseISO(entered);
  if (!isValid(parsed)) return REQUIRED_MESSAGES.date;

  const today = startOfDay(new Date());
  if (parsed > today) return FUTURE_DATE_MESSAGE;
  if (field.recentMonths === undefined) return true;

  return parsed < subMonths(today, field.recentMonths)
    ? DISTANT_DATE_MESSAGE
    : true;
}

function numberProblem(
  field: OnboardingField,
  units: MeasureUnits,
  entry: FieldEntry,
): string | true {
  const entered = Number(asText(entry.value));
  if (!Number.isFinite(entered) || entered <= 0) return NUMBER_MESSAGE;

  if (field.range) {
    const bounds = displayRange(field, field.range, units);
    if (entered < bounds.min || entered > bounds.max) {
      return rangeMessage(field, field.range, units);
    }
  }

  if (!field.relativeTo) return true;

  const reference = Number(asText(entry.values[field.relativeTo.id]));
  if (!Number.isFinite(reference) || reference <= 0) return true;

  const allowed = displayAmount(field, field.relativeTo.spread, units);

  return Math.abs(entered - reference) > allowed
    ? spreadMessage(field, field.relativeTo.spread, units)
    : true;
}

function fieldProblem(
  field: OnboardingField,
  units: MeasureUnits,
  entry: FieldEntry,
): string | true {
  const empty =
    field.kind === 'chips'
      ? asList(entry.value).length === 0
      : asText(entry.value).trim() === '';

  if (empty) return field.requirement === 'required' ? requiredMessage(field) : true;
  if (field.kind === 'date') return dateProblem(field, asText(entry.value));
  if (!isNumeric(field)) return true;

  return numberProblem(field, units, entry);
}

export function fieldRules(
  field: OnboardingField,
  units: MeasureUnits,
): RegisterOptions<OnboardingValues> {
  return {
    validate: (value, values) => fieldProblem(field, units, { value, values }),
  };
}
