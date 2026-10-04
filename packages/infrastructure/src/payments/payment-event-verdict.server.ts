import { z } from "zod";

import {
  fromUnixSeconds,
  readPaidCheckoutSession,
  type PaidCheckoutSession,
} from "./checkout-session-completion.server";
import {
  readPaymentCardChange,
  type PaymentCardChange,
} from "./payment-card-change.server";
import {
  readPaymentRefund,
  readSubscriptionChange,
  type PaymentProviderVocabulary,
  type PaymentRefund,
  type PaymentSubscriptionChange,
} from "./payment-subscription-change.server";

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

type PaymentEvent = z.infer<typeof paymentEventSchema>;

const CHECKOUT_COMPLETED_EVENT = "checkout.session.completed";
const CHARGE_REFUNDED_EVENT = "charge.refunded";

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

export function readPaymentEvent(
  event: unknown,
  vocabulary: PaymentProviderVocabulary,
): PaymentEventVerdict {
  const parsed = paymentEventSchema.safeParse(event);

  if (!parsed.success) {
    return { kind: "invalid" };
  }

  switch (parsed.data.type) {
    case CHECKOUT_COMPLETED_EVENT:
      return readCheckoutCompleted(parsed.data);
    case CHARGE_REFUNDED_EVENT:
      return readChargeRefunded(parsed.data);
    default:
      return vocabulary.cardChangeOf(parsed.data.type)
        ? readPaymentMethodChanged(parsed.data, vocabulary)
        : readSubscriptionChanged(parsed.data, vocabulary);
  }
}

function readCheckoutCompleted(event: PaymentEvent): PaymentEventVerdict {
  const session = readPaidCheckoutSession(
    event.data.object,
    fromUnixSeconds(event.created),
  );

  return session
    ? { kind: "checkout_completed", eventId: event.id, session }
    : IGNORED;
}

function readChargeRefunded(event: PaymentEvent): PaymentEventVerdict {
  const refund = readPaymentRefund(event.data.object, event.created);

  return refund
    ? { kind: "charge_refunded", eventId: event.id, refund }
    : IGNORED;
}

function readPaymentMethodChanged(
  event: PaymentEvent,
  vocabulary: PaymentProviderVocabulary,
): PaymentEventVerdict {
  const change = readPaymentCardChange(
    {
      type: event.type,
      object: event.data.object,
      previousAttributes: event.data.previous_attributes ?? null,
    },
    vocabulary,
  );

  return change
    ? { kind: "payment_method_changed", eventId: event.id, change }
    : IGNORED;
}

function readSubscriptionChanged(
  event: PaymentEvent,
  vocabulary: PaymentProviderVocabulary,
): PaymentEventVerdict {
  const routed = readSubscriptionChange(
    {
      type: event.type,
      created: event.created,
      object: event.data.object,
      previousAttributes: event.data.previous_attributes ?? null,
    },
    vocabulary,
  );

  return routed
    ? { kind: "subscription_changed", eventId: event.id, ...routed }
    : IGNORED;
}
