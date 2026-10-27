import type { NotificationParty } from "./notification-recipient";

export interface NotificationIncidents {
  notificationBellReadFailed(incident: {
    party: NotificationParty;
    error: unknown;
  }): void;
}
