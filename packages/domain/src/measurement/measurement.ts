export type MeasurementEntry = {
  recordedAt: Date;
  weightKg: number;
  waistCm: number;
  hipsCm?: number;
  thighCm?: number;
  armCm?: number;
};

export type MeasurementValues = {
  weightKg?: number;
  waistCm?: number;
  hipsCm?: number;
  thighCm?: number;
  armCm?: number;
};

export function measurementEntryOf(
  values: MeasurementValues,
  recordedAt: Date,
): MeasurementEntry | null {
  if (values.weightKg === undefined || values.waistCm === undefined)
    return null;

  const entry: MeasurementEntry = {
    recordedAt,
    weightKg: values.weightKg,
    waistCm: values.waistCm,
  };

  if (values.hipsCm !== undefined) entry.hipsCm = values.hipsCm;
  if (values.thighCm !== undefined) entry.thighCm = values.thighCm;
  if (values.armCm !== undefined) entry.armCm = values.armCm;

  return entry;
}

export function latestMeasurementOf(
  entries: readonly MeasurementEntry[],
): MeasurementEntry | null {
  return entries.reduce<MeasurementEntry | null>(
    (latest, entry) =>
      !latest || entry.recordedAt > latest.recordedAt ? entry : latest,
    null,
  );
}
