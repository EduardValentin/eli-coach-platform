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
import {
  asList,
  asText,
  isMeasureField,
  isNumericField,
  type OnboardingValues,
} from './onboardingValues';

const AMOUNT_NOUNS: Record<string, string> = {
  weight: 'a weight',
  height: 'a height',
  circumference: 'a measurement',
};

const REQUIRED_MESSAGES: Record<string, string> = {
  radio: 'Choose one option.',
  select: 'Choose one option.',
  chips: 'Choose at least one option.',
  date: 'Pick a date.',
  checkbox: 'Tick the box to continue.',
};

const TEXT_REQUIRED_MESSAGE = 'Enter an answer.';

const FUTURE_DATE_MESSAGE = 'Pick a date in the past.';

type FieldEntry = {
  value: string | string[] | undefined;
  values: OnboardingValues;
};

function amountNoun(field: OnboardingField): string {
  return AMOUNT_NOUNS[field.kind] ?? 'a number';
}

function amountMessage(field: OnboardingField): string {
  return `Enter ${amountNoun(field)}.`;
}

function requiredMessage(field: OnboardingField): string {
  if (isNumericField(field)) return amountMessage(field);

  return REQUIRED_MESSAGES[field.kind] ?? TEXT_REQUIRED_MESSAGE;
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

function dateProblem(field: OnboardingField, entered: string): string | true {
  const parsed = parseISO(entered);
  if (!isValid(parsed)) return REQUIRED_MESSAGES.date;

  const today = startOfDay(new Date());
  if (parsed > today) return FUTURE_DATE_MESSAGE;
  if (field.recentMonths === undefined) return true;

  return parsed < subMonths(today, field.recentMonths)
    ? `Pick a date within the last ${field.recentMonths} months.`
    : true;
}

function numberProblem(
  field: OnboardingField,
  units: MeasureUnits,
  entry: FieldEntry,
): string | true {
  const entered = Number(asText(entry.value));
  if (!Number.isFinite(entered)) return amountMessage(field);

  if (field.range) {
    const bounds = displayRange(field, field.range, units);
    if (entered < bounds.min || entered > bounds.max) {
      return rangeMessage(field, field.range, units);
    }
  } else if (entered <= 0) {
    return amountMessage(field);
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
      : field.kind === 'checkbox'
        ? asText(entry.value) !== 'true'
        : asText(entry.value).trim() === '';

  if (empty)
    return field.requirement === 'required' ? requiredMessage(field) : true;
  if (field.kind === 'date') return dateProblem(field, asText(entry.value));
  if (!isNumericField(field)) return true;

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
