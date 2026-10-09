import type { CheckInNotification } from "./check-in-notifications";

export interface CheckInIncidents {
  checkInNotificationFailed(incident: {
    checkInId: string;
    notification: CheckInNotification;
  }): void;
}
