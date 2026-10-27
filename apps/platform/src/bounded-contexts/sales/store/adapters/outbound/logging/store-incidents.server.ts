import type { AcquisitionIncidents } from "~/bounded-contexts/sales/store/domain/acquisition";
import type { Logger } from "~/shared/logging/console-logger.server";

export function createStoreIncidents(logger: Logger): AcquisitionIncidents {
  return {
    deliveryAcceptanceAuditPending: ({ requestId }) => {
      logger.error("Store delivery acceptance audit requires reconciliation.", {
        errorCategory: "store_delivery_acceptance_audit_pending",
        requestId,
      });
    },
    deliveryRejected: ({ reason, requestId }) => {
      logger.error("Store delivery provider rejected the request.", {
        errorCategory: "store_delivery_rejected",
        providerRejectionReason: reason,
        requestId,
      });
    },
    retryableDeliveryAuditPending: ({ requestId }) => {
      logger.error("Store retryable delivery audit requires reconciliation.", {
        errorCategory: "store_delivery_retryable_audit_pending",
        requestId,
      });
    },
  };
}
