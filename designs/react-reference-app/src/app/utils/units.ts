// ── Unit conversion + formatting ────────────────────────────────────
//
// Canonical storage is metric: weight in kilograms, length in centimetres.
// Conversion happens only at display + input boundaries, driven by the
// client's unit preferences (see UnitPreferencesContext).

export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'ft-in';
export type LengthUnit = 'cm' | 'in';
export type MeasurementSystem = 'metric' | 'imperial';

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const IN_PER_FT = 12;

const round = (n: number, dp = 0): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

const toHalf = (n: number): number => Math.round(n * 2) / 2;
const toQuarter = (n: number): number => Math.round(n * 4) / 4;

// ── Weight ──────────────────────────────────────────────────────────

export const kgToLb = (kg: number): number => round(kg / KG_PER_LB, 1);
export const lbToKg = (lb: number): number => round(lb * KG_PER_LB, 2);

/** Short label for a weight unit, e.g. for inputs and column headers. */
export const weightUnitLabel = (unit: WeightUnit): string => unit;

/** Canonical kg → number in the display unit. */
export const toDisplayWeight = (kg: number, unit: WeightUnit): number =>
  unit === 'kg' ? kg : kgToLb(kg);

/** Number entered in the display unit → canonical kg. */
export const fromDisplayWeight = (value: number, unit: WeightUnit): number =>
  unit === 'kg' ? value : lbToKg(value);

/** Rounded numeric weight in the display unit (no label). */
export const displayWeightValue = (kg: number, unit: WeightUnit, dp = 1): number =>
  round(toDisplayWeight(kg, unit), dp);

/** Body-weight display, one decimal: "66.1 kg" / "145.8 lb". */
export const formatBodyWeight = (kg: number, unit: WeightUnit): string =>
  `${displayWeightValue(kg, unit, 1)} ${weightUnitLabel(unit)}`;

/** Training-load display, trims trailing zeros: "60 kg" / "132.3 lb". */
export const formatLoad = (kg: number, unit: WeightUnit, dp = 1): string =>
  `${displayWeightValue(kg, unit, dp)} ${weightUnitLabel(unit)}`;

/** Volume display, whole numbers: "4,500 kg" / "9,921 lb". */
export const formatVolume = (kg: number, unit: WeightUnit): string =>
  `${Math.round(toDisplayWeight(kg, unit)).toLocaleString()} ${weightUnitLabel(unit)}`;

// ── Length ──────────────────────────────────────────────────────────

export const cmToIn = (cm: number): number => toQuarter(cm / CM_PER_IN);
export const inToCm = (inch: number): number => toHalf(inch * CM_PER_IN);

export const lengthUnitOf = (unit: HeightUnit): LengthUnit =>
  unit === 'cm' ? 'cm' : 'in';

export const toDisplayLength = (cm: number, unit: LengthUnit): number =>
  unit === 'cm' ? cm : cmToIn(cm);

export const fromDisplayLength = (value: number, unit: LengthUnit): number =>
  unit === 'cm' ? value : inToCm(value);

export const displayLengthValue = (cm: number, unit: LengthUnit): number =>
  unit === 'cm' ? round(cm, 1) : cmToIn(cm);

export const formatCircumference = (cm: number, unit: LengthUnit): string =>
  `${displayLengthValue(cm, unit)} ${unit}`;

// ── Height ──────────────────────────────────────────────────────────

export const cmToFtIn = (cm: number): { ft: number; inch: number } => {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(totalIn / IN_PER_FT), inch: totalIn % IN_PER_FT };
};

export const ftInToCm = (ft: number, inch: number): number =>
  inToCm(ft * IN_PER_FT + inch);

export const formatFeetAndInches = (inches: number): string => {
  const whole = Math.round(inches);
  return `${Math.floor(whole / IN_PER_FT)} ft ${whole % IN_PER_FT} in`;
};

/** Height display: "165 cm" / "5'5\"". */
export const formatHeight = (cm: number, unit: HeightUnit): string => {
  if (unit === 'cm') return `${round(cm, 1)} cm`;
  const { ft, inch } = cmToFtIn(cm);
  return `${ft}'${inch}"`;
};

// ── Human-readable option labels (for settings + previews) ──────────

export const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  kg: 'Kilograms (kg)',
  lb: 'Pounds (lb)',
};

export const HEIGHT_UNIT_LABELS: Record<HeightUnit, string> = {
  cm: 'Centimetres (cm)',
  'ft-in': 'Feet & inches (ft·in)',
};

// ── Measurement system ────────────────────────────────────────────

export const MEASUREMENT_SYSTEM_UNITS: Record<
  MeasurementSystem,
  { weightUnit: WeightUnit; heightUnit: HeightUnit }
> = {
  metric: { weightUnit: 'kg', heightUnit: 'cm' },
  imperial: { weightUnit: 'lb', heightUnit: 'ft-in' },
};

export const MEASUREMENT_SYSTEM_LABELS: Record<MeasurementSystem, string> = {
  metric: 'kg · cm',
  imperial: 'lb · in',
};

export const measurementSystemOf = (unit: WeightUnit): MeasurementSystem =>
  unit === 'kg' ? 'metric' : 'imperial';
