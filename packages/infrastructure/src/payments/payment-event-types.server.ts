import type {
  PaymentCardChangeKind,
  PaymentInvoiceReason,
  PaymentSubscriptionStanding,
} from "./payment-provider-vocabulary.server";

export type PaidCheckoutSession = {
  id: string;
  customerId: string | null;
  subscriptionId: string | null;
  paymentIntentId: string | null;
  amountCents: number;
  currency: string;
  customerEmail: string;
  paidAt: Date;
  metadata: Record<string, string>;
};

export type PaymentSubscriptionState = {
  kind: "subscription_state";
  subscriptionId: string;
  customerId: string;
  standing: PaymentSubscriptionStanding;
  previousStanding: PaymentSubscriptionStanding | null;
  scheduledEndAt: Date | null;
  scheduledEndChanged: boolean;
  endedAt: Date | null;
  occurredAt: Date;
};

export type PaymentInvoiceOutcome = {
  kind: "invoice_outcome";
  subscriptionId: string;
  customerId: string;
  outcome: "paid" | "failed";
  invoiceReason: PaymentInvoiceReason;
  occurredAt: Date;
};

export type PaymentSubscriptionChange =
  PaymentSubscriptionState | PaymentInvoiceOutcome;

export type PaymentRefund = {
  kind: "charge_refund";
  paymentIntentId: string;
  chargeCents: number;
  refundedCents: number;
  currency: string;
  refundedAt: Date;
};

export type PaymentCardDetails = {
  paymentMethodId: string;
  brand: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
};

export type PaymentCardChange = PaymentCardDetails & {
  kind: PaymentCardChangeKind;
  customerId: string;
};

export type PaymentEventVerdict =
  | {
      kind: "checkout_completed";
      eventId: string;
      session: PaidCheckoutSession;
    }
  | {
      kind: "subscription_changed";
      eventId: string;
      purpose: string | null;
      change: PaymentSubscriptionChange;
    }
  | { kind: "charge_refunded"; eventId: string; refund: PaymentRefund }
  | {
      kind: "payment_method_changed";
      eventId: string;
      change: PaymentCardChange;
    }
  | { kind: "ignored" }
  | { kind: "invalid" };
