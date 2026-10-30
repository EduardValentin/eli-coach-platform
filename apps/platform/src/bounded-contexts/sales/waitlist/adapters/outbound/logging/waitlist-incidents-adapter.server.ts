import type { WaitlistIncidentsPort } from "~/bounded-contexts/sales/waitlist/domain/waitlist";
import type { LoggerPort } from "~/shared/logging/logger-port.server";

export class WaitlistIncidentsAdapter implements WaitlistIncidentsPort {
  constructor(private readonly logger: LoggerPort) {}

  confirmationDeliveryFailed() {
    this.logger.error("Waitlist confirmation email failed.", {
      errorCategory: "waitlist_confirmation_failure",
    });
  }

  waitlistModeReadFailed() {
    this.logger.error("Waitlist mode feature flag read failed.", {
      errorCategory: "waitlist_mode_read_failure",
    });
  }
}
