import {
  CANONICAL_MEASURE_UNITS,
  toDisplayMeasure,
  type MeasureKind,
} from "@eli-coach-platform/domain/client-settings";

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
  return `${toDisplayMeasure(kind, canonical, CANONICAL_MEASURE_UNITS)} ${CANONICAL_UNIT_LABELS[kind]}`;
}
