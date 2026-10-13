import type {
  CheckInNotification,
  CheckInSeriesNotification,
} from "./check-in-notifications";
import type { CheckInParty } from "./check-in-party";

export interface CheckInIncidents {
  checkInNotificationFailed(incident: {
    checkInId: string;
    notification: CheckInNotification;
  }): void;
  awaitingCheckInsCountFailed(incident: {
    party: CheckInParty;
    error: unknown;
  }): void;
  awaitingCheckInsListFailed(incident: { error: unknown }): void;
  nextCheckInLookupFailed(incident: { error: unknown }): void;
  checkInSeriesNotificationFailed(incident: {
    seriesId: string;
    notification: CheckInSeriesNotification;
  }): void;
  checkInSeriesExtensionFailed(incident: {
    clientId: string;
    error: unknown;
  }): void;
}
