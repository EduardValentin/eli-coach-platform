import type { MeasurementEntry } from "../measurement";

import type { ProgressPhotoSnapshot } from "./progress-photo";

export type MeasurementRecord = MeasurementEntry & {
  id: string;
  photos: ProgressPhotoSnapshot[];
};

export type MeasurementDueLine = "weigh-in" | "measurements";

export type MeasurementHistorySnapshot = { records: MeasurementRecord[] };

export const WEIGH_IN_CADENCE_DAYS = 7;

export const MEASUREMENTS_CADENCE_DAYS = 28;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function isFullSet(record: MeasurementRecord): boolean {
  return (
    record.hipsCm !== undefined ||
    record.thighCm !== undefined ||
    record.armCm !== undefined ||
    record.photos.length > 0
  );
}

function isDue(since: Date, cadenceDays: number, now: Date): boolean {
  return now.getTime() >= since.getTime() + cadenceDays * MILLISECONDS_PER_DAY;
}

export class MeasurementHistory {
  private constructor(private readonly records: readonly MeasurementRecord[]) {}

  static of(records: readonly MeasurementRecord[]): MeasurementHistory {
    return new MeasurementHistory(
      [...records].sort(
        (first, second) =>
          second.recordedAt.getTime() - first.recordedAt.getTime(),
      ),
    );
  }

  newestFirst(): MeasurementRecord[] {
    return [...this.records];
  }

  latest(): MeasurementRecord | null {
    return this.records[0] ?? null;
  }

  dueLine(now: Date): MeasurementDueLine | null {
    const latest = this.latest();
    if (!latest) return null;

    const earliest = this.records[this.records.length - 1] ?? latest;
    const latestFullSet = this.records.find(isFullSet) ?? earliest;

    if (isDue(latestFullSet.recordedAt, MEASUREMENTS_CADENCE_DAYS, now))
      return "measurements";
    if (isDue(latest.recordedAt, WEIGH_IN_CADENCE_DAYS, now)) return "weigh-in";

    return null;
  }

  toSnapshot(): MeasurementHistorySnapshot {
    return { records: this.newestFirst() };
  }
}
