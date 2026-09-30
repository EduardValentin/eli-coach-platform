import {
  measureUnitLabel,
  toDisplayMeasure,
  type MeasureUnits,
} from "../unit-preference";

import type {
  MeasurementField,
  MeasurementFieldKind,
  MeasurementRange,
} from "./measurement-fields";

export type MeasurementRule = Pick<
  MeasurementField,
  "kind" | "requirement" | "range"
>;

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
  if (typeof reading !== "number") return `Enter ${noun}.`;

  const bounds = displayBounds(rule, units);
  const entered = toDisplayMeasure(rule.kind, reading, units);

  return entered < bounds.min || entered > bounds.max
    ? `Enter ${noun} between ${bounds.min} and ${bounds.max} ${measureUnitLabel(rule.kind, units)}.`
    : null;
}
