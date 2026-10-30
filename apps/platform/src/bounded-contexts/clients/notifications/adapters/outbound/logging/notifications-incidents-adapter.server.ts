import type {
  NotificationIncidentsPort,
  NotificationParty,
} from "~/bounded-contexts/clients/notifications/domain/notification";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import {
  errorClassOf,
  errorCodeOf,
} from "~/shared/logging/error-fields.server";

export class NotificationsIncidentsAdapter implements NotificationIncidentsPort {
  constructor(private readonly logger: LoggerPort) {}

  notificationBellReadFailed({
    error,
    party,
  }: {
    party: NotificationParty;
    error: unknown;
  }) {
    this.logger.error(
      "The notification bell could not be read; it shows no notifications.",
      {
        errorCategory: "notification_bell_read_failure",
        errorClass: errorClassOf(error),
        party,
        ...errorCodeOf(error),
      },
    );
  }
}
