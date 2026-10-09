import type { CheckInNotification } from "./check-in-notifications";

export interface CheckInIncidents {
  notificationFailed(incident: {
    checkInId: string;
    notification: CheckInNotification;
  }): void;
}
