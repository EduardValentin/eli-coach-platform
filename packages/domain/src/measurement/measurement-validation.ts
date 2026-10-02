import {
  measureUnitLabel,
  toDisplayMeasure,
  type MeasureUnits,
} from "../unit-preference";

import type { MeasurementValues } from "./measurement";
import {
  MEASUREMENT_FIELDS,
  type MeasurementField,
  type MeasurementFieldId,
  type MeasurementFieldKind,
  type MeasurementRange,
} from "./measurement-fields";

export type MeasurementRule = Pick<
  MeasurementField,
  "kind" | "requirement" | "range"
>;

const CANONICAL_UNITS: MeasureUnits = { weight: "kg", length: "cm" };

const CANONICAL_VALUE_KEYS: Record<
  MeasurementFieldId,
  keyof MeasurementValues
> = {
  weight: "weightKg",
  waist: "waistCm",
  hips: "hipsCm",
  thigh: "thighCm",
  arm: "armCm",
};

const READING_NOUNS: Record<MeasurementFieldKind, string> = {
  weight: "a weight",
  circumference: "a measurement",
};

function displayBounds(
  rule: MeasurementRule,
  units: MeasureUnits,
): MeasurementRange {
  return {
    min: Math.round(toDisplayMeasure(rule.kind, rule.range.min, units)),
    max: Math.round(toDisplayMeasure(rule.kind, rule.range.max, units)),
  };
}

export function measurementProblem(
  rule: MeasurementRule,
  reading: unknown,
  units: MeasureUnits,
): string | null {
  const noun = READING_NOUNS[rule.kind];

  if (reading === undefined || reading === null)
    return rule.requirement === "required" ? `Enter ${noun}.` : null;
  if (typeof reading !== "number" || !Number.isFinite(reading))
    return `Enter ${noun}.`;

  const bounds = displayBounds(rule, units);
  const entered = toDisplayMeasure(rule.kind, reading, units);

  return entered < bounds.min || entered > bounds.max
    ? `Enter ${noun} between ${bounds.min} and ${bounds.max} ${measureUnitLabel(rule.kind, units)}.`
    : null;
}

export function hasMeasurementProblem(values: MeasurementValues): boolean {
  return MEASUREMENT_FIELDS.some(
    (field) =>
      measurementProblem(
        field,
        values[CANONICAL_VALUE_KEYS[field.id]],
        CANONICAL_UNITS,
      ) !== null,
  );
}
