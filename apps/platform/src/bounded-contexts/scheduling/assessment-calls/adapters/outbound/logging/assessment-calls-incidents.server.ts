import type { AssessmentCallIncidents } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type { Logger } from "~/shared/logging/console-logger.server";

export function createAssessmentCallsIncidents(
  logger: Logger,
): AssessmentCallIncidents {
  return {
    bookingModeReadFailed: () => {
      logger.error("Assessment call booking mode read failed.", {
        errorCategory: "assessment_call_booking_mode_read_failure",
      });
    },
    callsReadFailed: () => {
      logger.error("Assessment calls could not be read.", {
        errorCategory: "assessment_call_listing_failure",
      });
    },
    notificationFailed: ({ recipient }) => {
      logger.error("Assessment call notification failed.", {
        errorCategory: "assessment_call_notification_failure",
        recipient,
      });
    },
    slotsReadFailed: () => {
      logger.error("Assessment call slots could not be read.", {
        errorCategory: "assessment_call_slots_failure",
      });
    },
  };
}
