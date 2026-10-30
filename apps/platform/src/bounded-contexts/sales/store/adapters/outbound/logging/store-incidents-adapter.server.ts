import type { AcquisitionIncidentsPort } from "~/bounded-contexts/sales/store/domain/acquisition";
import type { LoggerPort } from "~/shared/logging/logger-port.server";

export class StoreIncidentsAdapter implements AcquisitionIncidentsPort {
  constructor(private readonly logger: LoggerPort) {}

  deliveryAcceptanceAuditPending({
    requestId,
  }: Parameters<
    AcquisitionIncidentsPort["deliveryAcceptanceAuditPending"]
  >[0]) {
    this.logger.error(
      "Store delivery acceptance audit requires reconciliation.",
      {
        errorCategory: "store_delivery_acceptance_audit_pending",
        requestId,
      },
    );
  }

  deliveryRejected({
    reason,
    requestId,
  }: Parameters<AcquisitionIncidentsPort["deliveryRejected"]>[0]) {
    this.logger.error("Store delivery provider rejected the request.", {
      errorCategory: "store_delivery_rejected",
      providerRejectionReason: reason,
      requestId,
    });
  }

  retryableDeliveryAuditPending({
    requestId,
  }: Parameters<AcquisitionIncidentsPort["retryableDeliveryAuditPending"]>[0]) {
    this.logger.error(
      "Store retryable delivery audit requires reconciliation.",
      {
        errorCategory: "store_delivery_retryable_audit_pending",
        requestId,
      },
    );
  }
}
