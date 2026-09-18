import type { AcquisitionIncidents } from "@eli-coach-platform/domain/acquisition";
import type { WaitlistIncidents } from "@eli-coach-platform/domain/waitlist";

type ConsoleLogger = AcquisitionIncidents & WaitlistIncidents;

export function createConsoleLogger(): ConsoleLogger {
  return {
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
    retryableDeliveryAuditPending: ({ requestId }) => {
      console.error("Store retryable delivery audit requires reconciliation.", {
        errorCategory: "store_delivery_retryable_audit_pending",
        requestId,
      });
    },
  };
}
