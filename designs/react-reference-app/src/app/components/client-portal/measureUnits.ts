import { useMemo } from 'react';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import {
  circumferenceUnitOf,
  cmToIn,
  displayCircumferenceValue,
  displayWeightValue,
  fromDisplayCircumference,
  fromDisplayWeight,
  inToCm,
  type CircumferenceUnit,
  type HeightUnit,
  type WeightUnit,
} from '../../utils/units';

export type MeasureKind = 'weight' | 'height' | 'circumference';

export type MeasureUnits = {
  weight: WeightUnit;
  height: HeightUnit;
  circumference: CircumferenceUnit;
};

export function useMeasureUnits(): MeasureUnits {
  const { weightUnit, heightUnit } = useUnitPreferences();

  return useMemo(
    () => ({
      weight: weightUnit,
      height: heightUnit,
      circumference: circumferenceUnitOf(heightUnit),
    }),
    [weightUnit, heightUnit],
  );
}

export function measureUnitLabel(kind: MeasureKind, units: MeasureUnits): string {
  if (kind === 'weight') return units.weight;
  if (kind === 'height') return units.height === 'cm' ? 'cm' : 'in';

  return units.circumference;
}

export function toDisplayMeasure(
  kind: MeasureKind,
  canonical: number,
  units: MeasureUnits,
): number {
  if (kind === 'weight') return displayWeightValue(canonical, units.weight, 1);
  if (kind === 'height') {
    return units.height === 'cm'
      ? Math.round(canonical)
      : Math.round(cmToIn(canonical) * 10) / 10;
  }

  return displayCircumferenceValue(canonical, units.circumference, 1);
}

export function toCanonicalMeasure(
  kind: MeasureKind,
  entered: number,
  units: MeasureUnits,
): number {
  if (kind === 'weight') return fromDisplayWeight(entered, units.weight);
  if (kind === 'height') {
    return units.height === 'cm' ? entered : inToCm(entered);
  }

  return fromDisplayCircumference(entered, units.circumference);
}
