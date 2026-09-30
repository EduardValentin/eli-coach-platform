import type {
  HeightUnit,
  UnitPreferenceSnapshot,
  WeightUnit,
} from "./unit-preference";

type LengthUnit = "cm" | "in";

export type MeasureKind = "weight" | "height" | "circumference";

export type MeasureUnits = {
  weight: WeightUnit;
  length: LengthUnit;
};

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const IN_PER_FT = 12;

function round(value: number, decimalPlaces = 0): number {
  const factor = 10 ** decimalPlaces;

  return Math.round(value * factor) / factor;
}

function toHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function toQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}

export function kgToLb(kg: number): number {
  return round(kg / KG_PER_LB, 1);
}

export function lbToKg(lb: number): number {
  return round(lb * KG_PER_LB, 2);
}

export function cmToIn(cm: number): number {
  return toQuarter(cm / CM_PER_IN);
}

export function inToCm(inch: number): number {
  return toHalf(inch * CM_PER_IN);
}

function lengthUnitOf(unit: HeightUnit): LengthUnit {
  return unit === "cm" ? "cm" : "in";
}

function displayWeightValue(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? round(kg, 1) : kgToLb(kg);
}

function fromDisplayWeight(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : lbToKg(value);
}

function displayLengthValue(cm: number, unit: LengthUnit): number {
  return unit === "cm" ? round(cm, 1) : cmToIn(cm);
}

function fromDisplayLength(value: number, unit: LengthUnit): number {
  return unit === "cm" ? value : inToCm(value);
}

export function measureUnitsOf(
  preference: UnitPreferenceSnapshot,
): MeasureUnits {
  return {
    weight: preference.weightUnit,
    length: lengthUnitOf(preference.heightUnit),
  };
}

export function measureUnitLabel(
  kind: MeasureKind,
  units: MeasureUnits,
): string {
  return kind === "weight" ? units.weight : units.length;
}

const LENGTH_STEPS: Record<LengthUnit, string> = { cm: "0.1", in: "0.25" };

const WEIGHT_STEP = "0.1";

export function measureStep(kind: MeasureKind, units: MeasureUnits): string {
  return kind === "weight" ? WEIGHT_STEP : LENGTH_STEPS[units.length];
}

export function toDisplayMeasure(
  kind: MeasureKind,
  canonical: number,
  units: MeasureUnits,
): number {
  return kind === "weight"
    ? displayWeightValue(canonical, units.weight)
    : displayLengthValue(canonical, units.length);
}

export function toCanonicalMeasure(
  kind: MeasureKind,
  entered: number,
  units: MeasureUnits,
): number {
  return kind === "weight"
    ? fromDisplayWeight(entered, units.weight)
    : fromDisplayLength(entered, units.length);
}

export function formatFeetAndInches(inches: number): string {
  const whole = Math.round(inches);

  return `${Math.floor(whole / IN_PER_FT)} ft ${whole % IN_PER_FT} in`;
}
