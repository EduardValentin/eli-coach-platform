import { z } from "zod";

import { referencedIdSchema } from "./payment-provider-vocabulary.server";

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

const MILLISECONDS_PER_SECOND = 1000;
const PAID_INVOICE_PAYMENT = "paid";

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

export function fromUnixSeconds(seconds: number): Date {
  return new Date(seconds * MILLISECONDS_PER_SECOND);
}

export function readPaidCheckoutSession(
  session: unknown,
  paidAt: Date,
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
    paidAt,
    metadata: paid.metadata,
  };
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
