import { z } from "zod";

import { fromUnixSeconds } from "./checkout-session-completion.server";
import { PAYMENT_PURPOSE_METADATA_KEY } from "./payment-completion-handler.server";

export type PaymentSubscriptionStanding =
  "ended" | "payment-problem" | "healthy" | "other";

export type PaymentInvoiceReason = "purchase" | "renewal";

export type PaymentProviderVocabulary = {
  standingOf: (status: string) => PaymentSubscriptionStanding;
  invoiceReasonOf: (billingReason: string | null) => PaymentInvoiceReason;
  cardChangeOf: (
    eventType: string,
  ) => "attached" | "updated" | "detached" | null;
  isCardPaymentMethod: (paymentMethodType: string) => boolean;
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
  customerId: string;
  chargeCents: number;
  refundedCents: number;
  currency: string;
  refundedAt: Date;
};

export type RoutedSubscriptionChange = {
  purpose: string | null;
  change: PaymentSubscriptionChange;
};

type ProviderEvent = {
  type: string;
  created: number;
  object: unknown;
  previousAttributes: Record<string, unknown> | null;
};

const SUBSCRIPTION_STATE_EVENTS: readonly string[] = [
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const INVOICE_OUTCOMES: Readonly<Record<string, "paid" | "failed">> = {
  "invoice.paid": "paid",
  "invoice.payment_failed": "failed",
};

const SCHEDULED_END_ATTRIBUTE = "cancel_at";
const STATUS_ATTRIBUTE = "status";

export const referencedIdSchema = z.union([
  z.string().min(1),
  z.object({ id: z.string().min(1) }).transform((resource) => resource.id),
]);

const purposeSchema = z
  .record(z.string(), z.string())
  .nullish()
  .transform((metadata) => metadata?.[PAYMENT_PURPOSE_METADATA_KEY] ?? null);

const unixSecondsSchema = z.number().int().positive();

const subscriptionSchema = z.object({
  id: z.string().min(1),
  customer: referencedIdSchema,
  status: z.string().min(1),
  cancel_at: unixSecondsSchema.nullish(),
  ended_at: unixSecondsSchema.nullish(),
  metadata: purposeSchema,
});

const invoiceSchema = z.object({
  customer: referencedIdSchema,
  billing_reason: z.string().nullish(),
  parent: z.object({
    subscription_details: z.object({
      subscription: referencedIdSchema,
      metadata: purposeSchema,
    }),
  }),
});

const chargeSchema = z.object({
  amount: z.number().int().nonnegative(),
  amount_refunded: z.number().int().positive(),
  customer: referencedIdSchema,
  currency: z.string().min(1),
});

export function readSubscriptionChange(
  event: ProviderEvent,
  vocabulary: PaymentProviderVocabulary,
): RoutedSubscriptionChange | null {
  if (SUBSCRIPTION_STATE_EVENTS.includes(event.type)) {
    return readSubscriptionState(event, vocabulary);
  }

  const outcome = INVOICE_OUTCOMES[event.type];

  return outcome ? readInvoiceOutcome({ event, outcome, vocabulary }) : null;
}

export function readPaymentRefund(
  charge: unknown,
  createdSeconds: number,
): PaymentRefund | null {
  const parsed = chargeSchema.safeParse(charge);

  if (!parsed.success) {
    return null;
  }

  return {
    kind: "charge_refund",
    customerId: parsed.data.customer,
    chargeCents: parsed.data.amount,
    refundedCents: parsed.data.amount_refunded,
    currency: parsed.data.currency,
    refundedAt: fromUnixSeconds(createdSeconds),
  };
}

function readSubscriptionState(
  event: ProviderEvent,
  vocabulary: PaymentProviderVocabulary,
): RoutedSubscriptionChange | null {
  const parsed = subscriptionSchema.safeParse(event.object);

  if (!parsed.success) {
    return null;
  }

  const subscription = parsed.data;
  const previous = event.previousAttributes ?? {};
  const previousStatus = previous[STATUS_ATTRIBUTE];

  return {
    purpose: subscription.metadata,
    change: {
      kind: "subscription_state",
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      standing: vocabulary.standingOf(subscription.status),
      previousStanding:
        typeof previousStatus === "string"
          ? vocabulary.standingOf(previousStatus)
          : null,
      scheduledEndAt: subscription.cancel_at
        ? fromUnixSeconds(subscription.cancel_at)
        : null,
      scheduledEndChanged: SCHEDULED_END_ATTRIBUTE in previous,
      endedAt: subscription.ended_at
        ? fromUnixSeconds(subscription.ended_at)
        : null,
      occurredAt: fromUnixSeconds(event.created),
    },
  };
}

function readInvoiceOutcome({
  event,
  outcome,
  vocabulary,
}: {
  event: ProviderEvent;
  outcome: "paid" | "failed";
  vocabulary: PaymentProviderVocabulary;
}): RoutedSubscriptionChange | null {
  const parsed = invoiceSchema.safeParse(event.object);

  if (!parsed.success) {
    return null;
  }

  const invoice = parsed.data;
  const details = invoice.parent.subscription_details;

  return {
    purpose: details.metadata,
    change: {
      kind: "invoice_outcome",
      subscriptionId: details.subscription,
      customerId: invoice.customer,
      outcome,
      invoiceReason: vocabulary.invoiceReasonOf(invoice.billing_reason ?? null),
      occurredAt: fromUnixSeconds(event.created),
    },
  };
}
