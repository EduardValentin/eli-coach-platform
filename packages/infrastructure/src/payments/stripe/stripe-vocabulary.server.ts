import type {
  PaymentInvoiceReason,
  PaymentProviderVocabulary,
  PaymentSubscriptionStanding,
} from "../payment-subscription-change.server";

const ENDED_STATUSES: readonly string[] = ["canceled", "incomplete_expired"];
const PAYMENT_PROBLEM_STATUSES: readonly string[] = ["past_due", "unpaid"];
const HEALTHY_STATUS = "active";
const PURCHASE_BILLING_REASON = "subscription_create";

function standingOf(status: string): PaymentSubscriptionStanding {
  if (ENDED_STATUSES.includes(status)) {
    return "ended";
  }

  if (PAYMENT_PROBLEM_STATUSES.includes(status)) {
    return "payment-problem";
  }

  return status === HEALTHY_STATUS ? "healthy" : "other";
}

function invoiceReasonOf(billingReason: string | null): PaymentInvoiceReason {
  return billingReason === PURCHASE_BILLING_REASON ? "purchase" : "renewal";
}

export const STRIPE_VOCABULARY: PaymentProviderVocabulary = {
  standingOf,
  invoiceReasonOf,
};
