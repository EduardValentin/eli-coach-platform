import {
  CoachingStanding,
  type CoachingStandingSnapshot,
} from "@eli-coach-platform/domain/client";
import { CoachingSubscription } from "@eli-coach-platform/domain/coaching-subscription";
import { desc, eq, sql, type Column, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  clientsTable,
  coachingSubscriptionsTable,
} from "~/features/coaching-sales/data/schema.server";
import {
  toSubscriptionSnapshot,
  type SubscriptionRow,
} from "~/features/coaching-sales/data/subscriptions/subscription-row.server";

type PaidSubscriptions = { paidAt: Column; id: Column };

const CURRENT_SUBSCRIPTIONS = "current_coaching_subscriptions";

const NOT_STARTED: CoachingStandingSnapshot = {
  status: "not-started",
  accessEndsAt: null,
  refundDue: false,
};

const currentSubscriptions = alias(
  coachingSubscriptionsTable,
  CURRENT_SUBSCRIPTIONS,
);

export function mostRecentlyPaidFirst(subscriptions: PaidSubscriptions): SQL[] {
  return [desc(subscriptions.paidAt), desc(subscriptions.id)];
}

const currentSubscriptionIdOfClient = sql<
  string | null
>`(select ${currentSubscriptions.id} from ${coachingSubscriptionsTable} ${sql.identifier(CURRENT_SUBSCRIPTIONS)} where ${eq(currentSubscriptions.clientId, clientsTable.id)} order by ${sql.join(mostRecentlyPaidFirst(currentSubscriptions), sql`, `)} limit 1)`;

export const isCurrentSubscriptionOfClient = eq(
  coachingSubscriptionsTable.id,
  currentSubscriptionIdOfClient,
);

export function coachingStandingOf(
  current: SubscriptionRow | null,
): CoachingStanding {
  return current
    ? CoachingSubscription.reconstitute(
        toSubscriptionSnapshot(current),
      ).standing()
    : CoachingStanding.of(NOT_STARTED);
}
