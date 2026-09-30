import {
  measureUnitsOf,
  toDisplayMeasure,
  UnitPreference,
  type MeasureKind,
} from "@eli-coach-platform/domain/unit-preference";

const CANONICAL_UNITS = measureUnitsOf(UnitPreference.metric().toSnapshot());

const CANONICAL_UNIT_LABELS: Record<MeasureKind, string> = {
  weight: "kg",
  height: "cm",
  circumference: "cm",
};

export function isMeasureKind(kind: string): kind is MeasureKind {
  return kind in CANONICAL_UNIT_LABELS;
}

export function formatCanonicalMeasure(
  kind: MeasureKind,
  canonical: number,
): string {
  return `${toDisplayMeasure(kind, canonical, CANONICAL_UNITS)} ${CANONICAL_UNIT_LABELS[kind]}`;
}
