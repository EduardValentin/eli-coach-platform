import type { NotificationIncidents } from "~/bounded-contexts/clients/notifications/domain/notification";
import type { Logger } from "~/shared/logging/console-logger.server";
import {
  errorClassOf,
  errorCodeOf,
} from "~/shared/logging/error-fields.server";

export function createNotificationsIncidents(
  logger: Logger,
): NotificationIncidents {
  return {
    notificationBellReadFailed: ({ error, party }) => {
      logger.error(
        "The notification bell could not be read; it shows no notifications.",
        {
          errorCategory: "notification_bell_read_failure",
          errorClass: errorClassOf(error),
          party,
          ...errorCodeOf(error),
        },
      );
    },
  };
}
