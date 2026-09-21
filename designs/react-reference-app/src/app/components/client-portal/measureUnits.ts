import { useMemo } from 'react';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import {
  displayLengthValue,
  displayWeightValue,
  fromDisplayLength,
  fromDisplayWeight,
  lengthUnitOf,
  type LengthUnit,
  type WeightUnit,
} from '../../utils/units';

export type MeasureKind = 'weight' | 'height' | 'circumference';

export type MeasureUnits = {
  weight: WeightUnit;
  length: LengthUnit;
};

const LENGTH_STEPS: Record<LengthUnit, string> = { cm: '0.1', in: '0.25' };

const WEIGHT_STEP = '0.1';

export function useMeasureUnits(): MeasureUnits {
  const { weightUnit, heightUnit } = useUnitPreferences();

  return useMemo(
    () => ({ weight: weightUnit, length: lengthUnitOf(heightUnit) }),
    [weightUnit, heightUnit],
  );
}

export function measureUnitLabel(kind: MeasureKind, units: MeasureUnits): string {
  return kind === 'weight' ? units.weight : units.length;
}

export function measureStep(kind: MeasureKind, units: MeasureUnits): string {
  return kind === 'weight' ? WEIGHT_STEP : LENGTH_STEPS[units.length];
}

export function toDisplayMeasure(
  kind: MeasureKind,
  canonical: number,
  units: MeasureUnits,
): number {
  return kind === 'weight'
    ? displayWeightValue(canonical, units.weight, 1)
    : displayLengthValue(canonical, units.length);
}

export function toCanonicalMeasure(
  kind: MeasureKind,
  entered: number,
  units: MeasureUnits,
): number {
  return kind === 'weight'
    ? fromDisplayWeight(entered, units.weight)
    : fromDisplayLength(entered, units.length);
}
