import type {
  CheckInNotification,
  CheckInSeriesNotification,
} from "./check-in-notifications-port";
import type { CheckInParty } from "./check-in-party";

export interface CheckInIncidentsPort {
  checkInNotificationFailed(incident: {
    checkInId: string;
    notification: CheckInNotification;
  }): void;
  checkInInboxFailed(incident: {
    checkInId: string;
    event: CheckInNotification;
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
  checkInSeriesInboxFailed(incident: {
    seriesId: string;
    event: CheckInSeriesNotification | "clashesAdded";
  }): void;
  checkInSeriesExtensionFailed(incident: {
    clientId: string;
    error: unknown;
  }): void;
  checkInSeriesReadFailed(incident: { clientId: string; error: unknown }): void;
}
