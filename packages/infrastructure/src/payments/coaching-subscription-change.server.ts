import type { SubscriptionEvent } from "@eli-coach-platform/domain/coaching-subscription";

import type {
  PaymentInvoiceOutcome,
  PaymentRefund,
  PaymentSubscriptionChange,
  PaymentSubscriptionState,
} from "./payment-subscription-change.server";

const ENDED_STATUSES: readonly string[] = ["canceled", "incomplete_expired"];
const PAYMENT_PROBLEM_STATUSES: readonly string[] = ["past_due", "unpaid"];
const HEALTHY_STATUS = "active";
const PURCHASE_BILLING_REASON = "subscription_create";

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

  if (state.endedAt && ENDED_STATUSES.includes(state.providerStatus)) {
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

  if (state.previousProviderStatus === null) {
    return null;
  }

  if (PAYMENT_PROBLEM_STATUSES.includes(state.providerStatus)) {
    return { kind: "payment-problem", paymentSubscriptionId, occurredAt };
  }

  return state.providerStatus === HEALTHY_STATUS
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

  return invoice.billingReason === PURCHASE_BILLING_REASON
    ? null
    : { kind: "renewal-paid", paymentSubscriptionId, occurredAt };
}
