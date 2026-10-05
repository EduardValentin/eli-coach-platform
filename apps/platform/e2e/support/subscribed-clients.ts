import { randomUUID } from "node:crypto";

import type pg from "pg";

import {
  daysBefore,
  insertPaidClientRecordsWithPayment,
  SEEDED_BUNDLE,
  type PaidClientIdentity,
  type StartChoice,
} from "./paid-clients";
import {
  createHeldStripeSubscription,
  type StripeTestSubscription,
} from "./stripe-subscriptions";
import {
  recordOnboardingSubmitted,
  type SubmittedClient,
} from "./submitted-clients";

export type SubscribedClientSeed = {
  start: StartChoice;
  daysSincePayment: number;
};

export type SubscriptionSeed = SubscribedClientSeed & { runId: string };

export type SubscribedClient = SubmittedClient & {
  subscription: StripeTestSubscription;
};

const INSERT_PAYMENT_CARD = `
  insert into app.payment_cards (
    stripe_customer_id, payment_method_id, brand, last_four,
    expiry_month, expiry_year, updated_at
  ) values ($1, $2, $3, $4, $5, $6, $7)
`;

export async function insertSubscribedClientRecords(
  pool: pg.Pool,
  identity: PaidClientIdentity,
  seed: SubscriptionSeed,
): Promise<SubscribedClient> {
  const assessmentCallId = randomUUID();
  const subscription = await createHeldStripeSubscription(
    { email: identity.email, assessmentCallId, start: seed.start },
    seed.runId,
  );
  const client = await insertPaidClientRecordsWithPayment(pool, identity, {
    assessmentCallId,
    start: seed.start,
    paidAt: daysBefore(new Date(), seed.daysSincePayment),
    references: {
      customerId: subscription.customerId,
      subscriptionId: subscription.subscriptionId,
      paymentIntentId: subscription.paymentIntentId,
      checkoutSessionId: `cs_e2e_${assessmentCallId}`,
    },
  });
  await insertPaymentCard(pool, subscription);
  const submitted = await recordOnboardingSubmitted(pool, identity, client);

  return { ...submitted, subscription };
}

async function insertPaymentCard(
  pool: pg.Pool,
  subscription: StripeTestSubscription,
): Promise<void> {
  const { card } = subscription;

  await pool.query(INSERT_PAYMENT_CARD, [
    subscription.customerId,
    card.paymentMethodId,
    card.brand,
    card.lastFour,
    card.expiryMonth,
    card.expiryYear,
    new Date(),
  ]);
}

export function paidThrough(paidAt: Date): Date {
  const accessEnd = new Date(paidAt.getTime());
  const dayOfMonth = accessEnd.getUTCDate();
  accessEnd.setUTCDate(1);
  accessEnd.setUTCMonth(accessEnd.getUTCMonth() + SEEDED_BUNDLE.months);
  const lastDayOfMonth = new Date(
    Date.UTC(accessEnd.getUTCFullYear(), accessEnd.getUTCMonth() + 1, 0),
  ).getUTCDate();
  accessEnd.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));

  return accessEnd;
}
