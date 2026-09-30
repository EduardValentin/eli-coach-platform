import { addDays } from 'date-fns';
import { hasProgressPhotos, type MeasurementEntry } from './journey';

export const WEIGH_IN_CADENCE_DAYS = 7;
export const MEASUREMENTS_CADENCE_DAYS = 28;

export type MeasurementDueLine = 'weigh-in' | 'measurements';

export type MeasurementDueDates = {
  weighIn: Date;
  measurements: Date;
};

function oldestFirst(entries: readonly MeasurementEntry[]): MeasurementEntry[] {
  return [...entries].sort(
    (first, second) => first.recordedAt.getTime() - second.recordedAt.getTime(),
  );
}

function includesMeasurements(entry: MeasurementEntry): boolean {
  return (
    entry.hipsCm !== undefined ||
    entry.thighCm !== undefined ||
    entry.armCm !== undefined ||
    hasProgressPhotos(entry)
  );
}

export function measurementDueDates(
  entries: readonly MeasurementEntry[],
): MeasurementDueDates | null {
  const history = oldestFirst(entries);
  const first = history.at(0);
  const latest = history.at(-1);
  if (!first || !latest) return null;

  const latestMeasurementsEntry =
    history.filter(includesMeasurements).at(-1) ?? first;

  return {
    weighIn: addDays(latest.recordedAt, WEIGH_IN_CADENCE_DAYS),
    measurements: addDays(
      latestMeasurementsEntry.recordedAt,
      MEASUREMENTS_CADENCE_DAYS,
    ),
  };
}

export function isMeasurementDue(dueOn: Date, now: Date): boolean {
  return now.getTime() >= dueOn.getTime();
}

export function measurementDueLine(
  entries: readonly MeasurementEntry[],
  now: Date,
): MeasurementDueLine | null {
  const due = measurementDueDates(entries);
  if (!due) return null;
  if (isMeasurementDue(due.measurements, now)) return 'measurements';
  if (isMeasurementDue(due.weighIn, now)) return 'weigh-in';

  return null;
}
