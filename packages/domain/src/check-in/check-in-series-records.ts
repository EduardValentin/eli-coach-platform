import type { CheckIn } from "./check-in";
import type {
  CheckInSeries,
  CheckInSeriesOccurrence,
  CheckInSeriesSnapshot,
} from "./check-in-series";

export type CheckInSeriesSetUpResult =
  { status: "set_up"; occurrences: CheckIn[] } | { status: "series_exists" };

export type CheckInSeriesExtension =
  | { status: "extended"; occurrences: CheckIn[] }
  | { status: "changed_meanwhile" };

export type CheckInSeriesChangeResult =
  | { status: "changed"; occurrences: CheckIn[] }
  | { status: "changed_meanwhile" };

export interface CheckInSeriesRecords {
  find(id: string): Promise<CheckInSeries | null>;
  findActiveForClient(clientId: string): Promise<CheckInSeries | null>;
  listOccurrences(seriesId: string): Promise<CheckIn[]>;
  setUp(command: {
    series: CheckInSeries;
    occurrences: readonly CheckInSeriesOccurrence[];
    at: Date;
  }): Promise<CheckInSeriesSetUpResult>;
  extend(command: {
    series: CheckInSeries;
    expected: { coversFrom: Date; coversUntil: Date };
    occurrences: readonly CheckInSeriesOccurrence[];
    at: Date;
  }): Promise<CheckInSeriesExtension>;
  change(command: {
    series: CheckInSeries;
    expected: Pick<CheckInSeriesSnapshot, "changedAt" | "weekday" | "hour">;
    startsFrom: Date;
    occurrences: readonly CheckInSeriesOccurrence[];
    at: Date;
  }): Promise<CheckInSeriesChangeResult>;
  stop(command: {
    seriesId: string;
    expected: Pick<CheckInSeriesSnapshot, "changedAt">;
    at: Date;
  }): Promise<"stopped" | "changed_meanwhile">;
}
