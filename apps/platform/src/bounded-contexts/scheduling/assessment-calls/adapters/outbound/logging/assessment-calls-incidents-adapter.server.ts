import type { AssessmentCallIncidentsPort } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type { LoggerPort } from "~/shared/logging/logger-port.server";

export class AssessmentCallsIncidentsAdapter implements AssessmentCallIncidentsPort {
  constructor(private readonly loggerPort: LoggerPort) {}

  bookingModeReadFailed() {
    this.loggerPort.error("Assessment call booking mode read failed.", {
      errorCategory: "assessment_call_booking_mode_read_failure",
    });
  }

  callsReadFailed() {
    this.loggerPort.error("Assessment calls could not be read.", {
      errorCategory: "assessment_call_listing_failure",
    });
  }

  notificationFailed({
    recipient,
  }: Parameters<AssessmentCallIncidentsPort["notificationFailed"]>[0]) {
    this.loggerPort.error("Assessment call notification failed.", {
      errorCategory: "assessment_call_notification_failure",
      recipient,
    });
  }

  slotsReadFailed() {
    this.loggerPort.error("Assessment call slots could not be read.", {
      errorCategory: "assessment_call_slots_failure",
    });
  }
}
