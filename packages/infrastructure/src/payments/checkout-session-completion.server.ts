import {
  findCoachingBundle,
  type PriceTier,
} from "@eli-coach-platform/domain/coaching-bundle";
import {
  START_CHOICES,
  type CheckoutCompletion,
} from "@eli-coach-platform/domain/coaching-subscription";
import { z } from "zod";

const MILLISECONDS_PER_SECOND = 1000;
const PRICE_TIERS = [
  "regular",
  "reduced",
] as const satisfies readonly PriceTier[];

const coachingBundleIdSchema = z.string().transform((id, context) => {
  const bundle = findCoachingBundle(id);

  if (!bundle) {
    context.addIssue({ code: "custom", message: "Unknown coaching bundle." });
    return z.NEVER;
  }

  return bundle.id;
});

const referencedIdSchema = z.union([
  z.string().min(1),
  z.object({ id: z.string().min(1) }).transform((resource) => resource.id),
]);

const paidCheckoutSessionSchema = z.object({
  id: z.string().min(1),
  status: z.literal("complete"),
  payment_status: z.literal("paid"),
  customer: referencedIdSchema,
  subscription: referencedIdSchema,
  amount_total: z.number().int().nonnegative(),
  currency: z.string().min(1),
  customer_details: z.object({ email: z.string().min(1) }),
  metadata: z.object({
    assessmentCallId: z.string().min(1),
    bundleId: coachingBundleIdSchema,
    tier: z.enum(PRICE_TIERS),
    startChoice: z.enum(START_CHOICES),
  }),
});

export function fromUnixSeconds(seconds: number): Date {
  return new Date(seconds * MILLISECONDS_PER_SECOND);
}

export function readPaidCheckoutSession(
  session: unknown,
  paidAt: Date,
): CheckoutCompletion | null {
  const parsed = paidCheckoutSessionSchema.safeParse(session);

  if (!parsed.success) {
    return null;
  }

  const paid = parsed.data;

  return {
    checkoutSessionId: paid.id,
    paymentCustomerId: paid.customer,
    paymentSubscriptionId: paid.subscription,
    amountCents: paid.amount_total,
    currency: paid.currency,
    customerEmail: paid.customer_details.email,
    paidAt,
    assessmentCallId: paid.metadata.assessmentCallId,
    bundleId: paid.metadata.bundleId,
    tier: paid.metadata.tier,
    startChoice: paid.metadata.startChoice,
  };
}
