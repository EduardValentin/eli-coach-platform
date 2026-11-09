import type { AcquisitionIncidentsPort } from "~/bounded-contexts/sales/store/domain/acquisition";
import type { OrderIncidentsPort } from "~/bounded-contexts/sales/store/domain/order";
import type { LoggerPort } from "~/shared/logging/logger-port.server";

export class StoreIncidentsAdapter
  implements AcquisitionIncidentsPort, OrderIncidentsPort
{
  constructor(private readonly loggerPort: LoggerPort) {}

  deliveryAcceptanceAuditPending({
    requestId,
  }: Parameters<
    AcquisitionIncidentsPort["deliveryAcceptanceAuditPending"]
  >[0]) {
    this.loggerPort.error(
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
    this.loggerPort.error("Store delivery provider rejected the request.", {
      errorCategory: "store_delivery_rejected",
      providerRejectionReason: reason,
      requestId,
    });
  }

  retryableDeliveryAuditPending({
    requestId,
  }: Parameters<AcquisitionIncidentsPort["retryableDeliveryAuditPending"]>[0]) {
    this.loggerPort.error(
      "Store retryable delivery audit requires reconciliation.",
      {
        errorCategory: "store_delivery_retryable_audit_pending",
        requestId,
      },
    );
  }

  paymentAmountMismatch(
    incident: Parameters<OrderIncidentsPort["paymentAmountMismatch"]>[0],
  ) {
    this.loggerPort.error(
      "Store order was charged an amount other than its total.",
      { errorCategory: "store_order_amount_mismatch", ...incident },
    );
  }

  paidOrderUnknown(
    incident: Parameters<OrderIncidentsPort["paidOrderUnknown"]>[0],
  ) {
    this.loggerPort.error(
      "Store payment names an order the store does not hold.",
      { errorCategory: "store_order_unknown", ...incident },
    );
  }

  paidSessionMismatch(
    incident: Parameters<OrderIncidentsPort["paidSessionMismatch"]>[0],
  ) {
    this.loggerPort.error(
      "Store payment names a checkout session other than its order's.",
      { errorCategory: "store_order_session_mismatch", ...incident },
    );
  }

  orderEmailRejected({
    orderId,
    reason,
  }: Parameters<OrderIncidentsPort["orderEmailRejected"]>[0]) {
    this.loggerPort.error("Store order email was rejected by the provider.", {
      errorCategory: "store_order_email_rejected",
      orderId,
      providerRejectionReason: reason,
    });
  }

  orderEmailAuditPending({
    orderId,
  }: Parameters<OrderIncidentsPort["orderEmailAuditPending"]>[0]) {
    this.loggerPort.error(
      "Store order email acceptance audit requires reconciliation.",
      { errorCategory: "store_order_email_audit_pending", orderId },
    );
  }

  orderLinkRotationPending({
    orderId,
  }: Parameters<OrderIncidentsPort["orderLinkRotationPending"]>[0]) {
    this.loggerPort.error(
      "Store order resent a download link its grant does not hold yet.",
      { errorCategory: "store_order_link_rotation_pending", orderId },
    );
  }

  termsDocumentMissing(
    incident: Parameters<OrderIncidentsPort["termsDocumentMissing"]>[0],
  ) {
    this.loggerPort.error(
      "Store order email cannot attach the Terms she accepted.",
      { errorCategory: "store_order_terms_document_missing", ...incident },
    );
  }
}
