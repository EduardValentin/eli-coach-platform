import type { CheckInLapseSnapshot, CheckInSnapshot } from "./check-in";
import type { CheckInSeriesSnapshot } from "./check-in-series";
import type {
  CheckInNotice,
  CheckInNotification,
  CheckInSeriesNotice,
  CheckInSeriesNotification,
} from "./check-in-notifications";

export type CheckInSeriesInboxNotice = CheckInSeriesNotice & {
  firstWeekId: string | null;
};

export type CheckInClashesNotice = {
  series: CheckInSeriesSnapshot;
  client: CheckInNotice["client"];
  clashes: number;
  earliest: { id: string; startsAt: Date };
};

export type CheckInExpiry = {
  checkIn: CheckInSnapshot;
  lapse: CheckInLapseSnapshot;
  client: CheckInNotice["client"];
};

export type CheckInExpiryChange = {
  withdrawn: readonly string[];
  upcoming: readonly CheckInExpiry[];
};

export interface CheckInInbox {
  checkInEvent(
    event: CheckInNotification,
    notice: CheckInNotice,
  ): Promise<void>;
  seriesEvent(
    event: CheckInSeriesNotification,
    notice: CheckInSeriesInboxNotice,
  ): Promise<void>;
  clashesAdded(notice: CheckInClashesNotice): Promise<void>;
  scheduleExpiries(change: CheckInExpiryChange): Promise<void>;
}
