import { addDays } from 'date-fns';

export const WEIGHT_CADENCE_DAYS = 7;
export const CIRCUMFERENCE_CADENCE_DAYS = 28;

export const MEASUREMENT_CADENCE_HINT =
  'Weight: weekly. Circumferences and photos: every 4 weeks';

export const CYCLE_WINDOW_HINT = 'best taken on days 5–10 of your cycle';

export type MeasurementDueDates = {
  weight: Date;
  circumferences: Date;
};

export function measurementDueDates(latestRecordedAt: Date): MeasurementDueDates {
  return {
    weight: addDays(latestRecordedAt, WEIGHT_CADENCE_DAYS),
    circumferences: addDays(latestRecordedAt, CIRCUMFERENCE_CADENCE_DAYS),
  };
}

export function isMeasurementDue(dueOn: Date, now: Date): boolean {
  return now.getTime() >= dueOn.getTime();
}

export function measurementCadenceHint(tracksCycle: 'yes' | 'no'): string {
  return tracksCycle === 'yes'
    ? `${MEASUREMENT_CADENCE_HINT}, ${CYCLE_WINDOW_HINT}.`
    : `${MEASUREMENT_CADENCE_HINT}.`;
}
