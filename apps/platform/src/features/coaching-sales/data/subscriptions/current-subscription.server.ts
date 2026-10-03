import type { CoachingSubscriptionStatus } from "@eli-coach-platform/domain/coaching-subscription";
import { desc, eq, sql, type Column, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  clientsTable,
  coachingSubscriptionsTable,
} from "~/features/coaching-sales/data/schema.server";

type PaidSubscriptions = { paidAt: Column; id: Column };

const CURRENT_SUBSCRIPTIONS = "current_coaching_subscriptions";

const currentSubscriptions = alias(
  coachingSubscriptionsTable,
  CURRENT_SUBSCRIPTIONS,
);

export function mostRecentlyPaidFirst(subscriptions: PaidSubscriptions): SQL[] {
  return [desc(subscriptions.paidAt), desc(subscriptions.id)];
}

export const currentSubscriptionIdOfClient = sql<
  string | null
>`(select ${currentSubscriptions.id} from ${coachingSubscriptionsTable} ${sql.identifier(CURRENT_SUBSCRIPTIONS)} where ${eq(currentSubscriptions.clientId, clientsTable.id)} order by ${sql.join(mostRecentlyPaidFirst(currentSubscriptions), sql`, `)} limit 1)`;

export const currentSubscriptionStatus = sql<CoachingSubscriptionStatus | null>`(select ${coachingSubscriptionsTable.status} from ${coachingSubscriptionsTable} where ${eq(coachingSubscriptionsTable.id, currentSubscriptionIdOfClient)})`;
