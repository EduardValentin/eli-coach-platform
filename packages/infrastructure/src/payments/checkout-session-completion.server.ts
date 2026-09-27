import { z } from "zod";

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

const referencedIdSchema = z.union([
  z.string().min(1),
  z.object({ id: z.string().min(1) }).transform((resource) => resource.id),
]);

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
  amount_total: z.number().int().nonnegative(),
  currency: z.string().min(1),
  customer_details: z.object({ email: z.string().min(1) }),
  metadata: z.record(z.string(), z.string()),
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
    paymentIntentId: paid.payment_intent,
    amountCents: paid.amount_total,
    currency: paid.currency,
    customerEmail: paid.customer_details.email,
    paidAt,
    metadata: paid.metadata,
  };
}
