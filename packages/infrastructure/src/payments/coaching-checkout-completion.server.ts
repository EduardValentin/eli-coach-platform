import {
  findCoachingBundle,
  type PriceTier,
} from "@eli-coach-platform/domain/coaching-bundle";
import {
  COACHING_SUBSCRIPTION_PURPOSE,
  START_CHOICES,
  type CheckoutCompletion,
  type CreateCheckoutSessionCommand,
} from "@eli-coach-platform/domain/coaching-subscription";
import { z } from "zod";

import type { PaidCheckoutSession } from "./checkout-session-completion.server";
import { PAYMENT_PURPOSE_METADATA_KEY } from "./payment-completion-handler.server";

const PRICE_TIERS = [
  "regular",
  "reduced",
] as const satisfies readonly PriceTier[];

const coachingCheckoutMetadataSchema = z
  .object({
    [PAYMENT_PURPOSE_METADATA_KEY]: z.literal(COACHING_SUBSCRIPTION_PURPOSE),
    assessmentCallId: z.uuid(),
    bundleId: z.string(),
    months: z.string(),
    tier: z.enum(PRICE_TIERS),
    startChoice: z.enum(START_CHOICES),
  })
  .transform((metadata, context) => {
    const bundle = findCoachingBundle(metadata.bundleId);

    if (!bundle || String(bundle.months) !== metadata.months) {
      context.addIssue({ code: "custom", message: "Unknown coaching bundle." });
      return z.NEVER;
    }

    return {
      assessmentCallId: metadata.assessmentCallId,
      bundleId: bundle.id,
      tier: metadata.tier,
      startChoice: metadata.startChoice,
    };
  });

export function coachingCheckoutMetadata(
  command: CreateCheckoutSessionCommand,
): Record<string, string> {
  return {
    [PAYMENT_PURPOSE_METADATA_KEY]: command.metadata.purpose,
    assessmentCallId: command.metadata.assessmentCallId,
    bundleId: command.metadata.bundleId,
    months: String(command.bundle.months),
    tier: command.metadata.tier,
    startChoice: command.metadata.startChoice,
  };
}

export function toCheckoutCompletion(
  session: PaidCheckoutSession,
): CheckoutCompletion | null {
  const metadata = coachingCheckoutMetadataSchema.safeParse(session.metadata);

  if (!metadata.success || !session.subscriptionId) {
    return null;
  }

  return {
    checkoutSessionId: session.id,
    paymentCustomerId: session.customerId,
    paymentSubscriptionId: session.subscriptionId,
    amountCents: session.amountCents,
    currency: session.currency,
    customerEmail: session.customerEmail,
    paidAt: session.paidAt,
    ...metadata.data,
  };
}
