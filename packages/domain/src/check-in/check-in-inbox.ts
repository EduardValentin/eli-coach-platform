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
}
