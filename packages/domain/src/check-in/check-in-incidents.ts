import type { CheckInNotification } from "./check-in-notifications";
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
}
