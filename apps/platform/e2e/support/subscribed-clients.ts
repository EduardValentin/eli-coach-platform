import { randomUUID } from "node:crypto";

import type pg from "pg";

import {
  daysBefore,
  insertPaidClientRecordsWithPayment,
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
      checkoutSessionId: `cs_e2e_${assessmentCallId}`,
    },
  });
  const submitted = await recordOnboardingSubmitted(pool, identity, client);

  return { ...submitted, subscription };
}
