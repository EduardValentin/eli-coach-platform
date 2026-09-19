import type { AcquisitionIncidents } from "@eli-coach-platform/domain/acquisition";
import type { AssessmentCallIncidents } from "@eli-coach-platform/domain/assessment-call";
import type { WaitlistIncidents } from "@eli-coach-platform/domain/waitlist";

type ConsoleLogger = AcquisitionIncidents &
  AssessmentCallIncidents &
  WaitlistIncidents;

export function createConsoleLogger(): ConsoleLogger {
  return {
    bookingModeReadFailed: () => {
      console.error("Assessment call booking mode read failed.", {
        errorCategory: "assessment_call_booking_mode_read_failure",
      });
    },
    confirmationDeliveryFailed: () => {
      console.error("Waitlist confirmation email failed.", {
        errorCategory: "waitlist_confirmation_failure",
      });
    },
    deliveryAcceptanceAuditPending: ({ requestId }) => {
      console.error(
        "Store delivery acceptance audit requires reconciliation.",
        {
          errorCategory: "store_delivery_acceptance_audit_pending",
          requestId,
        },
      );
    },
    deliveryRejected: ({ reason, requestId }) => {
      console.error("Store delivery provider rejected the request.", {
        errorCategory: "store_delivery_rejected",
        providerRejectionReason: reason,
        requestId,
      });
    },
    notificationFailed: ({ recipient }) => {
      console.error("Assessment call notification failed.", {
        errorCategory: "assessment_call_notification_failure",
        recipient,
      });
    },
    retryableDeliveryAuditPending: ({ requestId }) => {
      console.error("Store retryable delivery audit requires reconciliation.", {
        errorCategory: "store_delivery_retryable_audit_pending",
        requestId,
      });
    },
    slotsReadFailed: () => {
      console.error("Assessment call slots could not be read.", {
        errorCategory: "assessment_call_slots_failure",
      });
    },
    waitlistModeReadFailed: () => {
      console.error("Waitlist mode feature flag read failed.", {
        errorCategory: "waitlist_mode_read_failure",
      });
    },
  };
}
