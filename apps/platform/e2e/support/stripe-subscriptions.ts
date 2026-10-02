import { COACHING_SUBSCRIPTION_PURPOSE } from "@eli-coach-platform/domain/coaching-subscription";
import { PAYMENT_PURPOSE_METADATA_KEY } from "@eli-coach-platform/infrastructure/payments/server";
import type Stripe from "stripe";

import { SEEDED_BUNDLE, SEEDED_TIER, type StartChoice } from "./paid-clients";
import { registerCustomerForCleanup } from "./stripe-cleanup";
import { createStripeTestClient } from "./stripe-environment";

export type HeldSubscriptionSeed = {
  email: string;
  assessmentCallId: string;
  start: StartChoice;
};

export type StripeTestSubscription = {
  customerId: string;
  subscriptionId: string;
  amountCents: number;
  currency: string;
};

export type StripeChange = { requestId: string };

export type StripeRefund = StripeChange & { chargeId: string };

const TEST_CARD_PAYMENT_METHOD = "pm_card_visa";
const COACHING_PRODUCT_ID = "e2e_coaching_subscription";
const RESOURCE_MISSING = "resource_missing";

export async function createHeldStripeSubscription(
  seed: HeldSubscriptionSeed,
  runId: string,
): Promise<StripeTestSubscription> {
  const stripe = createStripeTestClient();
  const customer = await stripe.customers.create({
    email: seed.email,
    metadata: { assessmentCallId: seed.assessmentCallId },
  });
  registerCustomerForCleanup(customer.id, runId);
  await payByDefaultWithTestCard(stripe, customer.id);
  const amountCents = SEEDED_BUNDLE.totalCents(SEEDED_TIER);
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [
      {
        price_data: {
          currency: SEEDED_BUNDLE.currency,
          unit_amount: amountCents,
          product: await coachingProductId(stripe),
          recurring: {
            interval: "month",
            interval_count: SEEDED_BUNDLE.months,
          },
        },
      },
    ],
    metadata: coachingMetadata(seed),
  });
  await stripe.subscriptions.update(subscription.id, {
    pause_collection: { behavior: "void" },
  });

  return {
    customerId: customer.id,
    subscriptionId: subscription.id,
    amountCents,
    currency: SEEDED_BUNDLE.currency,
  };
}

export async function readStripeSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  return createStripeTestClient().subscriptions.retrieve(subscriptionId);
}

export async function readCheckoutSubscription(
  sessionId: string,
): Promise<Stripe.Subscription> {
  const session = await createStripeTestClient().checkout.sessions.retrieve(
    sessionId,
    { expand: ["subscription"] },
  );

  if (!session.subscription || typeof session.subscription === "string") {
    throw new Error(`Checkout Session ${sessionId} carries no subscription.`);
  }

  return session.subscription;
}

export async function refundPartInStripe(
  subscription: StripeTestSubscription,
  amountCents: number,
): Promise<StripeRefund> {
  const stripe = createStripeTestClient();
  const chargeId = await firstChargeId(stripe, subscription);
  const refund = await stripe.refunds.create({
    charge: chargeId,
    amount: amountCents,
  });

  return { chargeId, requestId: refund.lastResponse.requestId };
}

export async function refundRestInStripe(
  subscription: StripeTestSubscription,
): Promise<StripeRefund> {
  const stripe = createStripeTestClient();
  const chargeId = await firstChargeId(stripe, subscription);
  const refund = await stripe.refunds.create({ charge: chargeId });

  return { chargeId, requestId: refund.lastResponse.requestId };
}

export async function cancelInStripe(
  subscription: StripeTestSubscription,
): Promise<StripeChange> {
  const cancelled = await createStripeTestClient().subscriptions.cancel(
    subscription.subscriptionId,
  );

  return { requestId: cancelled.lastResponse.requestId };
}

async function payByDefaultWithTestCard(
  stripe: Stripe,
  customerId: string,
): Promise<void> {
  const paymentMethod = await stripe.paymentMethods.attach(
    TEST_CARD_PAYMENT_METHOD,
    { customer: customerId },
  );
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });
}

async function coachingProductId(stripe: Stripe): Promise<string> {
  try {
    return (await stripe.products.retrieve(COACHING_PRODUCT_ID)).id;
  } catch (error) {
    if ((error as { code?: string }).code !== RESOURCE_MISSING) {
      throw error;
    }

    const product = await stripe.products.create({
      id: COACHING_PRODUCT_ID,
      name: SEEDED_BUNDLE.title,
    });

    return product.id;
  }
}

function coachingMetadata(seed: HeldSubscriptionSeed): Record<string, string> {
  return {
    [PAYMENT_PURPOSE_METADATA_KEY]: COACHING_SUBSCRIPTION_PURPOSE,
    assessmentCallId: seed.assessmentCallId,
    bundleId: SEEDED_BUNDLE.id,
    months: String(SEEDED_BUNDLE.months),
    tier: SEEDED_TIER,
    startChoice: seed.start,
  };
}

async function firstChargeId(
  stripe: Stripe,
  subscription: StripeTestSubscription,
): Promise<string> {
  const charges = await stripe.charges.list({
    customer: subscription.customerId,
  });
  const first = charges.data.at(-1);

  if (!first) {
    throw new Error(`Customer ${subscription.customerId} was never charged.`);
  }

  return first.id;
}
