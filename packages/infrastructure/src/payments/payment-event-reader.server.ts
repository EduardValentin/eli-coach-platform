import { z } from "zod";

import { PAYMENT_PURPOSE_METADATA_KEY } from "./payment-completion-handler.server";
import type {
  PaidCheckoutSession,
  PaymentCardDetails,
  PaymentEventVerdict,
} from "./payment-event-types.server";
import {
  referencedIdSchema,
  type PaymentProviderVocabulary,
} from "./payment-provider-vocabulary.server";

type PaymentEvent = z.infer<typeof paymentEventSchema>;

const MILLISECONDS_PER_SECOND = 1000;
const MONTHS_PER_YEAR = 12;
const PAID_INVOICE_PAYMENT = "paid";
const CHECKOUT_COMPLETED_EVENT = "checkout.session.completed";
const CHARGE_REFUNDED_EVENT = "charge.refunded";
const SCHEDULED_END_ATTRIBUTE = "cancel_at";
const STATUS_ATTRIBUTE = "status";
const CUSTOMER_ATTRIBUTE = "customer";

const SUBSCRIPTION_STATE_EVENTS: ReadonlySet<string> = new Set([
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

const INVOICE_OUTCOMES: ReadonlyMap<string, "paid" | "failed"> = new Map([
  ["invoice.paid", "paid"],
  ["invoice.payment_failed", "failed"],
]);

const IGNORED: PaymentEventVerdict = { kind: "ignored" };

const paymentEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  created: z.number().int().positive(),
  data: z.object({
    object: z.unknown(),
    previous_attributes: z.record(z.string(), z.unknown()).nullish(),
  }),
});

const optionalReferencedIdSchema = referencedIdSchema
  .nullish()
  .transform((id) => id ?? null);

const paidCheckoutSessionSchema = z.object({
  id: z.string().min(1),
  status: z.literal("complete"),
  payment_status: z.literal("paid"),
  customer: optionalReferencedIdSchema,
  subscription: optionalReferencedIdSchema,
  payment_intent: optionalReferencedIdSchema,
  invoice: z.unknown(),
  amount_total: z.number().int().nonnegative(),
  currency: z.string().min(1),
  customer_details: z.object({ email: z.string().min(1) }),
  metadata: z.record(z.string(), z.string()),
});

const expandedInvoicePaymentsSchema = z.object({
  payments: z.object({
    data: z.array(
      z.object({
        status: z.string(),
        payment: z.object({ payment_intent: optionalReferencedIdSchema }),
      }),
    ),
  }),
});

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
  payment_intent: referencedIdSchema,
  currency: z.string().min(1),
});

const cardSchema = z.object({
  brand: z.string().min(1),
  last4: z.string().regex(/^\d{4}$/),
  exp_month: z.number().int().min(1).max(MONTHS_PER_YEAR),
  exp_year: z.number().int().positive(),
});

const paymentMethodSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  customer: referencedIdSchema.nullish(),
  card: cardSchema.nullish(),
});

export class PaymentEventReader {
  constructor(private readonly vocabulary: PaymentProviderVocabulary) {}

  read(event: unknown): PaymentEventVerdict {
    const parsed = paymentEventSchema.safeParse(event);

    if (!parsed.success) {
      return { kind: "invalid" };
    }

    switch (parsed.data.type) {
      case CHECKOUT_COMPLETED_EVENT:
        return this.readCheckoutCompleted(parsed.data);
      case CHARGE_REFUNDED_EVENT:
        return this.readChargeRefunded(parsed.data);
      default:
        return this.vocabulary.cardChangeOf(parsed.data.type)
          ? this.readPaymentMethodChanged(parsed.data)
          : this.readSubscriptionChanged(parsed.data);
    }
  }

  private readCheckoutCompleted(event: PaymentEvent): PaymentEventVerdict {
    const session = readPaidCheckoutSession(event.data.object, event.created);

    return session
      ? { kind: "checkout_completed", eventId: event.id, session }
      : IGNORED;
  }

  private readChargeRefunded(event: PaymentEvent): PaymentEventVerdict {
    const parsed = chargeSchema.safeParse(event.data.object);

    if (!parsed.success) {
      return IGNORED;
    }

    return {
      kind: "charge_refunded",
      eventId: event.id,
      refund: {
        kind: "charge_refund",
        paymentIntentId: parsed.data.payment_intent,
        chargeCents: parsed.data.amount,
        refundedCents: parsed.data.amount_refunded,
        currency: parsed.data.currency,
        refundedAt: fromUnixSeconds(event.created),
      },
    };
  }

  private readPaymentMethodChanged(event: PaymentEvent): PaymentEventVerdict {
    const kind = this.vocabulary.cardChangeOf(event.type);
    const details = readCardDetails(event.data.object, this.vocabulary);
    const customerId = this.ownerOf(event);

    if (!kind || !details || !customerId) {
      return IGNORED;
    }

    return {
      kind: "payment_method_changed",
      eventId: event.id,
      change: { kind, customerId, ...details },
    };
  }

  private readSubscriptionChanged(event: PaymentEvent): PaymentEventVerdict {
    if (SUBSCRIPTION_STATE_EVENTS.has(event.type)) {
      return this.readSubscriptionState(event);
    }

    const outcome = INVOICE_OUTCOMES.get(event.type);

    return outcome ? this.readInvoiceOutcome(event, outcome) : IGNORED;
  }

  private readSubscriptionState(event: PaymentEvent): PaymentEventVerdict {
    const parsed = subscriptionSchema.safeParse(event.data.object);

    if (!parsed.success) {
      return IGNORED;
    }

    const subscription = parsed.data;
    const previous = event.data.previous_attributes ?? {};
    const previousStatus = previous[STATUS_ATTRIBUTE];

    return {
      kind: "subscription_changed",
      eventId: event.id,
      purpose: subscription.metadata,
      change: {
        kind: "subscription_state",
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        standing: this.vocabulary.standingOf(subscription.status),
        previousStanding:
          typeof previousStatus === "string"
            ? this.vocabulary.standingOf(previousStatus)
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

  private readInvoiceOutcome(
    event: PaymentEvent,
    outcome: "paid" | "failed",
  ): PaymentEventVerdict {
    const parsed = invoiceSchema.safeParse(event.data.object);

    if (!parsed.success) {
      return IGNORED;
    }

    const invoice = parsed.data;
    const details = invoice.parent.subscription_details;

    return {
      kind: "subscription_changed",
      eventId: event.id,
      purpose: details.metadata,
      change: {
        kind: "invoice_outcome",
        subscriptionId: details.subscription,
        customerId: invoice.customer,
        outcome,
        invoiceReason: this.vocabulary.invoiceReasonOf(
          invoice.billing_reason ?? null,
        ),
        occurredAt: fromUnixSeconds(event.created),
      },
    };
  }

  private ownerOf(event: PaymentEvent): string | null {
    const customer = paymentMethodSchema.safeParse(event.data.object).data
      ?.customer;
    const formerCustomer = referencedIdSchema.safeParse(
      event.data.previous_attributes?.[CUSTOMER_ATTRIBUTE],
    ).data;

    return customer ?? formerCustomer ?? null;
  }
}

export function readPaidCheckoutSession(
  session: unknown,
  paidAtSeconds: number,
): PaidCheckoutSession | null {
  const parsed = paidCheckoutSessionSchema.safeParse(session);

  if (!parsed.success) {
    return null;
  }

  const paid = parsed.data;

  return {
    id: paid.id,
    customerId: paid.customer,
    subscriptionId: paid.subscription,
    paymentIntentId:
      paid.payment_intent ?? paidInvoicePaymentIntentOf(paid.invoice),
    amountCents: paid.amount_total,
    currency: paid.currency,
    customerEmail: paid.customer_details.email,
    paidAt: fromUnixSeconds(paidAtSeconds),
    metadata: paid.metadata,
  };
}

export function readCardDetails(
  paymentMethod: unknown,
  vocabulary: PaymentProviderVocabulary,
): PaymentCardDetails | null {
  const parsed = paymentMethodSchema.safeParse(paymentMethod);

  if (!parsed.success || !vocabulary.isCardPaymentMethod(parsed.data.type)) {
    return null;
  }

  const { card, id } = parsed.data;

  return card
    ? {
        paymentMethodId: id,
        brand: card.brand,
        lastFour: card.last4,
        expiryMonth: card.exp_month,
        expiryYear: card.exp_year,
      }
    : null;
}

function paidInvoicePaymentIntentOf(invoice: unknown): string | null {
  const expanded = expandedInvoicePaymentsSchema.safeParse(invoice);

  if (!expanded.success) {
    return null;
  }

  const paid = expanded.data.payments.data.find(
    (payment) => payment.status === PAID_INVOICE_PAYMENT,
  );

  return paid?.payment.payment_intent ?? null;
}

function fromUnixSeconds(seconds: number): Date {
  return new Date(seconds * MILLISECONDS_PER_SECOND);
}
