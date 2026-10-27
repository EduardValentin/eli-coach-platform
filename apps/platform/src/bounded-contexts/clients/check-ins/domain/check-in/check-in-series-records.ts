import type { CheckIn } from "./check-in";
import type { CheckInSeries, CheckInSeriesSnapshot } from "./check-in-series";
import type { HeldCheckIn } from "./check-ins";

export type CheckInSeriesChange =
  | { status: "changed"; cancelledIds: string[]; freedReservationIds: string[] }
  | { status: "changed_meanwhile" };

export type CheckInSeriesStop =
  | { status: "stopped"; cancelledIds: string[]; freedReservationIds: string[] }
  | { status: "changed_meanwhile" };

export interface CheckInSeriesRecords {
  find(id: string): Promise<CheckInSeries | null>;
  findActiveForClient(clientId: string): Promise<CheckInSeries | null>;
  listOccurrences(seriesId: string): Promise<CheckIn[]>;
  start(series: CheckInSeries): Promise<"started" | "series_exists">;
  widen(command: {
    series: CheckInSeries;
    expected: { coversFrom: Date; coversUntil: Date };
  }): Promise<"widened" | "changed_meanwhile">;
  change(command: {
    series: CheckInSeries;
    expected: Pick<CheckInSeriesSnapshot, "changedAt" | "weekday" | "hour">;
    startsFrom: Date;
    at: Date;
  }): Promise<CheckInSeriesChange>;
  stop(command: {
    seriesId: string;
    expected: Pick<CheckInSeriesSnapshot, "changedAt">;
    at: Date;
  }): Promise<CheckInSeriesStop>;
  recordWeeks(weeks: readonly HeldCheckIn[]): Promise<void>;
}
