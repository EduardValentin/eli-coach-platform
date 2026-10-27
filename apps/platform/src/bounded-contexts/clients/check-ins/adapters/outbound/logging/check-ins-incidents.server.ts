import type { CheckInIncidents } from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { Logger } from "~/shared/logging/console-logger.server";
import {
  errorClassOf,
  errorCodeOf,
} from "~/shared/logging/error-fields.server";

export function createCheckInsIncidents(logger: Logger): CheckInIncidents {
  return {
    awaitingCheckInsCountFailed: ({ error, party }) => {
      logger.error("Check-ins awaiting an answer could not be counted.", {
        errorCategory: "check_in_awaiting_count_failure",
        errorClass: errorClassOf(error),
        party,
        ...errorCodeOf(error),
      });
    },
    awaitingCheckInsListFailed: ({ error }) => {
      logger.error("Check-ins awaiting an answer could not be listed.", {
        errorCategory: "check_in_awaiting_list_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
      });
    },
    checkInInboxFailed: ({ checkInId, event }) => {
      logger.error("Check-in notification could not be recorded in the bell.", {
        checkInId,
        errorCategory: "check_in_inbox_failure",
        event,
      });
    },
    checkInNotificationFailed: ({ checkInId, notification }) => {
      logger.error("Check-in notification failed.", {
        checkInId,
        errorCategory: "check_in_notification_failure",
        notification,
      });
    },
    checkInSeriesInboxFailed: ({ event, seriesId }) => {
      logger.error(
        "Weekly check-in notification could not be recorded in the bell.",
        {
          errorCategory: "check_in_series_inbox_failure",
          event,
          seriesId,
        },
      );
    },
    checkInSeriesNotificationFailed: ({ notification, seriesId }) => {
      logger.error("Weekly check-in notification failed.", {
        errorCategory: "check_in_series_notification_failure",
        notification,
        seriesId,
      });
    },
    checkInSeriesExtensionFailed: ({ clientId, error }) => {
      logger.error(
        "Weekly check-in could not be extended; its new weeks are missing.",
        {
          clientId,
          errorCategory: "check_in_series_extension_failure",
          errorClass: errorClassOf(error),
          ...errorCodeOf(error),
        },
      );
    },
    checkInSeriesReadFailed: ({ clientId, error }) => {
      logger.error(
        "Weekly check-in could not be read; the client record shows none.",
        {
          clientId,
          errorCategory: "check_in_series_read_failure",
          errorClass: errorClassOf(error),
          ...errorCodeOf(error),
        },
      );
    },
    nextCheckInLookupFailed: ({ error }) => {
      logger.error("The client's next check-in could not be found.", {
        errorCategory: "check_in_next_lookup_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
      });
    },
  };
}
