import { z } from "zod";

import {
  referencedIdSchema,
  type PaymentProviderVocabulary,
} from "./payment-subscription-change.server";

type PaymentCardChangeKind = NonNullable<
  ReturnType<PaymentProviderVocabulary["cardChangeOf"]>
>;

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

type ProviderPaymentMethodEvent = {
  type: string;
  object: unknown;
  previousAttributes: Record<string, unknown> | null;
};

const CUSTOMER_ATTRIBUTE = "customer";
const MONTHS_PER_YEAR = 12;

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

export function readPaymentCardChange(
  event: ProviderPaymentMethodEvent,
  vocabulary: PaymentProviderVocabulary,
): PaymentCardChange | null {
  const kind = vocabulary.cardChangeOf(event.type);
  const details = readCardDetails(event.object, vocabulary);
  const customerId = ownerOf(event);

  if (!kind || !details || !customerId) {
    return null;
  }

  return { kind, customerId, ...details };
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

function ownerOf(event: ProviderPaymentMethodEvent): string | null {
  const customer = paymentMethodSchema.safeParse(event.object).data?.customer;
  const formerCustomer = referencedIdSchema.safeParse(
    event.previousAttributes?.[CUSTOMER_ATTRIBUTE],
  ).data;

  return customer ?? formerCustomer ?? null;
}
