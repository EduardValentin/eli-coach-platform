export type MeasurementFieldId = "weight" | "waist" | "hips" | "thigh" | "arm";

export type MeasurementFieldKind = "weight" | "circumference";

export type MeasurementRange = { min: number; max: number };

export type MeasurementField = {
  id: MeasurementFieldId;
  label: string;
  kind: MeasurementFieldKind;
  requirement: "required" | "optional";
  hint: string;
  range: MeasurementRange;
};

export const WEIGHT_MEASUREMENT_FIELD: MeasurementField = {
  id: "weight",
  label: "Weight",
  kind: "weight",
  requirement: "required",
  hint: "First thing in the morning, before eating, after the bathroom.",
  range: { min: 30, max: 300 },
};

export const CIRCUMFERENCE_MEASUREMENT_FIELDS: readonly MeasurementField[] = [
  {
    id: "waist",
    label: "Waist",
    kind: "circumference",
    requirement: "required",
    hint: "Narrowest point, usually just above the belly button. Relaxed, don't pull the tape tight.",
    range: { min: 40, max: 200 },
  },
  {
    id: "hips",
    label: "Hips",
    kind: "circumference",
    requirement: "optional",
    hint: "Widest point.",
    range: { min: 50, max: 200 },
  },
  {
    id: "thigh",
    label: "Thigh",
    kind: "circumference",
    requirement: "optional",
    hint: "Mid-thigh, same leg every time.",
    range: { min: 30, max: 100 },
  },
  {
    id: "arm",
    label: "Arm",
    kind: "circumference",
    requirement: "optional",
    hint: "Relaxed, mid-bicep.",
    range: { min: 15, max: 60 },
  },
];

export const MEASUREMENT_FIELDS: readonly MeasurementField[] = [
  WEIGHT_MEASUREMENT_FIELD,
  ...CIRCUMFERENCE_MEASUREMENT_FIELDS,
];
