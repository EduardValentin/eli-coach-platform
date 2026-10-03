import type { SubscriptionEvent } from "@eli-coach-platform/domain/coaching-subscription";

import type {
  PaymentInvoiceOutcome,
  PaymentRefund,
  PaymentSubscriptionChange,
  PaymentSubscriptionState,
} from "./payment-subscription-change.server";

export function toSubscriptionEvent(
  change: PaymentSubscriptionChange | PaymentRefund,
): SubscriptionEvent | null {
  switch (change.kind) {
    case "subscription_state":
      return fromSubscriptionState(change);
    case "invoice_outcome":
      return fromInvoiceOutcome(change);
    case "charge_refund":
      return {
        kind: "charge-refunded",
        paymentCustomerId: change.customerId,
        refundedCents: change.refundedCents,
        occurredAt: change.refundedAt,
      };
  }
}

function fromSubscriptionState(
  state: PaymentSubscriptionState,
): SubscriptionEvent | null {
  const paymentSubscriptionId = state.subscriptionId;
  const occurredAt = state.occurredAt;

  if (state.endedAt && state.standing === "ended") {
    return { kind: "ended", paymentSubscriptionId, endedAt: state.endedAt };
  }

  if (state.scheduledEndChanged) {
    return state.scheduledEndAt
      ? {
          kind: "end-scheduled",
          paymentSubscriptionId,
          endsAt: state.scheduledEndAt,
          occurredAt,
        }
      : { kind: "end-lifted", paymentSubscriptionId, occurredAt };
  }

  if (state.previousStanding === null) {
    return null;
  }

  if (state.standing === "payment-problem") {
    return { kind: "payment-problem", paymentSubscriptionId, occurredAt };
  }

  return state.standing === "healthy"
    ? { kind: "payment-recovered", paymentSubscriptionId, occurredAt }
    : null;
}

function fromInvoiceOutcome(
  invoice: PaymentInvoiceOutcome,
): SubscriptionEvent | null {
  const paymentSubscriptionId = invoice.subscriptionId;
  const occurredAt = invoice.occurredAt;

  if (invoice.outcome === "failed") {
    return { kind: "payment-problem", paymentSubscriptionId, occurredAt };
  }

  return invoice.invoiceReason === "purchase"
    ? null
    : { kind: "renewal-paid", paymentSubscriptionId, occurredAt };
}
