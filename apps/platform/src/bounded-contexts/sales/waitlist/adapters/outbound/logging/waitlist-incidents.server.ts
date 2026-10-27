import type { WaitlistIncidents } from "~/bounded-contexts/sales/waitlist/domain/waitlist";
import type { Logger } from "~/shared/logging/console-logger.server";

export function createWaitlistIncidents(logger: Logger): WaitlistIncidents {
  return {
    confirmationDeliveryFailed: () => {
      logger.error("Waitlist confirmation email failed.", {
        errorCategory: "waitlist_confirmation_failure",
      });
    },
    waitlistModeReadFailed: () => {
      logger.error("Waitlist mode feature flag read failed.", {
        errorCategory: "waitlist_mode_read_failure",
      });
    },
  };
}
