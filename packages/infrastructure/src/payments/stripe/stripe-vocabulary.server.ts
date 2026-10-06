import type {
  PaymentCardChangeKind,
  PaymentInvoiceReason,
  PaymentProviderVocabulary,
  PaymentSubscriptionStanding,
} from "../payment-provider-vocabulary.server";

const ENDED_STATUSES: ReadonlySet<string> = new Set([
  "canceled",
  "incomplete_expired",
]);
const PAYMENT_PROBLEM_STATUSES: ReadonlySet<string> = new Set([
  "past_due",
  "unpaid",
]);
const HEALTHY_STATUS = "active";
const PURCHASE_BILLING_REASON = "subscription_create";
const CARD_PAYMENT_METHOD_TYPE = "card";
const CARD_CHANGES: ReadonlyMap<string, PaymentCardChangeKind> = new Map([
  ["payment_method.attached", "attached"],
  ["payment_method.automatically_updated", "updated"],
  ["payment_method.detached", "detached"],
]);

function standingOf(status: string): PaymentSubscriptionStanding {
  if (ENDED_STATUSES.has(status)) {
    return "ended";
  }

  if (PAYMENT_PROBLEM_STATUSES.has(status)) {
    return "payment-problem";
  }

  return status === HEALTHY_STATUS ? "healthy" : "other";
}

function invoiceReasonOf(billingReason: string | null): PaymentInvoiceReason {
  return billingReason === PURCHASE_BILLING_REASON ? "purchase" : "renewal";
}

function cardChangeOf(eventType: string): PaymentCardChangeKind | null {
  return CARD_CHANGES.get(eventType) ?? null;
}

function isCardPaymentMethod(paymentMethodType: string): boolean {
  return paymentMethodType === CARD_PAYMENT_METHOD_TYPE;
}

export const STRIPE_VOCABULARY: PaymentProviderVocabulary = {
  standingOf,
  invoiceReasonOf,
  cardChangeOf,
  isCardPaymentMethod,
};
