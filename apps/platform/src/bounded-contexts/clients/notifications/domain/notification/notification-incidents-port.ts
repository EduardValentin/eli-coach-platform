import type { NotificationParty } from "./notification-recipient";

export interface NotificationIncidentsPort {
  notificationBellReadFailed(incident: {
    party: NotificationParty;
    error: unknown;
  }): void;
}
