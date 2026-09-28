export const WEIGHT_UNITS = ["kg", "lb"] as const;

export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const HEIGHT_UNITS = ["cm", "ft-in"] as const;

export type HeightUnit = (typeof HEIGHT_UNITS)[number];

export type UnitPreference = {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
};

export const DEFAULT_UNIT_PREFERENCE: UnitPreference = {
  weightUnit: "kg",
  heightUnit: "cm",
};

export type MeasurementSystem = "metric" | "imperial";

const MEASUREMENT_SYSTEM_PREFERENCES: Record<
  MeasurementSystem,
  UnitPreference
> = {
  metric: { weightUnit: "kg", heightUnit: "cm" },
  imperial: { weightUnit: "lb", heightUnit: "ft-in" },
};

export function unitPreferenceOf(system: MeasurementSystem): UnitPreference {
  return MEASUREMENT_SYSTEM_PREFERENCES[system];
}

export function measurementSystemOf(
  preference: UnitPreference,
): MeasurementSystem {
  return preference.weightUnit === "kg" ? "metric" : "imperial";
}
