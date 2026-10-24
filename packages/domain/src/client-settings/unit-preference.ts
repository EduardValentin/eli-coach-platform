export const WEIGHT_UNITS = ["kg", "lb"] as const;

export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const HEIGHT_UNITS = ["cm", "ft-in"] as const;

export type HeightUnit = (typeof HEIGHT_UNITS)[number];

export type MeasurementSystem = "metric" | "imperial";

export type UnitPreferenceSnapshot = {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
};

const MEASUREMENT_SYSTEM_UNITS: Record<
  MeasurementSystem,
  UnitPreferenceSnapshot
> = {
  metric: { weightUnit: "kg", heightUnit: "cm" },
  imperial: { weightUnit: "lb", heightUnit: "ft-in" },
};

export class UnitPreference {
  private constructor(
    readonly weightUnit: WeightUnit,
    readonly heightUnit: HeightUnit,
  ) {}

  static of(system: MeasurementSystem): UnitPreference {
    return UnitPreference.from(MEASUREMENT_SYSTEM_UNITS[system]);
  }

  static from(snapshot: UnitPreferenceSnapshot): UnitPreference {
    return new UnitPreference(snapshot.weightUnit, snapshot.heightUnit);
  }

  static metric(): UnitPreference {
    return UnitPreference.of("metric");
  }

  measurementSystem(): MeasurementSystem {
    return this.weightUnit === "kg" ? "metric" : "imperial";
  }

  toSnapshot(): UnitPreferenceSnapshot {
    return { weightUnit: this.weightUnit, heightUnit: this.heightUnit };
  }
}
