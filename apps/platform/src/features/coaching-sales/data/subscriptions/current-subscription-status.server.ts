import {
  CoachingSubscription,
  type CoachingSubscriptionStatus,
} from "@eli-coach-platform/domain/coaching-subscription";
import { desc, eq, sql } from "drizzle-orm";

import {
  clientsTable,
  coachingSubscriptionsTable,
} from "~/features/coaching-sales/data/schema.server";

export const currentSubscriptionStatus = sql<CoachingSubscriptionStatus | null>`(
  select ${coachingSubscriptionsTable.status}
  from ${coachingSubscriptionsTable}
  where ${eq(coachingSubscriptionsTable.clientId, clientsTable.id)}
  order by ${desc(coachingSubscriptionsTable.paidAt)}
  limit 1
)`;

export function hasClosedCoaching(
  status: CoachingSubscriptionStatus | null,
): boolean {
  return status ? CoachingSubscription.hasClosedCoaching({ status }) : false;
}
