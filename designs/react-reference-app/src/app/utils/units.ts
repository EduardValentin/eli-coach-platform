// ── Unit conversion + formatting ────────────────────────────────────
//
// Canonical storage is metric: weight in kilograms, height in centimetres.
// Conversion happens only at display + input boundaries, driven by the
// client's unit preferences (see UnitPreferencesContext).

export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'ft-in';

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const IN_PER_FT = 12;

const round = (n: number, dp = 0): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

// ── Weight ──────────────────────────────────────────────────────────

export const kgToLb = (kg: number): number => kg / KG_PER_LB;
export const lbToKg = (lb: number): number => lb * KG_PER_LB;

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

// ── Height ──────────────────────────────────────────────────────────

export const cmToFtIn = (cm: number): { ft: number; inch: number } => {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(totalIn / IN_PER_FT), inch: totalIn % IN_PER_FT };
};

export const ftInToCm = (ft: number, inch: number): number =>
  (ft * IN_PER_FT + inch) * CM_PER_IN;

/** Height display: "165 cm" / "5'5\"". */
export const formatHeight = (cm: number, unit: HeightUnit): string => {
  if (unit === 'cm') return `${Math.round(cm)} cm`;
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
